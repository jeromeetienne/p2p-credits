import { AccountRegistry } from '../identity/account_registry.js';
import { SpendingPolicy } from '../identity/spending_policy.js';
import { DeferredPaymentBook } from '../ledger/deferred_payment_book.js';
import { Ledger } from '../ledger/ledger.js';
import { SettlementPolicy } from '../ledger/settlement_policy.js';
import { ReferenceBenchmark } from '../pricing/reference_benchmark.js';
import { TaskPricer } from '../pricing/task_pricer.js';
import { TaskScheduler } from '../scheduler/task_scheduler.js';
import { ValidatorSelector } from '../scheduler/validator_selector.js';
import { SuspensionBook } from '../trust/suspension_book.js';
import { TrustPolicy } from '../trust/trust_policy.js';
import { TrustScoreBook } from '../trust/trust_score.js';
import type { Account, AccountId } from '../types/account_types.js';
import type { Device, DeviceId } from '../types/device_types.js';
import type { LedgerEntryDraft } from '../types/ledger_types.js';
import type { RandomNumberFn } from '../types/random_types.js';
import type { Task, TaskAssignment, TaskResult, TaskTypeName, ValidationStatus } from '../types/task_types.js';
import { DisagreementResolver, type MajorityOutcome } from '../validation/disagreement_resolver.js';
import { ResultComparator, type ComparisonStrategy } from '../validation/result_comparator.js';
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
 * Smallest share of the true cost of a task type a measurement is allowed to return.
 *
 * A pricing error at or above 1 would otherwise let one measured duration reach zero or fall below it, and a price
 * read from such a duration would be zero or negative: a worker would be paid nothing for its work, or the account
 * that requested a task would be paid for asking.
 */
const SMALLEST_MEASURED_SHARE = 0.01;

/** One result returned during a run, and whether the worker really did the work it was paid for. */
type SimulatedResult = {
	/** The result the network sees. */
	taskResult: TaskResult;
	/** True when the worker performed the computation. Only the simulation ever knows this. */
	isGenuine: boolean;
};

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

	/** When a payment is recorded and when it can be spent. */
	private _settlementPolicy: SettlementPolicy;

	/** The payments that are not recorded yet. */
	private _deferredPaymentBook = new DeferredPaymentBook();

	/** How far an account may go before it has to contribute. */
	private _spendingPolicy: SpendingPolicy;

	/** The accounts of the run, and what opening them cost. */
	private _accountRegistry: AccountRegistry;

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

	/** The comparison that says whether two results say the same thing. */
	private _resultComparator: ResultComparator;

	/** The assignment of tasks to devices. */
	private _taskScheduler: TaskScheduler;

	/** The choice of the worker that executes a duplicated copy. */
	private _validatorSelector: ValidatorSelector;

	/** The name of every task type the network knows. */
	private _taskTypeNames: TaskTypeName[];

	/** Number given to the next task, used to build the identifier of that task. */
	private _nextTaskNumber = 1;

	/** The accounts a Sybil attacker abandoned, which receive no further task and request none. */
	private _abandonedAccountIds = new Set<AccountId>();

	/** Every account a Sybil attacker ever held, used to measure what the attack earned. */
	private _sybilAccountIds: AccountId[] = [];

	/** Number given to the next account a Sybil attacker opens. */
	private _nextSybilAccountNumber = 0;

	/**
	 * @param simulationParameters Everything the run needs.
	 */
	constructor(simulationParameters: SimulationParameters) {
		this._parameters = simulationParameters;
		this._randomGenerator = new RandomGenerator(simulationParameters.randomSeed);
		this._randomNumberFn = this._randomGenerator.asRandomNumberFn();

		this._settlementPolicy = new SettlementPolicy({
			policyName: simulationParameters.settlementPolicyName,
			provisionalTickCount: simulationParameters.provisionalTickCount,
			settlementPeriodTickCount: simulationParameters.settlementPeriodTickCount,
		});
		this._spendingPolicy = new SpendingPolicy({
			allowedInitialDeficit: simulationParameters.allowedInitialDeficit,
			allowedDeficitAfterContribution: simulationParameters.allowedDeficitAfterContribution,
			requiredContribution: simulationParameters.requiredContribution,
		});
		this._accountRegistry = new AccountRegistry({
			identityCost: simulationParameters.identityCost,
			identityProofName: simulationParameters.identityProofName,
		});

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

		const strategyByTaskTypeName = new Map<TaskTypeName, ComparisonStrategy>();
		for (const taskTypeStrategy of simulationParameters.taskTypeComparisonStrategies) {
			strategyByTaskTypeName.set(taskTypeStrategy.taskTypeName, taskTypeStrategy.comparisonStrategy);
		}
		this._resultComparator = new ResultComparator({
			defaultStrategy: simulationParameters.defaultComparisonStrategy,
			strategyByTaskTypeName: strategyByTaskTypeName,
		});

		const isDeviceEligibleFn = (device: Device): boolean => {
			if (this._abandonedAccountIds.has(device.accountId) === true) {
				return false;
			}
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
			workerTrustFn: (accountId, deviceId) => {
				return this._trustScoreBook.trustOf(accountId, deviceId);
			},
			trustedArbiterShare: simulationParameters.trustedArbiterShare,
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
			this._recordDuePayments();
			this._replaceAbandonedSybilAccounts();
			for (let taskIndex = 0; taskIndex < this._parameters.tasksPerTick; taskIndex += 1) {
				this._runOneTask();
			}
			this._simulationClock.advance();
		}
		return this._metricsCollector.buildReport({
			tickCount: this._parameters.tickCount,
			ledger: this._ledger,
			trustScoreBook: this._trustScoreBook,
			suspensionBook: this._suspensionBook,
			accountRegistry: this._accountRegistry,
			deferredPaymentBook: this._deferredPaymentBook,
			workerProfiles: this._workerProfiles,
			taskTypePricingSummaries: this._taskTypePricingSummaries,
			deviceSummaries: this._buildDeviceSummaries(),
			sybilAttackerProfit: this._sybilAttackerProfit(),
		});
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
				const measuredCostSeconds = Math.max(
					trueTaskCost.trueCostSeconds * (1 + errorRatio),
					trueTaskCost.trueCostSeconds * SMALLEST_MEASURED_SHARE,
				);
				referenceBenchmark.recordRun({
					taskTypeName: trueTaskCost.taskTypeName,
					referenceMachineName: 'reference machine',
					durationSeconds: measuredCostSeconds,
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
		this._createWorkerGroup('sybil attacker', this._parameters.sybilAttackerCount, 0);
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

			const account = this._accountRegistry.createAccount(accountId, 0);
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

			if (behaviorName === 'sybil attacker') {
				this._sybilAccountIds.push(accountId);
				this._nextSybilAccountNumber = workerIndex + 1;
			}
		}
	}

	/**
	 * Records the payments a settlement policy held back until now.
	 *
	 * @returns Nothing.
	 */
	private _recordDuePayments(): void {
		const dueDrafts = this._deferredPaymentBook.releaseDue(this._simulationClock.currentTick());
		for (const ledgerEntryDraft of dueDrafts) {
			this._ledger.append(ledgerEntryDraft);
		}
	}

	/**
	 * Lets every Sybil attacker whose account is no longer worth anything abandon it and open a fresh one.
	 *
	 * The abandoned account keeps its balance and its history, and receives no further task. What the attacker gains
	 * by starting again is a trust score of a newcomer; what it loses is the price of one more identity.
	 *
	 * Nothing is abandoned when a newcomer starts at or below the trust the attacker abandons an account at, because
	 * the replacement would then be worth no more than the account it replaces. Without that condition, every attacker
	 * would open one account per tick for the whole run and never execute anything.
	 *
	 * @returns Nothing.
	 */
	private _replaceAbandonedSybilAccounts(): void {
		if (this._trustPolicy.initialTrust() <= this._parameters.sybilAbandonTrust) {
			return;
		}
		const tick = this._simulationClock.currentTick();

		for (let workerIndex = 0; workerIndex < this._workerProfiles.length; workerIndex += 1) {
			const workerProfile = this._workerProfiles[workerIndex];
			if (workerProfile === undefined || workerProfile.behaviorName !== 'sybil attacker') {
				continue;
			}
			if (this._trustScoreBook.accountTrustOf(workerProfile.accountId) > this._parameters.sybilAbandonTrust) {
				continue;
			}

			this._abandonedAccountIds.add(workerProfile.accountId);
			this._metricsCollector.recordAbandonedAccount();

			this._nextSybilAccountNumber += 1;
			const accountId = `sybil attacker-account-${this._nextSybilAccountNumber}`;
			const deviceId = `sybil attacker-device-${this._nextSybilAccountNumber}`;
			this._accountRegistry.createAccount(accountId, tick);
			this._sybilAccountIds.push(accountId);

			this._accounts.push({
				accountId: accountId,
				createdAtTick: tick,
				identityProofName: this._parameters.identityProofName,
			});
			this._devices.push({
				deviceId: deviceId,
				accountId: accountId,
				hardwareProfileName: 'unknown machine',
				speedFactor: 1,
			});
			this._addedAtTickByDeviceId.set(deviceId, tick);

			const freshProfile: WorkerProfile = {
				accountId: accountId,
				deviceId: deviceId,
				behaviorName: 'sybil attacker',
				errorProbability: workerProfile.errorProbability,
			};
			this._workerProfiles[workerIndex] = freshProfile;
			this._workerProfileByAccountId.set(accountId, freshProfile);
		}
	}

	/**
	 * Adds up everything every Sybil attacker took out of the network, and takes off what opening its accounts cost.
	 *
	 * What the attacker took out is the work the network executed for it, plus whatever credits its accounts still
	 * hold and could still spend. The work it had executed counts whether or not the account ever paid for it: an
	 * account abandoned while it owes credits never pays that debt, and the network carries it.
	 *
	 * @returns The profit of the attack, in credits. A number at or below zero means it did not pay for itself.
	 */
	private _sybilAttackerProfit(): number {
		let takenOut = 0;
		for (const accountId of this._sybilAccountIds) {
			takenOut += this._ledger.consumedTotalOf(accountId);
			takenOut += Math.max(0, this._ledger.balanceOf(accountId));
		}
		return takenOut - this._sybilAccountIds.length * this._accountRegistry.identityCost();
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
		const requesterAccount = this._randomGenerator.pick(this._requesterAccounts());
		const taskTypeName = this._randomGenerator.pick(this._taskTypeNames);
		const task: Task = {
			taskId: `task-${this._nextTaskNumber}`,
			taskTypeName: taskTypeName,
			requesterAccountId: requesterAccount.accountId,
			createdAtTick: tick,
		};
		this._nextTaskNumber += 1;

		const price = this._taskPricer.priceOf(taskTypeName);
		const spendableBalance = this._ledger.spendableBalanceOf(requesterAccount.accountId, tick);
		const earnedTotal = this._ledger.earnedTotalOf(requesterAccount.accountId);
		if (this._spendingPolicy.mayConsume(spendableBalance, earnedTotal, price) === false) {
			const requesterProfile = this._workerProfileByAccountId.get(requesterAccount.accountId);
			if (requesterProfile === undefined) {
				throw new Error(`the account "${requesterAccount.accountId}" has no simulated worker`);
			}
			this._metricsCollector.recordRefusedTask(requesterProfile.behaviorName);
			return;
		}

		const primaryAssignment = this._taskScheduler.assign(task);
		if (primaryAssignment === undefined) {
			this._metricsCollector.recordUnassignedTask();
			return;
		}

		this._ledger.append({
			tick: tick,
			accountId: requesterAccount.accountId,
			taskId: task.taskId,
			entryType: 'debit',
			amount: price,
			spendableFromTick: tick,
			reason: 'the account requested a task',
			validationStatus: 'unverified',
		});
		this._metricsCollector.recordTaskSubmitted();

		const trueVector = this._trueVectorOf(task);
		const primaryResult = this._executeAssignment(task, primaryAssignment, trueVector);

		const workerTrust = this._trustScoreBook.trustOf(primaryAssignment.accountId, primaryAssignment.deviceId);
		const hasRecentError = this._hasRecentError(primaryAssignment.accountId, tick);
		if (this._validationSampler.mustValidate(workerTrust, hasRecentError) === false) {
			this._payWorker(task, primaryResult, price, 'unverified');
			return;
		}

		const validatorAssignment = this._validatorSelector.chooseValidator(
			task,
			[primaryResult.taskResult.accountId],
		);
		if (validatorAssignment === undefined) {
			this._payWorker(task, primaryResult, price, 'unverified');
			return;
		}

		const validatorResult = this._executeAssignment(task, validatorAssignment, trueVector);
		const comparisonOutcome = this._resultComparator.compare(
			task.taskTypeName,
			primaryResult.taskResult.resultValue,
			validatorResult.taskResult.resultValue,
		);
		this._metricsCollector.recordComparison(
			task.taskTypeName,
			this._resultComparator.strategyFor(task.taskTypeName).strategyName,
			comparisonOutcome === 'agreement',
		);
		if (comparisonOutcome === 'agreement') {
			this._acceptResult(task, primaryResult, price);
			this._acceptResult(task, validatorResult, price);
			return;
		}

		this._resolveDisagreement(task, [primaryResult, validatorResult], price, trueVector);
	}

	/**
	 * Returns the accounts that still ask the network for work.
	 *
	 * @returns Every account except the ones a Sybil attacker abandoned.
	 */
	private _requesterAccounts(): Account[] {
		return this._accounts.filter((account) => {
			return this._abandonedAccountIds.has(account.accountId) === false;
		});
	}

	/**
	 * Returns the vector a perfect execution of one task would produce.
	 *
	 * The vector is read from the identifier of the task, so that every worker given that task works on the same
	 * numbers, and so that a run stays reproducible.
	 *
	 * @param task The task to compute the true vector of.
	 * @returns The vector a perfect execution returns.
	 */
	private _trueVectorOf(task: Task): number[] {
		const taskNumber = Number(task.taskId.replace('task-', ''));
		const trueVector: number[] = [];
		for (let index = 0; index < this._parameters.resultVectorLength; index += 1) {
			trueVector.push(1 + ((taskNumber * 7 + index * 13) % 100) / 10);
		}
		return trueVector;
	}

	/**
	 * Asks a third worker and pays the majority, because two workers that disagree do not say who is wrong.
	 *
	 * @param task The task the workers disagree about.
	 * @param simulatedResults The results returned so far for this task.
	 * @param price The price of the task, in credits.
	 * @param trueVector The vector a perfect execution of the task returns, known only to the simulation.
	 * @returns Nothing.
	 */
	private _resolveDisagreement(
		task: Task,
		simulatedResults: SimulatedResult[],
		price: number,
		trueVector: number[],
	): void {
		const excludedAccountIds = simulatedResults.map((simulatedResult) => {
			return simulatedResult.taskResult.accountId;
		});
		const arbiterAssignment = this._validatorSelector.chooseArbiter(task, excludedAccountIds);

		const allResults = [...simulatedResults];
		if (arbiterAssignment !== undefined) {
			allResults.push(this._executeAssignment(task, arbiterAssignment, trueVector, true));
		}

		const majorityOutcome = this._resolve(task, allResults);
		if (majorityOutcome.majorityResultValue === undefined) {
			this._metricsCollector.recordUnresolvedTask();
			return;
		}

		for (const simulatedResult of allResults) {
			if (majorityOutcome.agreeingAccountIds.includes(simulatedResult.taskResult.accountId) === true) {
				this._acceptResult(task, simulatedResult, price);
			} else {
				this._rejectResult(task, simulatedResult);
			}
		}
	}

	/**
	 * Settles a disagreement with the method the run was given.
	 *
	 * @param task The task the workers disagree about.
	 * @param simulatedResults Every result returned for the task.
	 * @returns The value that won, the accounts that agree with it, and the accounts that do not.
	 */
	private _resolve(task: Task, simulatedResults: SimulatedResult[]): MajorityOutcome {
		const taskResults = simulatedResults.map((simulatedResult) => {
			return simulatedResult.taskResult;
		});
		if (this._parameters.resolutionMethodName === 'trust weighted') {
			return DisagreementResolver.resolveByTrustWeight(
				taskResults,
				this._resultComparator,
				task.taskTypeName,
				(accountId, deviceId) => {
					return this._trustScoreBook.trustOf(accountId, deviceId);
				},
				this._parameters.minimumVoteWeight,
			);
		}
		return DisagreementResolver.resolveByMajority(taskResults, this._resultComparator, task.taskTypeName);
	}

	/**
	 * Makes one worker execute one assignment and returns the value it produced.
	 *
	 * @param task The task to execute.
	 * @param taskAssignment The assignment of the task to a device.
	 * @param trueVector The vector a perfect execution of the task returns, known only to the simulation.
	 * @returns The result returned by the worker, and whether the work was really performed.
	 * @throws When the assigned account has no simulated worker.
	 */
	private _executeAssignment(
		task: Task,
		taskAssignment: TaskAssignment,
		trueVector: number[],
		isArbiterCopy = false,
	): SimulatedResult {
		const workerProfile = this._workerProfileByAccountId.get(taskAssignment.accountId);
		if (workerProfile === undefined) {
			throw new Error(`the account "${taskAssignment.accountId}" has no simulated worker`);
		}
		const producedResult = WorkerBehavior.produceResult(
			workerProfile,
			trueVector,
			this._parameters.honestNoiseRatio,
			this._randomNumberFn,
		);
		const taskResult: TaskResult = {
			taskId: task.taskId,
			accountId: taskAssignment.accountId,
			deviceId: taskAssignment.deviceId,
			resultValue: producedResult.resultValue,
			completedAtTick: this._simulationClock.currentTick(),
		};
		this._metricsCollector.recordExecution({
			accountId: taskAssignment.accountId,
			isValidationCopy: taskAssignment.isValidationCopy,
			isArbiterCopy: isArbiterCopy,
			isGenuine: producedResult.isGenuine,
			tick: this._simulationClock.currentTick(),
		});
		return {
			taskResult: taskResult,
			isGenuine: producedResult.isGenuine,
		};
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
	 * @param simulatedResult The confirmed result.
	 * @param price The price of the task, in credits.
	 * @returns Nothing.
	 */
	private _acceptResult(task: Task, simulatedResult: SimulatedResult, price: number): void {
		const taskResult = simulatedResult.taskResult;
		const trustChange = this._trustScoreBook.afterConfirmedResult(taskResult.accountId, taskResult.deviceId);
		if (trustChange.newCombinedTrust >= this._parameters.trustedThreshold) {
			this._metricsCollector.recordTrustedAtTick(taskResult.accountId, this._simulationClock.currentTick());
		}
		this._payWorker(task, simulatedResult, price, 'accepted');
	}

	/**
	 * Contradicts one result: the worker loses trust and is paid nothing.
	 *
	 * @param task The executed task.
	 * @param simulatedResult The contradicted result.
	 * @returns Nothing.
	 */
	private _rejectResult(task: Task, simulatedResult: SimulatedResult): void {
		const taskResult = simulatedResult.taskResult;
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
		this._metricsCollector.recordRejectedResult({
			accountId: taskResult.accountId,
			isGenuine: simulatedResult.isGenuine,
			taskTypeName: task.taskTypeName,
			tick: tick,
		});
	}

	/**
	 * Takes back the credits an account was paid for results nobody ever verified, and drops the payments for such
	 * results that a settlement policy is still holding.
	 *
	 * A payment that is only held is not in the ledger, so no correction can reach it. It is dropped instead, without
	 * which the penalty would grow weaker the longer the settlement policy waits: everything earned during the current
	 * period would escape the penalty and then be recorded in full, once the worker had already been caught.
	 *
	 * @param taskResult The contradicted result that caused the penalty.
	 * @returns Nothing.
	 */
	private _confiscateUnverifiedCredits(taskResult: TaskResult): void {
		const droppedHeldTotal = this._deferredPaymentBook.dropUnverifiedCreditsOf(taskResult.accountId);
		if (droppedHeldTotal > 0) {
			this._metricsCollector.recordDroppedHeldCredits(droppedHeldTotal);
		}

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
			spendableFromTick: this._simulationClock.currentTick(),
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
	 * @param simulatedResult The paid result.
	 * @param price The price of the task, in credits.
	 * @param validationStatus The validation status of the paid result.
	 * @returns Nothing.
	 * @throws When the type of the task has no true price.
	 */
	private _payWorker(
		task: Task,
		simulatedResult: SimulatedResult,
		price: number,
		validationStatus: ValidationStatus,
	): void {
		const currentTick = this._simulationClock.currentTick();
		const settlementDecision = this._settlementPolicy.decideForPayment(currentTick);
		const ledgerEntryDraft: LedgerEntryDraft = {
			tick: settlementDecision.recordAtTick,
			accountId: simulatedResult.taskResult.accountId,
			taskId: task.taskId,
			entryType: 'credit',
			amount: price,
			spendableFromTick: settlementDecision.spendableFromTick,
			reason: 'the account executed a task',
			validationStatus: validationStatus,
		};
		if (settlementDecision.recordAtTick > currentTick) {
			this._deferredPaymentBook.hold(ledgerEntryDraft);
		} else {
			this._ledger.append(ledgerEntryDraft);
		}
		const truePrice = this._truePriceByTaskTypeName.get(task.taskTypeName);
		if (truePrice === undefined) {
			throw new Error(`the task type "${task.taskTypeName}" has no true price`);
		}
		this._metricsCollector.recordPaidResult({
			accountId: simulatedResult.taskResult.accountId,
			isGenuine: simulatedResult.isGenuine,
			amount: price,
			trueAmount: truePrice,
		});
	}
}
