import type { SimulationReport } from './simulation_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ReportSummary — turns the counters of a run into the four families of metrics
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * What one run says, in the four families of metrics of section 11 of the design note.
 *
 * Every number here is a share or an average rather than a count, because two runs of different sizes cannot be
 * compared by their counts. A run that executes half as many tasks meets half as much fraud, and that says nothing
 * about how safe it was.
 */
export type SimulationSummary = {
	/** Share of the results that were not genuine and that the network paid for anyway, between 0 and 1. */
	falseResultAcceptedShare: number;
	/** Share of the credits created that were paid for results that were not genuine, between 0 and 1. */
	fraudulentCreditShare: number;
	/**
	 * Average number of ticks between the first wrong result of an account and the first time the network rejected
	 * one of its results, or `undefined` when no account was ever caught.
	 */
	averageDetectionDelayTicks: number | undefined;
	/** Largest amount one single account was paid for wrong results before it was ever caught, in credits. */
	largestLossBeforeFirstRejection: number;
	/** What every Sybil attacker kept, less what opening its accounts cost, in credits. */
	sybilAttackerProfit: number;

	/** Share of the executions spent on validation rather than on the work asked for, between 0 and 1. */
	validationShare: number;
	/** Average number of times one task was executed, counting the copies. */
	executionsPerTask: number;
	/** Share of the executions that were the third opinion asked for to settle a disagreement, between 0 and 1. */
	arbiterShare: number;

	/** Total amount of credits created during the run. */
	creditsCreated: number;
	/**
	 * Amount of credits created for every credit consumed. A number above 1 means the network is inflating, and
	 * positive infinity means credits were created while nothing at all was consumed.
	 */
	inflationRatio: number;
	/** Share of the credits held by the richest tenth of the accounts, between 0 and 1. */
	creditShareOfRichestTenth: number;

	/** Average tick at which an honest worker first became trusted, or `undefined` when none ever did. */
	averageTicksToTrusted: number | undefined;
	/** Average number of ticks a worker waits between being paid and being able to spend. */
	averageSpendableDelayTicks: number;
	/** Share of the genuine results the network rejected anyway, between 0 and 1. */
	unfairRejectionShare: number;
	/** Share of the tasks asked for by an honest worker that the network refused, between 0 and 1. */
	honestRefusalShare: number;
};

/**
 * The four families of metrics of section 11, read from the counters of a run.
 *
 * Nothing here measures anything new. Every value is computed from the report, so that two runs can be compared
 * without the size of each run getting in the way.
 */
export class ReportSummary {
	/**
	 * Turns the counters of one run into the four families of metrics.
	 *
	 * @param simulationReport The report of the run.
	 * @returns The summary of the run.
	 */
	static summarize(simulationReport: SimulationReport): SimulationSummary {
		const genuineResultCount = simulationReport.executionCount - simulationReport.wrongResultCount;
		const honestRefusedTaskCount = simulationReport.refusedTaskCounts
			.filter((refusedTaskCount) => {
				return refusedTaskCount.behaviorName === 'honest';
			})
			.reduce((total, refusedTaskCount) => {
				return total + refusedTaskCount.refusedTaskCount;
			}, 0);
		const honestWorkerSummaries = simulationReport.workerSummaries.filter((workerSummary) => {
			return workerSummary.behaviorName === 'honest';
		});
		const honestTaskCount = ReportSummary._honestTaskCount(simulationReport, honestRefusedTaskCount);

		return {
			falseResultAcceptedShare: ReportSummary._shareOf(
				simulationReport.wrongResultUndetectedCount,
				simulationReport.wrongResultCount,
			),
			fraudulentCreditShare: ReportSummary._shareOf(
				simulationReport.creditsAwardedForWrongResults,
				simulationReport.totalCreditsCreated,
			),
			averageDetectionDelayTicks: simulationReport.averageDetectionDelayTicks,
			largestLossBeforeFirstRejection: simulationReport.largestLossBeforeFirstRejection,
			sybilAttackerProfit: simulationReport.sybilAttackerProfit,

			validationShare: simulationReport.validationOverheadRatio,
			executionsPerTask: ReportSummary._shareOf(
				simulationReport.executionCount,
				simulationReport.taskCount,
			),
			arbiterShare: ReportSummary._shareOf(
				simulationReport.arbiterExecutionCount,
				simulationReport.executionCount,
			),

			creditsCreated: simulationReport.totalCreditsCreated,
			inflationRatio: ReportSummary._inflationRatioOf(
				simulationReport.totalCreditsCreated,
				simulationReport.totalCreditsConsumed,
			),
			creditShareOfRichestTenth: simulationReport.creditShareOfRichestTenth,

			averageTicksToTrusted: ReportSummary._averageTicksToTrusted(honestWorkerSummaries),
			averageSpendableDelayTicks: simulationReport.averageSpendableDelayTicks,
			unfairRejectionShare: ReportSummary._shareOf(
				simulationReport.correctResultRejectedCount,
				genuineResultCount,
			),
			honestRefusalShare: ReportSummary._shareOf(honestRefusedTaskCount, honestTaskCount),
		};
	}

	/**
	 * Returns the number of tasks honest workers asked for, whether the network ran them or refused them.
	 *
	 * The report holds no count of the tasks asked for by each kind of worker, so the tasks that were run are shared
	 * out between the accounts in proportion to how many of them are honest.
	 *
	 * @param simulationReport The report of the run.
	 * @param honestRefusedTaskCount Number of tasks refused to honest workers.
	 * @returns The number of tasks honest workers asked for.
	 */
	private static _honestTaskCount(simulationReport: SimulationReport, honestRefusedTaskCount: number): number {
		const workerCount = simulationReport.workerSummaries.length;
		if (workerCount === 0) {
			return honestRefusedTaskCount;
		}
		const honestWorkerCount = simulationReport.workerSummaries.filter((workerSummary) => {
			return workerSummary.behaviorName === 'honest';
		}).length;
		const honestShareOfWorkers = honestWorkerCount / workerCount;
		return simulationReport.taskCount * honestShareOfWorkers + honestRefusedTaskCount;
	}

	/**
	 * Returns the average tick at which a worker first became trusted.
	 *
	 * @param workerSummaries The workers to read.
	 * @returns The average tick, or `undefined` when no worker ever became trusted.
	 */
	private static _averageTicksToTrusted(
		workerSummaries: SimulationReport['workerSummaries'],
	): number | undefined {
		let totalTick = 0;
		let trustedWorkerCount = 0;
		for (const workerSummary of workerSummaries) {
			if (workerSummary.firstTrustedTick === undefined) {
				continue;
			}
			totalTick += workerSummary.firstTrustedTick;
			trustedWorkerCount += 1;
		}
		if (trustedWorkerCount === 0) {
			return undefined;
		}
		return totalTick / trustedWorkerCount;
	}

	/**
	 * Returns the amount of credits created for every credit consumed.
	 *
	 * A run that consumed nothing cannot be given the value 0, which reads as the healthiest possible network: a run
	 * that created credits against no consumption at all is the most inflated run there is, not the least.
	 *
	 * @param creditsCreated Total amount of credits created during the run.
	 * @param creditsConsumed Total amount of credits consumed during the run.
	 * @returns The amount created for every credit consumed, 1 when nothing was created and nothing was consumed, and
	 *          positive infinity when credits were created and nothing was consumed.
	 */
	private static _inflationRatioOf(creditsCreated: number, creditsConsumed: number): number {
		if (creditsConsumed !== 0) {
			return creditsCreated / creditsConsumed;
		}
		if (creditsCreated === 0) {
			return 1;
		}
		return Number.POSITIVE_INFINITY;
	}

	/**
	 * Divides one number by another, and returns 0 rather than something that is not a number when the second one is
	 * zero.
	 *
	 * @param part The number on top.
	 * @param whole The number below.
	 * @returns The result of the division, or 0 when the number below is zero.
	 */
	private static _shareOf(part: number, whole: number): number {
		if (whole === 0) {
			return 0;
		}
		return part / whole;
	}
}
