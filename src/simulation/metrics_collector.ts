import type { Ledger } from '../ledger/ledger.js';
import type { TrustScoreBook } from '../trust/trust_score.js';
import type { AccountId } from '../types/account_types.js';
import type { SimulationReport, WorkerSummary } from './simulation_types.js';
import type { WorkerProfile } from './worker_behavior.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	MetricsCollector — counts what happened during a run and builds the report
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

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

	/** Tick at which each account first reached the trusted threshold. */
	private _firstTrustedTickByAccountId = new Map<AccountId, number>();

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
	 * @returns Nothing.
	 */
	recordPaidResult(isResultCorrect: boolean, amount: number): void {
		if (isResultCorrect === false) {
			this._wrongResultUndetectedCount += 1;
			this._creditsAwardedForWrongResults += amount;
		}
	}

	/**
	 * Records that the network rejected a result and paid nothing for it.
	 *
	 * @param isResultCorrect True when the rejected value was the correct value of the task.
	 * @returns Nothing.
	 */
	recordRejectedResult(isResultCorrect: boolean): void {
		if (isResultCorrect === false) {
			this._wrongResultDetectedCount += 1;
		} else {
			this._correctResultRejectedCount += 1;
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
	 * @param tickCount Number of ticks the run lasted.
	 * @param ledger The ledger of the run, read to obtain the balances and the totals.
	 * @param trustScoreBook The trust scores of the run.
	 * @param workerProfiles Every simulated worker of the run.
	 * @returns The report of the run.
	 */
	buildReport(
		tickCount: number,
		ledger: Ledger,
		trustScoreBook: TrustScoreBook,
		workerProfiles: WorkerProfile[],
	): SimulationReport {
		const workerSummaries: WorkerSummary[] = workerProfiles.map((workerProfile) => {
			return {
				accountId: workerProfile.accountId,
				behaviorName: workerProfile.behaviorName,
				balance: ledger.balanceOf(workerProfile.accountId),
				trust: trustScoreBook.trustOf(workerProfile.accountId),
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
			tickCount: tickCount,
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
			totalCreditsCreated: ledger.totalCreditsCreated(),
			totalCreditsConsumed: ledger.totalCreditsConsumed(),
			workerSummaries: workerSummaries,
		};
	}
}
