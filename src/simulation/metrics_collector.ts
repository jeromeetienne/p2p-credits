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

/** One execution, as the counters see it. */
export type RecordedExecution = {
	/** Identifier of the account that executed. */
	accountId: AccountId;
	/** True when the execution was a duplicated copy created to validate a first result. */
	isValidationCopy: boolean;
	/** True when the execution was the copy asked for to settle a disagreement. */
	isArbiterCopy: boolean;
	/** True when the worker really performed the computation. */
	isGenuine: boolean;
	/** The tick the execution happened at. */
	tick: number;
};

/** One payment, as the counters see it. */
export type RecordedPayment = {
	/** Identifier of the account that was paid. */
	accountId: AccountId;
	/** True when the worker really performed the computation. */
	isGenuine: boolean;
	/** Amount paid, in credits. */
	amount: number;
	/** Amount the network would have paid if the benchmark had measured the true cost, in credits. */
	trueAmount: number;
};

/** One rejection, as the counters see it. */
export type RecordedRejection = {
	/** Identifier of the account whose result was rejected. */
	accountId: AccountId;
	/** True when the worker really performed the computation. */
	isGenuine: boolean;
	/** Name of the type of the rejected task. */
	taskTypeName: TaskTypeName;
	/** The tick the rejection happened at. */
	tick: number;
};

/** What one account did wrong, and when the network first noticed. */
type AccountCounters = {
	/** Tick of the first result of this account that was not genuinely computed. */
	firstWrongResultTick: number | undefined;
	/** Tick of the first result of this account the network rejected. */
	firstRejectionTick: number | undefined;
	/** Credits this account was paid for results that were not genuine, before it was rejected once. */
	creditsForWrongResultsBeforeFirstRejection: number;
};

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

	/** Number of executions asked for to settle a disagreement. */
	private _arbiterExecutionCount = 0;

	/** What each account did wrong, and when the network first noticed, indexed by the identifier of the account. */
	private _countersByAccountId = new Map<AccountId, AccountCounters>();

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
	 * @param execution What was executed, by whom, and whether the work was really performed.
	 * @returns Nothing.
	 */
	recordExecution(execution: RecordedExecution): void {
		this._executionCount += 1;
		if (execution.isValidationCopy === true) {
			this._validationCopyExecutionCount += 1;
		}
		if (execution.isArbiterCopy === true) {
			this._arbiterExecutionCount += 1;
		}
		if (execution.isGenuine === false) {
			this._wrongResultCount += 1;
			const accountCounters = this._accountCountersOf(execution.accountId);
			if (accountCounters.firstWrongResultTick === undefined) {
				accountCounters.firstWrongResultTick = execution.tick;
			}
		}
	}

	/**
	 * Records that the network paid a worker for a result.
	 *
	 * @param payment What was paid, to whom, and whether the work was really performed.
	 * @returns Nothing.
	 */
	recordPaidResult(payment: RecordedPayment): void {
		this._creditsCreatedByPricingError += payment.amount - payment.trueAmount;
		if (payment.isGenuine === true) {
			return;
		}
		this._wrongResultUndetectedCount += 1;
		this._creditsAwardedForWrongResults += payment.amount;

		const accountCounters = this._accountCountersOf(payment.accountId);
		if (accountCounters.firstRejectionTick === undefined) {
			accountCounters.creditsForWrongResultsBeforeFirstRejection += payment.amount;
		}
	}

	/**
	 * Records that the network rejected a result and paid nothing for it.
	 *
	 * @param rejection What was rejected, from whom, and whether the work was really performed.
	 * @returns Nothing.
	 */
	recordRejectedResult(rejection: RecordedRejection): void {
		const accountCounters = this._accountCountersOf(rejection.accountId);
		if (accountCounters.firstRejectionTick === undefined) {
			accountCounters.firstRejectionTick = rejection.tick;
		}

		if (rejection.isGenuine === false) {
			this._wrongResultDetectedCount += 1;
			return;
		}
		this._correctResultRejectedCount += 1;
		const counters = this._validationCountersOf(rejection.taskTypeName);
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
			arbiterExecutionCount: this._arbiterExecutionCount,
			averageDetectionDelayTicks: this._averageDetectionDelayTicks(),
			largestLossBeforeFirstRejection: this._largestLossBeforeFirstRejection(),
			averageSpendableDelayTicks: MetricsCollector._averageSpendableDelayTicks(ledger),
			creditShareOfRichestTenth: MetricsCollector._creditShareOfRichestTenth(
				ledger,
				reportInputs.accountRegistry,
			),
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
	 * Returns the average number of ticks a worker waits between being paid and being able to spend.
	 *
	 * @param ledger The ledger of the run.
	 * @returns The average wait in ticks, which is 0 when nobody was ever paid.
	 */
	private static _averageSpendableDelayTicks(ledger: Ledger): number {
		let totalDelay = 0;
		let creditCount = 0;
		for (const ledgerEntry of ledger.allEntries()) {
			if (ledgerEntry.entryType !== 'credit') {
				continue;
			}
			totalDelay += ledgerEntry.spendableFromTick - ledgerEntry.tick;
			creditCount += 1;
		}
		if (creditCount === 0) {
			return 0;
		}
		return totalDelay / creditCount;
	}

	/**
	 * Returns the share of the credits held by the richest tenth of the accounts.
	 *
	 * A network where a few accounts hold everything is a network where the credits stopped circulating, whoever
	 * earned them honestly.
	 *
	 * @param ledger The ledger of the run.
	 * @param accountRegistry The accounts opened during the run.
	 * @returns The share held by the richest tenth, between 0 and 1.
	 */
	private static _creditShareOfRichestTenth(ledger: Ledger, accountRegistry: AccountRegistry): number {
		const positiveBalances: number[] = [];
		let totalBalance = 0;
		for (const account of accountRegistry.allAccounts()) {
			const balance = ledger.balanceOf(account.accountId);
			if (balance <= 0) {
				continue;
			}
			positiveBalances.push(balance);
			totalBalance += balance;
		}
		if (positiveBalances.length === 0 || totalBalance === 0) {
			return 0;
		}

		const balancesFromRichest = [...positiveBalances].sort((balanceA, balanceB) => {
			return balanceB - balanceA;
		});
		const richestCount = Math.max(1, Math.round(balancesFromRichest.length / 10));
		let richestBalance = 0;
		for (let index = 0; index < richestCount; index += 1) {
			richestBalance += balancesFromRichest[index] ?? 0;
		}
		return richestBalance / totalBalance;
	}

	/**
	 * Returns the counters of one account, and opens them the first time that account is seen.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The counters of that account.
	 */
	private _accountCountersOf(accountId: AccountId): AccountCounters {
		const existingCounters = this._countersByAccountId.get(accountId);
		if (existingCounters !== undefined) {
			return existingCounters;
		}
		const openedCounters: AccountCounters = {
			firstWrongResultTick: undefined,
			firstRejectionTick: undefined,
			creditsForWrongResultsBeforeFirstRejection: 0,
		};
		this._countersByAccountId.set(accountId, openedCounters);
		return openedCounters;
	}

	/**
	 * Returns the average number of ticks between the first wrong result of an account and the first time the
	 * network rejected one of its results.
	 *
	 * @returns The average delay in ticks, or `undefined` when no account was ever caught.
	 */
	private _averageDetectionDelayTicks(): number | undefined {
		let totalDelay = 0;
		let caughtAccountCount = 0;
		for (const accountCounters of this._countersByAccountId.values()) {
			const firstWrongResultTick = accountCounters.firstWrongResultTick;
			const firstRejectionTick = accountCounters.firstRejectionTick;
			if (firstWrongResultTick === undefined || firstRejectionTick === undefined) {
				continue;
			}
			totalDelay += Math.max(0, firstRejectionTick - firstWrongResultTick);
			caughtAccountCount += 1;
		}
		if (caughtAccountCount === 0) {
			return undefined;
		}
		return totalDelay / caughtAccountCount;
	}

	/**
	 * Returns the largest amount one single account was paid for results that were not genuine before the network
	 * rejected any of its results.
	 *
	 * @returns The largest loss caused by one account before it was caught once, in credits.
	 */
	private _largestLossBeforeFirstRejection(): number {
		let largestLoss = 0;
		for (const accountCounters of this._countersByAccountId.values()) {
			largestLoss = Math.max(largestLoss, accountCounters.creditsForWrongResultsBeforeFirstRejection);
		}
		return largestLoss;
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
