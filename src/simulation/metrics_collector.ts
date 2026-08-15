import type { AccountRegistry } from '../identity/account_registry.js';
import type { DeferredPaymentBook } from '../ledger/deferred_payment_book.js';
import type { Ledger } from '../ledger/ledger.js';
import type { SuspensionBook } from '../trust/suspension_book.js';
import type { TrustScoreBook } from '../trust/trust_score.js';
import type { AccountId } from '../types/account_types.js';
import type { TaskTypeName } from '../types/task_types.js';
import type { ComparisonStrategyName } from '../validation/result_comparator.js';
import type {
	DeviceSummary,
	SimulationReport,
	TaskTypePricingSummary,
	TaskTypeValidationSummary,
	WorkerSummary,
} from './simulation_types.js';
import type { WorkerBehaviorName, WorkerProfile } from './worker_behavior.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	MetricsCollector — counts what happened during a run and builds the report
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Everything the report of a run is read from, once the run is over. */
export type ReportInputs = {
	/** Number of ticks the run lasted. */
	tickCount: number;
	/** The ledger of the run, read to obtain the balances and the totals. */
	ledger: Ledger;
	/** The trust scores of the run. */
	trustScoreBook: TrustScoreBook;
	/** The suspensions pronounced during the run. */
	suspensionBook: SuspensionBook;
	/** The accounts opened during the run, and what opening them cost. */
	accountRegistry: AccountRegistry;
	/** The payments still waiting to be recorded at the end of the run. */
	deferredPaymentBook: DeferredPaymentBook;
	/** Every simulated worker of the run. */
	workerProfiles: WorkerProfile[];
	/** What each task type was paid, compared with what it was worth. */
	taskTypePricingSummaries: TaskTypePricingSummary[];
	/** What each device earned in trust, and when it joined the network. */
	deviceSummaries: DeviceSummary[];
	/** What every Sybil attacker kept, less what opening its accounts cost, in credits. */
	sybilAttackerProfit: number;
};

/**
 * The counters of one run.
 *
 * The collector is the only part that knows which value was the correct one, because only a simulation can know that.
 * The library itself never receives that information, and judges a result exclusively by comparing it with the result
 * of another worker.
 */
export class MetricsCollector {
	/** Number of tasks submitted during the run. */
	private _taskCount = 0;

	/** Number of executions performed, including the duplicated copies. */
	private _executionCount = 0;

	/** Number of executions that were duplicated copies. */
	private _validationCopyExecutionCount = 0;

	/** Number of returned values that were not the correct value of the task. */
	private _wrongResultCount = 0;

	/** Number of wrong values the network rejected. */
	private _wrongResultDetectedCount = 0;

	/** Number of wrong values the network paid for without noticing. */
	private _wrongResultUndetectedCount = 0;

	/** Amount of credits paid for wrong values. */
	private _creditsAwardedForWrongResults = 0;

	/** Number of correct values the network rejected. */
	private _correctResultRejectedCount = 0;

	/** Number of tasks where no value reached a majority. */
	private _unresolvedTaskCount = 0;

	/** Number of tasks nobody executed, because every device was suspended at that moment. */
	private _unassignedTaskCount = 0;

	/** Amount of credits taken back from workers caught returning a wrong result. */
	private _confiscatedCredits = 0;

	/** Amount of credits created only because the benchmark did not measure the true cost. */
	private _creditsCreatedByPricingError = 0;

	/** Number of tasks the network refused, because the account asking had not contributed enough. */
	private _refusedTaskCount = 0;

	/** Number of tasks refused to each kind of worker, indexed by the name of the behaviour. */
	private _refusedTaskCountByBehaviorName = new Map<WorkerBehaviorName, number>();

	/** Number of accounts a Sybil attacker abandoned. */
	private _abandonedAccountCount = 0;

	/** Tick at which each account first reached the trusted threshold. */
	private _firstTrustedTickByAccountId = new Map<AccountId, number>();

	/** How the comparison of each task type behaved, indexed by the name of the task type. */
	private _validationCountersByTaskTypeName = new Map<TaskTypeName, TaskTypeValidationSummary>();

	/**
	 * Records that one task was submitted to the network.
	 *
	 * @returns Nothing.
	 */
	recordTaskSubmitted(): void {
		this._taskCount += 1;
	}

	/**
	 * Records that one worker executed one task, or one duplicated copy of a task.
	 *
	 * @param isValidationCopy True when the execution was a duplicated copy created to validate a first result.
	 * @param isResultCorrect True when the worker returned the correct value of the task.
	 * @returns Nothing.
	 */
	recordExecution(isValidationCopy: boolean, isResultCorrect: boolean): void {
		this._executionCount += 1;
		if (isValidationCopy === true) {
			this._validationCopyExecutionCount += 1;
		}
		if (isResultCorrect === false) {
			this._wrongResultCount += 1;
		}
	}

	/**
	 * Records that the network paid a worker for a result.
	 *
	 * @param isResultCorrect True when the paid value was the correct value of the task.
	 * @param amount Amount paid, in credits.
	 * @param trueAmount Amount the network would have paid if the benchmark had measured the true cost, in credits.
	 * @returns Nothing.
	 */
	recordPaidResult(isResultCorrect: boolean, amount: number, trueAmount: number): void {
		this._creditsCreatedByPricingError += amount - trueAmount;
		if (isResultCorrect === false) {
			this._wrongResultUndetectedCount += 1;
			this._creditsAwardedForWrongResults += amount;
		}
	}

	/**
	 * Records that the network rejected a result and paid nothing for it.
	 *
	 * @param isResultCorrect True when the rejected result was genuinely computed by its worker.
	 * @param taskTypeName Name of the type of the rejected task.
	 * @returns Nothing.
	 */
	recordRejectedResult(isResultCorrect: boolean, taskTypeName: TaskTypeName): void {
		if (isResultCorrect === false) {
			this._wrongResultDetectedCount += 1;
			return;
		}
		this._correctResultRejectedCount += 1;
		const counters = this._validationCountersOf(taskTypeName);
		counters.genuineResultRejectedCount += 1;
	}

	/**
	 * Records that two results of one task type were compared.
	 *
	 * @param taskTypeName Name of the type of the compared task.
	 * @param comparisonStrategyName The comparison used for that task type.
	 * @param isAgreement True when the two results said the same thing.
	 * @returns Nothing.
	 */
	recordComparison(
		taskTypeName: TaskTypeName,
		comparisonStrategyName: ComparisonStrategyName,
		isAgreement: boolean,
	): void {
		const counters = this._validationCountersOf(taskTypeName);
		counters.comparisonStrategyName = comparisonStrategyName;
		counters.comparisonCount += 1;
		if (isAgreement === false) {
			counters.disagreementCount += 1;
		}
	}

	/**
	 * Records that no value reached a majority for one task, so nobody was paid for it.
	 *
	 * @returns Nothing.
	 */
	recordUnresolvedTask(): void {
		this._unresolvedTaskCount += 1;
	}

	/**
	 * Records that one task found no device to run on, because every device was suspended at that moment.
	 *
	 * @returns Nothing.
	 */
	recordUnassignedTask(): void {
		this._unassignedTaskCount += 1;
	}

	/**
	 * Records that the network took credits back from a worker caught returning a wrong result.
	 *
	 * @param amount Amount taken back, in credits.
	 * @returns Nothing.
	 */
	recordConfiscation(amount: number): void {
		this._confiscatedCredits += amount;
	}

	/**
	 * Records that the network refused a task, because the account asking for it had not contributed enough.
	 *
	 * @param behaviorName The behaviour of the worker that was refused.
	 * @returns Nothing.
	 */
	recordRefusedTask(behaviorName: WorkerBehaviorName): void {
		this._refusedTaskCount += 1;
		const previousCount = this._refusedTaskCountByBehaviorName.get(behaviorName) ?? 0;
		this._refusedTaskCountByBehaviorName.set(behaviorName, previousCount + 1);
	}

	/**
	 * Records that a Sybil attacker abandoned an account the network had stopped trusting.
	 *
	 * @returns Nothing.
	 */
	recordAbandonedAccount(): void {
		this._abandonedAccountCount += 1;
	}

	/**
	 * Records the tick at which one account reached the trusted threshold, and keeps only the first one.
	 *
	 * @param accountId Identifier of the account.
	 * @param tick The current tick.
	 * @returns Nothing.
	 */
	recordTrustedAtTick(accountId: AccountId, tick: number): void {
		if (this._firstTrustedTickByAccountId.has(accountId) === true) {
			return;
		}
		this._firstTrustedTickByAccountId.set(accountId, tick);
	}

	/**
	 * Builds the report of the run.
	 *
	 * @param reportInputs Everything the report is read from at the end of the run.
	 * @returns The report of the run.
	 */
	buildReport(reportInputs: ReportInputs): SimulationReport {
		const ledger = reportInputs.ledger;
		const trustScoreBook = reportInputs.trustScoreBook;
		const taskTypePricingSummaries = reportInputs.taskTypePricingSummaries;

		const workerSummaries: WorkerSummary[] = reportInputs.workerProfiles.map((workerProfile) => {
			return {
				accountId: workerProfile.accountId,
				behaviorName: workerProfile.behaviorName,
				balance: ledger.balanceOf(workerProfile.accountId),
				trust: trustScoreBook.trustOf(workerProfile.accountId, workerProfile.deviceId),
				accountTrust: trustScoreBook.accountTrustOf(workerProfile.accountId),
				deviceTrust: trustScoreBook.deviceTrustOf(workerProfile.deviceId),
				confirmedResultCount: trustScoreBook.confirmedResultCountOf(workerProfile.accountId),
				invalidResultCount: trustScoreBook.invalidResultCountOf(workerProfile.accountId),
				firstTrustedTick: this._firstTrustedTickByAccountId.get(workerProfile.accountId),
			};
		});

		let validationOverheadRatio = 0;
		if (this._executionCount > 0) {
			validationOverheadRatio = this._validationCopyExecutionCount / this._executionCount;
		}

		return {
			tickCount: reportInputs.tickCount,
			taskCount: this._taskCount,
			executionCount: this._executionCount,
			validationCopyExecutionCount: this._validationCopyExecutionCount,
			validationOverheadRatio: validationOverheadRatio,
			wrongResultCount: this._wrongResultCount,
			wrongResultDetectedCount: this._wrongResultDetectedCount,
			wrongResultUndetectedCount: this._wrongResultUndetectedCount,
			creditsAwardedForWrongResults: this._creditsAwardedForWrongResults,
			correctResultRejectedCount: this._correctResultRejectedCount,
			unresolvedTaskCount: this._unresolvedTaskCount,
			unassignedTaskCount: this._unassignedTaskCount,
			suspensionCount: reportInputs.suspensionBook.suspensionCount(),
			confiscatedCredits: this._confiscatedCredits,
			refusedTaskCount: this._refusedTaskCount,
			refusedTaskCounts: Array.from(this._refusedTaskCountByBehaviorName.entries()).map((entry) => {
				return {
					behaviorName: entry[0],
					refusedTaskCount: entry[1],
				};
			}),
			createdAccountCount: reportInputs.accountRegistry.createdAccountCount(),
			totalIdentityCost: reportInputs.accountRegistry.totalIdentityCost(),
			abandonedAccountCount: this._abandonedAccountCount,
			sybilAttackerProfit: reportInputs.sybilAttackerProfit,
			unsettledCredits: reportInputs.deferredPaymentBook.heldTotal(),
			totalCreditsCreated: ledger.totalCreditsCreated(),
			totalCreditsConsumed: ledger.totalCreditsConsumed(),
			creditsCreatedByPricingError: this._creditsCreatedByPricingError,
			pricingArbitrageRatio: MetricsCollector._arbitrageRatioOf(taskTypePricingSummaries),
			taskTypePricingSummaries: taskTypePricingSummaries,
			workerSummaries: workerSummaries,
			deviceSummaries: reportInputs.deviceSummaries,
			taskTypeValidationSummaries: Array.from(this._validationCountersByTaskTypeName.values()),
		};
	}

	/**
	 * Returns the counters of one task type, and opens them the first time that task type is seen.
	 *
	 * @param taskTypeName Name of the task type.
	 * @returns The counters of that task type.
	 */
	private _validationCountersOf(taskTypeName: TaskTypeName): TaskTypeValidationSummary {
		const existingCounters = this._validationCountersByTaskTypeName.get(taskTypeName);
		if (existingCounters !== undefined) {
			return existingCounters;
		}
		const openedCounters: TaskTypeValidationSummary = {
			taskTypeName: taskTypeName,
			comparisonStrategyName: 'exact',
			comparisonCount: 0,
			disagreementCount: 0,
			genuineResultRejectedCount: 0,
		};
		this._validationCountersByTaskTypeName.set(taskTypeName, openedCounters);
		return openedCounters;
	}

	/**
	 * Divides the highest profitability ratio by the lowest one, which measures how much a worker would gain by
	 * picking the task type the benchmark over-measured.
	 *
	 * @param taskTypePricingSummaries What each task type was paid, compared with what it was worth.
	 * @returns The arbitrage ratio, which is 1 when every task type pays exactly the work it costs.
	 */
	private static _arbitrageRatioOf(taskTypePricingSummaries: TaskTypePricingSummary[]): number {
		if (taskTypePricingSummaries.length === 0) {
			return 1;
		}
		let highestRatio = Number.NEGATIVE_INFINITY;
		let lowestRatio = Number.POSITIVE_INFINITY;
		for (const taskTypePricingSummary of taskTypePricingSummaries) {
			highestRatio = Math.max(highestRatio, taskTypePricingSummary.profitabilityRatio);
			lowestRatio = Math.min(lowestRatio, taskTypePricingSummary.profitabilityRatio);
		}
		if (lowestRatio <= 0) {
			return Number.POSITIVE_INFINITY;
		}
		return highestRatio / lowestRatio;
	}
}
