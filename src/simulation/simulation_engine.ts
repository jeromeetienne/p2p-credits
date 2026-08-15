import { Ledger } from '../ledger/ledger.js';
import { ReferenceBenchmark } from '../pricing/reference_benchmark.js';
import { TaskPricer } from '../pricing/task_pricer.js';
import { TaskScheduler } from '../scheduler/task_scheduler.js';
import { ValidatorSelector } from '../scheduler/validator_selector.js';
import { SuspensionBook } from '../trust/suspension_book.js';
import { TrustPolicy } from '../trust/trust_policy.js';
import { TrustScoreBook } from '../trust/trust_score.js';
import type { Account, AccountId } from '../types/account_types.js';
import type { Device, DeviceId } from '../types/device_types.js';
import type { RandomNumberFn } from '../types/random_types.js';
import type { Task, TaskAssignment, TaskResult, TaskTypeName, ValidationStatus } from '../types/task_types.js';
import { DisagreementResolver } from '../validation/disagreement_resolver.js';
import { ResultComparator } from '../validation/result_comparator.js';
import { ValidationSampler } from '../validation/validation_sampler.js';
import { MetricsCollector } from './metrics_collector.js';
import { RandomGenerator } from './random_generator.js';
import { SimulationClock } from './simulation_clock.js';
import type {
	DeviceSummary,
	SimulationParameters,
	SimulationReport,
	TaskTypePricingSummary,
} from './simulation_types.js';
import { WorkerBehavior, type WorkerProfile } from './worker_behavior.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SimulationEngine — runs the network over virtual time and measures what happens
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * One run of the simulated network.
 *
 * The engine owns no rule of its own. It composes the price, the trust, the validation, the scheduling, and the
 * ledger of the library, exactly as a real network would, and it counts what happens.
 */
export class SimulationEngine {
	/** Everything the run needs. */
	private _parameters: SimulationParameters;

	/** The seeded source of randomness of the run. */
	private _randomGenerator: RandomGenerator;

	/** The source of randomness as a plain function, given to every policy of the library. */
	private _randomNumberFn: RandomNumberFn;

	/** The virtual clock of the run. */
	private _simulationClock = new SimulationClock();

	/** The append-only ledger of the run. */
	private _ledger = new Ledger();

	/** The counters of the run. */
	private _metricsCollector = new MetricsCollector();

	/** Every account of the run. */
	private _accounts: Account[] = [];

	/** Every device of the run. The scheduler holds this same list, so a device added later is seen at once. */
	private _devices: Device[] = [];

	/** The tick each device joined the network at. */
	private _addedAtTickByDeviceId = new Map<DeviceId, number>();

	/** Every simulated worker of the run. */
	private _workerProfiles: WorkerProfile[] = [];

	/** Every simulated worker of the run, indexed by the identifier of its account. */
	private _workerProfileByAccountId = new Map<AccountId, WorkerProfile>();

	/** The cost of every task type, measured with the noise of the run. */
	private _referenceBenchmark: ReferenceBenchmark;

	/** The price of every task type. */
	private _taskPricer: TaskPricer;

	/** What each task type is paid, compared with what it is worth. */
	private _taskTypePricingSummaries: TaskTypePricingSummary[];

	/** The price every task type would be paid if the benchmark had measured the true cost. */
	private _truePriceByTaskTypeName = new Map<TaskTypeName, number>();

	/** What happens to a trust score after a result was judged. */
	private _trustPolicy: TrustPolicy;

	/** The trust score of every account and of every device. */
	private _trustScoreBook: TrustScoreBook;

	/** The accounts that receive no task for a while. */
	private _suspensionBook = new SuspensionBook();

	/** The choice of the tasks that are duplicated. */
	private _validationSampler: ValidationSampler;

	/** The assignment of tasks to devices. */
	private _taskScheduler: TaskScheduler;

	/** The choice of the worker that executes a duplicated copy. */
	private _validatorSelector: ValidatorSelector;

	/** The name of every task type the network knows. */
	private _taskTypeNames: TaskTypeName[];

	/** Number given to the next task, used to build the identifier of that task. */
	private _nextTaskNumber = 1;

	/**
	 * @param simulationParameters Everything the run needs.
	 */
	constructor(simulationParameters: SimulationParameters) {
		this._parameters = simulationParameters;
		this._randomGenerator = new RandomGenerator(simulationParameters.randomSeed);
		this._randomNumberFn = this._randomGenerator.asRandomNumberFn();

		this._createWorkers();

		this._referenceBenchmark = this._measureReferenceBenchmark();
		this._taskPricer = TaskPricer.fromReferenceBenchmark(
			this._referenceBenchmark,
			simulationParameters.creditPerReferenceTask,
			simulationParameters.benchmarkEnvironment,
		);
		this._taskTypePricingSummaries = this._buildTaskTypePricingSummaries();
		for (const taskTypePricingSummary of this._taskTypePricingSummaries) {
			this._truePriceByTaskTypeName.set(
				taskTypePricingSummary.taskTypeName,
				taskTypePricingSummary.truePrice,
			);
		}
		this._trustPolicy = new TrustPolicy({
			initialTrust: simulationParameters.initialTrust,
			increaseOnConfirmedResult: simulationParameters.trustIncreaseOnConfirmedResult,
			decreaseOnInvalidResult: simulationParameters.trustDecreaseOnInvalidResult,
			strongPenaltyFactor: simulationParameters.strongPenaltyFactor,
			penaltyPolicyName: simulationParameters.penaltyPolicyName,
			suspensionTickCount: simulationParameters.suspensionTickCount,
			minimumTrust: simulationParameters.minimumTrust,
			maximumTrust: simulationParameters.maximumTrust,
		});
		this._trustScoreBook = new TrustScoreBook({
			trustPolicy: this._trustPolicy,
			deviceTrustWeight: simulationParameters.deviceTrustWeight,
		});
		this._validationSampler = new ValidationSampler({
			untrustedValidationRate: simulationParameters.untrustedValidationRate,
			trustedValidationRate: simulationParameters.trustedValidationRate,
			recentErrorValidationRate: simulationParameters.recentErrorValidationRate,
			untrustedThreshold: simulationParameters.untrustedThreshold,
			trustedThreshold: simulationParameters.trustedThreshold,
			randomNumberFn: this._randomNumberFn,
		});

		const isDeviceEligibleFn = (device: Device): boolean => {
			return this._suspensionBook.isSuspended(device.accountId, this._simulationClock.currentTick()) === false;
		};
		this._taskScheduler = new TaskScheduler({
			devices: this._devices,
			randomNumberFn: this._randomNumberFn,
			isDeviceEligibleFn: isDeviceEligibleFn,
		});
		this._validatorSelector = new ValidatorSelector({
			devices: this._devices,
			randomNumberFn: this._randomNumberFn,
			isDeviceEligibleFn: isDeviceEligibleFn,
		});
		this._taskTypeNames = simulationParameters.taskCosts.map((trueTaskCost) => {
			return trueTaskCost.taskTypeName;
		});
	}

	/**
	 * Runs the whole simulation, one tick after the other.
	 *
	 * @returns The report of the run.
	 */
	run(): SimulationReport {
		for (let tickIndex = 0; tickIndex < this._parameters.tickCount; tickIndex += 1) {
			if (this._parameters.secondDeviceTick === tickIndex) {
				this._addSecondDeviceToEveryWorker();
			}
			for (let taskIndex = 0; taskIndex < this._parameters.tasksPerTick; taskIndex += 1) {
				this._runOneTask();
			}
			this._simulationClock.advance();
		}
		return this._metricsCollector.buildReport(
			this._parameters.tickCount,
			this._ledger,
			this._trustScoreBook,
			this._suspensionBook,
			this._workerProfiles,
			this._taskTypePricingSummaries,
			this._buildDeviceSummaries(),
		);
	}

	/**
	 * Returns the ledger of the run, so that the movements can be read after the run.
	 *
	 * @returns The ledger of the run.
	 */
	ledger(): Ledger {
		return this._ledger;
	}

	/**
	 * Returns the benchmark measured for the run, so that the measured costs can be read after the run.
	 *
	 * @returns The reference benchmark of the run.
	 */
	referenceBenchmark(): ReferenceBenchmark {
		return this._referenceBenchmark;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Measuring the price
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Measures every task type on the reference machine, several times, with the measurement noise of the run.
	 *
	 * The noise is what makes the price imperfect. A real benchmark never measures the true cost, and section 10 of
	 * the design note asks what a network does when its prices are wrong by a few percent.
	 *
	 * @returns The measured benchmark.
	 */
	private _measureReferenceBenchmark(): ReferenceBenchmark {
		const referenceBenchmark = new ReferenceBenchmark({
			environment: this._parameters.benchmarkEnvironment,
			referenceTaskTypeName: this._parameters.referenceTaskTypeName,
			minimumRunCount: this._parameters.benchmarkRunCount,
		});

		for (const trueTaskCost of this._parameters.taskCosts) {
			for (let runIndex = 0; runIndex < this._parameters.benchmarkRunCount; runIndex += 1) {
				const errorRatio = (this._randomNumberFn() * 2 - 1) * this._parameters.pricingErrorRatio;
				referenceBenchmark.recordRun({
					taskTypeName: trueTaskCost.taskTypeName,
					referenceMachineName: 'reference machine',
					durationSeconds: trueTaskCost.trueCostSeconds * (1 + errorRatio),
				});
			}
		}

		return referenceBenchmark;
	}

	/**
	 * Compares what every task type is paid with what it is worth.
	 *
	 * @returns One summary per task type.
	 * @throws When the reference task type has no true cost.
	 */
	private _buildTaskTypePricingSummaries(): TaskTypePricingSummary[] {
		const trueReferenceTaskCost = this._parameters.taskCosts.find((trueTaskCost) => {
			return trueTaskCost.taskTypeName === this._parameters.referenceTaskTypeName;
		});
		if (trueReferenceTaskCost === undefined) {
			throw new Error(
				`the reference task type "${this._parameters.referenceTaskTypeName}" has no true cost`,
			);
		}

		return this._parameters.taskCosts.map((trueTaskCost) => {
			const normalizedTrueCost = trueTaskCost.trueCostSeconds / trueReferenceTaskCost.trueCostSeconds;
			const truePrice = normalizedTrueCost * this._parameters.creditPerReferenceTask;
			const price = this._taskPricer.priceOf(trueTaskCost.taskTypeName);
			return {
				taskTypeName: trueTaskCost.taskTypeName,
				trueCostSeconds: trueTaskCost.trueCostSeconds,
				measuredCostSeconds: this._referenceBenchmark.measuredCostSecondsOf(trueTaskCost.taskTypeName),
				price: price,
				truePrice: truePrice,
				profitabilityRatio: price / truePrice,
			};
		});
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Building the participants
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Creates one account and one device for every worker of the run.
	 *
	 * @returns Nothing.
	 */
	private _createWorkers(): void {
		this._createWorkerGroup('honest', this._parameters.honestWorkerCount, 0);
		this._createWorkerGroup(
			'unstable',
			this._parameters.unstableWorkerCount,
			this._parameters.unstableErrorProbability,
		);
		this._createWorkerGroup('malicious', this._parameters.maliciousWorkerCount, 0);
	}

	/**
	 * Creates the workers of one behaviour.
	 *
	 * @param behaviorName The behaviour shared by the created workers.
	 * @param workerCount Number of workers to create.
	 * @param errorProbability Likelihood that one of these workers returns a wrong value without trying to cheat.
	 * @returns Nothing.
	 */
	private _createWorkerGroup(
		behaviorName: WorkerProfile['behaviorName'],
		workerCount: number,
		errorProbability: number,
	): void {
		const hardwareProfiles = [
			{
				hardwareProfileName: 'slow machine',
				speedFactor: 0.5,
			},
			{
				hardwareProfileName: 'reference machine',
				speedFactor: 1,
			},
			{
				hardwareProfileName: 'fast machine',
				speedFactor: 4,
			},
		];

		for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
			const accountId = `${behaviorName}-account-${workerIndex + 1}`;
			const deviceId = `${behaviorName}-device-${workerIndex + 1}`;
			const hardwareProfile = this._randomGenerator.pick(hardwareProfiles);

			const account: Account = {
				accountId: accountId,
				createdAtTick: 0,
				identityProofName: 'none',
			};
			const device: Device = {
				deviceId: deviceId,
				accountId: accountId,
				hardwareProfileName: hardwareProfile.hardwareProfileName,
				speedFactor: hardwareProfile.speedFactor,
			};
			const workerProfile: WorkerProfile = {
				accountId: accountId,
				deviceId: deviceId,
				behaviorName: behaviorName,
				errorProbability: errorProbability,
			};

			this._accounts.push(account);
			this._devices.push(device);
			this._addedAtTickByDeviceId.set(deviceId, 0);
			this._workerProfiles.push(workerProfile);
			this._workerProfileByAccountId.set(accountId, workerProfile);
		}
	}

	/**
	 * Gives every worker a second device, which has earned nothing and whose account has a history.
	 *
	 * This is the moment the question of section 12.3 of the design note stops being theoretical: an account that was
	 * confirmed hundreds of times meets a device the network has never seen, and so does an account that was caught.
	 *
	 * @returns Nothing.
	 */
	private _addSecondDeviceToEveryWorker(): void {
		const tick = this._simulationClock.currentTick();
		const existingWorkerProfiles = [...this._workerProfiles];

		for (const workerProfile of existingWorkerProfiles) {
			const deviceId = `${workerProfile.deviceId}-added-at-tick-${tick}`;
			this._devices.push({
				deviceId: deviceId,
				accountId: workerProfile.accountId,
				hardwareProfileName: 'unknown machine',
				speedFactor: 1,
			});
			this._addedAtTickByDeviceId.set(deviceId, tick);
		}
	}

	/**
	 * Reads the trust every device ended the run with.
	 *
	 * @returns One summary per device.
	 * @throws When a device belongs to an account that has no simulated worker.
	 */
	private _buildDeviceSummaries(): DeviceSummary[] {
		return this._devices.map((device) => {
			const workerProfile = this._workerProfileByAccountId.get(device.accountId);
			if (workerProfile === undefined) {
				throw new Error(`the account "${device.accountId}" has no simulated worker`);
			}
			return {
				deviceId: device.deviceId,
				accountId: device.accountId,
				behaviorName: workerProfile.behaviorName,
				deviceTrust: this._trustScoreBook.deviceTrustOf(device.deviceId),
				accountTrust: this._trustScoreBook.accountTrustOf(device.accountId),
				combinedTrust: this._trustScoreBook.trustOf(device.accountId, device.deviceId),
				addedAtTick: this._addedAtTickByDeviceId.get(device.deviceId) ?? 0,
			};
		});
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Running one task
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Submits one task, executes it, validates it when it is sampled, and pays for it.
	 *
	 * @returns Nothing.
	 */
	private _runOneTask(): void {
		const tick = this._simulationClock.currentTick();
		const requesterAccount = this._randomGenerator.pick(this._accounts);
		const taskTypeName = this._randomGenerator.pick(this._taskTypeNames);
		const task: Task = {
			taskId: `task-${this._nextTaskNumber}`,
			taskTypeName: taskTypeName,
			requesterAccountId: requesterAccount.accountId,
			createdAtTick: tick,
		};
		this._nextTaskNumber += 1;

		const primaryAssignment = this._taskScheduler.assign(task);
		if (primaryAssignment === undefined) {
			this._metricsCollector.recordUnassignedTask();
			return;
		}

		const price = this._taskPricer.priceOf(taskTypeName);
		this._ledger.append({
			tick: tick,
			accountId: requesterAccount.accountId,
			taskId: task.taskId,
			entryType: 'debit',
			amount: price,
			reason: 'the account requested a task',
			validationStatus: 'unverified',
		});
		this._metricsCollector.recordTaskSubmitted();

		const correctResultValue = `correct-value-of-${task.taskId}`;
		const primaryResult = this._executeAssignment(task, primaryAssignment, correctResultValue);

		const workerTrust = this._trustScoreBook.trustOf(primaryAssignment.accountId, primaryAssignment.deviceId);
		const hasRecentError = this._hasRecentError(primaryAssignment.accountId, tick);
		if (this._validationSampler.mustValidate(workerTrust, hasRecentError) === false) {
			this._payWorker(task, primaryResult, price, 'unverified', correctResultValue);
			return;
		}

		const validatorAssignment = this._validatorSelector.chooseValidator(task, [primaryResult.accountId]);
		if (validatorAssignment === undefined) {
			this._payWorker(task, primaryResult, price, 'unverified', correctResultValue);
			return;
		}

		const validatorResult = this._executeAssignment(task, validatorAssignment, correctResultValue);
		const comparisonOutcome = ResultComparator.compare(primaryResult.resultValue, validatorResult.resultValue);
		if (comparisonOutcome === 'agreement') {
			this._acceptResult(task, primaryResult, price, correctResultValue);
			this._acceptResult(task, validatorResult, price, correctResultValue);
			return;
		}

		this._resolveDisagreement(task, [primaryResult, validatorResult], price, correctResultValue);
	}

	/**
	 * Asks a third worker and pays the majority, because two workers that disagree do not say who is wrong.
	 *
	 * @param task The task the workers disagree about.
	 * @param taskResults The results returned so far for this task.
	 * @param price The price of the task, in credits.
	 * @param correctResultValue The value a correct execution of the task returns, known only to the simulation.
	 * @returns Nothing.
	 */
	private _resolveDisagreement(
		task: Task,
		taskResults: TaskResult[],
		price: number,
		correctResultValue: string,
	): void {
		const excludedAccountIds = taskResults.map((taskResult) => {
			return taskResult.accountId;
		});
		const thirdAssignment = this._validatorSelector.chooseValidator(task, excludedAccountIds);

		const allResults = [...taskResults];
		if (thirdAssignment !== undefined) {
			allResults.push(this._executeAssignment(task, thirdAssignment, correctResultValue));
		}

		const majorityOutcome = DisagreementResolver.resolveByMajority(allResults);
		if (majorityOutcome.majorityResultValue === undefined) {
			this._metricsCollector.recordUnresolvedTask();
			return;
		}

		for (const taskResult of allResults) {
			if (majorityOutcome.agreeingAccountIds.includes(taskResult.accountId) === true) {
				this._acceptResult(task, taskResult, price, correctResultValue);
			} else {
				this._rejectResult(taskResult, correctResultValue);
			}
		}
	}

	/**
	 * Makes one worker execute one assignment and returns the value it produced.
	 *
	 * @param task The task to execute.
	 * @param taskAssignment The assignment of the task to a device.
	 * @param correctResultValue The value a correct execution of the task returns, known only to the simulation.
	 * @returns The result returned by the worker.
	 * @throws When the assigned account has no simulated worker.
	 */
	private _executeAssignment(
		task: Task,
		taskAssignment: TaskAssignment,
		correctResultValue: string,
	): TaskResult {
		const workerProfile = this._workerProfileByAccountId.get(taskAssignment.accountId);
		if (workerProfile === undefined) {
			throw new Error(`the account "${taskAssignment.accountId}" has no simulated worker`);
		}
		const resultValue = WorkerBehavior.produceResultValue(
			workerProfile,
			correctResultValue,
			this._randomNumberFn,
		);
		const taskResult: TaskResult = {
			taskId: task.taskId,
			accountId: taskAssignment.accountId,
			deviceId: taskAssignment.deviceId,
			resultValue: resultValue,
			completedAtTick: this._simulationClock.currentTick(),
		};
		this._metricsCollector.recordExecution(
			taskAssignment.isValidationCopy,
			resultValue === correctResultValue,
		);
		return taskResult;
	}

	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////
	//	Paying and judging a result
	///////////////////////////////////////////////////////////////////////////////
	///////////////////////////////////////////////////////////////////////////////

	/**
	 * Confirms one result: the worker gains trust and is paid.
	 *
	 * @param task The executed task.
	 * @param taskResult The confirmed result.
	 * @param price The price of the task, in credits.
	 * @param correctResultValue The value a correct execution of the task returns, known only to the simulation.
	 * @returns Nothing.
	 */
	private _acceptResult(task: Task, taskResult: TaskResult, price: number, correctResultValue: string): void {
		const trustChange = this._trustScoreBook.afterConfirmedResult(taskResult.accountId, taskResult.deviceId);
		if (trustChange.newCombinedTrust >= this._parameters.trustedThreshold) {
			this._metricsCollector.recordTrustedAtTick(taskResult.accountId, this._simulationClock.currentTick());
		}
		this._payWorker(task, taskResult, price, 'accepted', correctResultValue);
	}

	/**
	 * Contradicts one result: the worker loses trust and is paid nothing.
	 *
	 * @param taskResult The contradicted result.
	 * @param correctResultValue The value a correct execution of the task returns, known only to the simulation.
	 * @returns Nothing.
	 */
	private _rejectResult(taskResult: TaskResult, correctResultValue: string): void {
		const tick = this._simulationClock.currentTick();
		const trustChange = this._trustScoreBook.afterInvalidResult(
			taskResult.accountId,
			taskResult.deviceId,
			tick,
		);
		if (trustChange.suspensionTickCount > 0) {
			this._suspensionBook.suspend(taskResult.accountId, tick + trustChange.suspensionTickCount);
		}
		if (trustChange.confiscatesUnverifiedCredits === true) {
			this._confiscateUnverifiedCredits(taskResult);
		}
		this._metricsCollector.recordRejectedResult(taskResult.resultValue === correctResultValue);
	}

	/**
	 * Takes back the credits an account was paid for results nobody ever verified.
	 *
	 * @param taskResult The contradicted result that caused the penalty.
	 * @returns Nothing.
	 */
	private _confiscateUnverifiedCredits(taskResult: TaskResult): void {
		const unverifiedTotal = this._ledger.unverifiedCreditTotalOf(taskResult.accountId);
		const alreadyTakenBack = -this._ledger.adjustmentTotalOf(taskResult.accountId);
		const amountToTakeBack = unverifiedTotal - alreadyTakenBack;
		if (amountToTakeBack <= 0) {
			return;
		}
		this._ledger.append({
			tick: this._simulationClock.currentTick(),
			accountId: taskResult.accountId,
			taskId: taskResult.taskId,
			entryType: 'adjustment',
			amount: -amountToTakeBack,
			reason: 'the account returned a wrong result, so the credits paid for its unverified results were taken back',
			validationStatus: 'rejected',
		});
		this._metricsCollector.recordConfiscation(amountToTakeBack);
	}

	/**
	 * Says whether an account returned an invalid result recently enough to stay under close verification.
	 *
	 * @param accountId Identifier of the account.
	 * @param tick The current tick.
	 * @returns True when the last invalid result of the account is still recent.
	 */
	private _hasRecentError(accountId: AccountId, tick: number): boolean {
		const lastInvalidResultTick = this._trustScoreBook.lastInvalidResultTickOf(accountId);
		if (lastInvalidResultTick === undefined) {
			return false;
		}
		return tick - lastInvalidResultTick < this._parameters.recentErrorTickCount;
	}

	/**
	 * Records the payment of one worker in the ledger.
	 *
	 * @param task The executed task.
	 * @param taskResult The paid result.
	 * @param price The price of the task, in credits.
	 * @param validationStatus The validation status of the paid result.
	 * @param correctResultValue The value a correct execution of the task returns, known only to the simulation.
	 * @returns Nothing.
	 * @throws When the type of the task has no true price.
	 */
	private _payWorker(
		task: Task,
		taskResult: TaskResult,
		price: number,
		validationStatus: ValidationStatus,
		correctResultValue: string,
	): void {
		this._ledger.append({
			tick: this._simulationClock.currentTick(),
			accountId: taskResult.accountId,
			taskId: task.taskId,
			entryType: 'credit',
			amount: price,
			reason: 'the account executed a task',
			validationStatus: validationStatus,
		});
		const truePrice = this._truePriceByTaskTypeName.get(task.taskTypeName);
		if (truePrice === undefined) {
			throw new Error(`the task type "${task.taskTypeName}" has no true price`);
		}
		this._metricsCollector.recordPaidResult(
			taskResult.resultValue === correctResultValue,
			price,
			truePrice,
		);
	}
}
