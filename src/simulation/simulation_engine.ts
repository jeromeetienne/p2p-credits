import { Ledger } from '../ledger/ledger.js';
import { TaskPricer } from '../pricing/task_pricer.js';
import { TaskScheduler } from '../scheduler/task_scheduler.js';
import { ValidatorSelector } from '../scheduler/validator_selector.js';
import { TrustScoreBook } from '../trust/trust_score.js';
import type { Account, AccountId } from '../types/account_types.js';
import type { Device } from '../types/device_types.js';
import type { RandomNumberFn } from '../types/random_types.js';
import type { Task, TaskAssignment, TaskResult, TaskTypeName, ValidationStatus } from '../types/task_types.js';
import { DisagreementResolver } from '../validation/disagreement_resolver.js';
import { ResultComparator } from '../validation/result_comparator.js';
import { ValidationSampler } from '../validation/validation_sampler.js';
import { MetricsCollector } from './metrics_collector.js';
import { RandomGenerator } from './random_generator.js';
import { SimulationClock } from './simulation_clock.js';
import type { SimulationParameters, SimulationReport } from './simulation_types.js';
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

	/** Every device of the run. */
	private _devices: Device[] = [];

	/** Every simulated worker of the run. */
	private _workerProfiles: WorkerProfile[] = [];

	/** Every simulated worker of the run, indexed by the identifier of its account. */
	private _workerProfileByAccountId = new Map<AccountId, WorkerProfile>();

	/** The price of every task type. */
	private _taskPricer: TaskPricer;

	/** The trust score of every account. */
	private _trustScoreBook: TrustScoreBook;

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

		this._taskPricer = new TaskPricer({
			taskTypes: simulationParameters.taskTypes,
			referenceTaskCostSeconds: simulationParameters.referenceTaskCostSeconds,
			creditPerReferenceTask: simulationParameters.creditPerReferenceTask,
		});
		this._trustScoreBook = new TrustScoreBook({
			initialTrust: simulationParameters.initialTrust,
			increaseOnConfirmedResult: simulationParameters.trustIncreaseOnConfirmedResult,
			decreaseOnInvalidResult: simulationParameters.trustDecreaseOnInvalidResult,
			minimumTrust: simulationParameters.minimumTrust,
			maximumTrust: simulationParameters.maximumTrust,
		});
		this._validationSampler = new ValidationSampler({
			validationRate: simulationParameters.validationRate,
			randomNumberFn: this._randomNumberFn,
		});
		this._taskScheduler = new TaskScheduler({
			devices: this._devices,
			randomNumberFn: this._randomNumberFn,
		});
		this._validatorSelector = new ValidatorSelector({
			devices: this._devices,
			randomNumberFn: this._randomNumberFn,
		});
		this._taskTypeNames = simulationParameters.taskTypes.map((taskType) => {
			return taskType.taskTypeName;
		});
	}

	/**
	 * Runs the whole simulation, one tick after the other.
	 *
	 * @returns The report of the run.
	 */
	run(): SimulationReport {
		for (let tickIndex = 0; tickIndex < this._parameters.tickCount; tickIndex += 1) {
			for (let taskIndex = 0; taskIndex < this._parameters.tasksPerTick; taskIndex += 1) {
				this._runOneTask();
			}
			this._simulationClock.advance();
		}
		return this._metricsCollector.buildReport(
			this._parameters.tickCount,
			this._ledger,
			this._trustScoreBook,
			this._workerProfiles,
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
			this._workerProfiles.push(workerProfile);
			this._workerProfileByAccountId.set(accountId, workerProfile);
		}
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
		const primaryAssignment = this._taskScheduler.assign(task);
		const primaryResult = this._executeAssignment(task, primaryAssignment, correctResultValue);

		if (this._validationSampler.mustValidate() === false) {
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
		const newTrust = this._trustScoreBook.afterConfirmedResult(taskResult.accountId);
		if (newTrust >= this._parameters.trustedThreshold) {
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
		this._trustScoreBook.afterInvalidResult(taskResult.accountId);
		this._metricsCollector.recordRejectedResult(taskResult.resultValue === correctResultValue);
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
		this._metricsCollector.recordPaidResult(taskResult.resultValue === correctResultValue, price);
	}
}
