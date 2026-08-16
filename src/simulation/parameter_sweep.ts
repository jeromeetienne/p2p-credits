import { ReportSummary, type SimulationSummary } from './report_summary.js';
import { SimulationEngine } from './simulation_engine.js';
import type { SimulationParameters } from './simulation_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ParameterSweep — runs one scenario at several values of one parameter
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** One value of the parameter being swept, and the scenario that goes with it. */
export type SweepPoint = {
	/** What this point changed, written as it is shown, for example "validation rate 0.05". */
	pointName: string;
	/** The whole scenario at that value. */
	parameters: SimulationParameters;
};

/** What one point of a sweep measured. */
export type SweepResult = {
	/** What this point changed. */
	pointName: string;
	/** The four families of metrics, averaged over the seeds the point was run with. */
	summary: SimulationSummary;
	/** Number of seeds the point was run with. */
	seedCount: number;
};

/**
 * One scenario run at several values of one parameter.
 *
 * A single run says very little, because one seed carries its own luck. Every point is therefore run with several
 * seeds and the metrics are averaged, so that the difference between two points is the parameter and not the draw.
 */
export class ParameterSweep {
	/**
	 * Runs every point of a sweep.
	 *
	 * @param sweepPoints The values to run, each with the whole scenario that goes with it.
	 * @param seedCount Number of seeds every point is run with.
	 * @returns What each point measured, in the order the points were given.
	 */
	static run(sweepPoints: SweepPoint[], seedCount: number): SweepResult[] {
		return sweepPoints.map((sweepPoint) => {
			return ParameterSweep.runPoint(sweepPoint, seedCount);
		});
	}

	/**
	 * Runs one point with several seeds and averages what the runs measured.
	 *
	 * @param sweepPoint The value to run, with the whole scenario that goes with it.
	 * @param seedCount Number of seeds the point is run with.
	 * @returns What the point measured.
	 * @throws When the number of seeds is not at least one.
	 */
	static runPoint(sweepPoint: SweepPoint, seedCount: number): SweepResult {
		if (seedCount < 1) {
			throw new Error('a point of a sweep has to be run with at least one seed');
		}

		const summaries: SimulationSummary[] = [];
		for (let seedIndex = 0; seedIndex < seedCount; seedIndex += 1) {
			const parameters: SimulationParameters = {
				...sweepPoint.parameters,
				randomSeed: sweepPoint.parameters.randomSeed + seedIndex,
			};
			const simulationEngine = new SimulationEngine(parameters);
			summaries.push(ReportSummary.summarize(simulationEngine.run()));
		}

		return {
			pointName: sweepPoint.pointName,
			summary: ParameterSweep._averageOf(summaries),
			seedCount: seedCount,
		};
	}

	/**
	 * Averages the metrics of several runs of the same point.
	 *
	 * @param summaries The metrics of every run of the point.
	 * @returns The averaged metrics.
	 * @throws When there is nothing to average.
	 */
	private static _averageOf(summaries: SimulationSummary[]): SimulationSummary {
		const firstSummary = summaries[0];
		if (firstSummary === undefined) {
			throw new Error('cannot average the metrics of no run at all');
		}

		return {
			falseResultAcceptedShare: ParameterSweep._meanOf(summaries, 'falseResultAcceptedShare'),
			fraudulentCreditShare: ParameterSweep._meanOf(summaries, 'fraudulentCreditShare'),
			averageDetectionDelayTicks: ParameterSweep._meanOfDefined(summaries, 'averageDetectionDelayTicks'),
			largestLossBeforeFirstRejection: ParameterSweep._meanOf(summaries, 'largestLossBeforeFirstRejection'),
			sybilAttackerProfit: ParameterSweep._meanOf(summaries, 'sybilAttackerProfit'),

			validationShare: ParameterSweep._meanOf(summaries, 'validationShare'),
			executionsPerTask: ParameterSweep._meanOf(summaries, 'executionsPerTask'),
			arbiterShare: ParameterSweep._meanOf(summaries, 'arbiterShare'),

			creditsCreated: ParameterSweep._meanOf(summaries, 'creditsCreated'),
			inflationRatio: ParameterSweep._meanOf(summaries, 'inflationRatio'),
			creditShareOfRichestTenth: ParameterSweep._meanOf(summaries, 'creditShareOfRichestTenth'),

			averageTicksToTrusted: ParameterSweep._meanOfDefined(summaries, 'averageTicksToTrusted'),
			averageSpendableDelayTicks: ParameterSweep._meanOf(summaries, 'averageSpendableDelayTicks'),
			unfairRejectionShare: ParameterSweep._meanOf(summaries, 'unfairRejectionShare'),
			honestRefusalShare: ParameterSweep._meanOf(summaries, 'honestRefusalShare'),
		};
	}

	/**
	 * Averages one metric that every run always measures.
	 *
	 * @param summaries The metrics of every run of the point.
	 * @param fieldName Name of the metric to average.
	 * @returns The average of that metric.
	 */
	private static _meanOf(
		summaries: SimulationSummary[],
		fieldName: {
			[FieldName in keyof SimulationSummary]: SimulationSummary[FieldName] extends number ? FieldName : never;
		}[keyof SimulationSummary],
	): number {
		let total = 0;
		for (const summary of summaries) {
			total += summary[fieldName];
		}
		return total / summaries.length;
	}

	/**
	 * Averages one metric that a run only measures when something happened, and leaves it out when nothing did.
	 *
	 * @param summaries The metrics of every run of the point.
	 * @param fieldName Name of the metric to average.
	 * @returns The average over the runs that measured it, or `undefined` when none did.
	 */
	private static _meanOfDefined(
		summaries: SimulationSummary[],
		fieldName: 'averageDetectionDelayTicks' | 'averageTicksToTrusted',
	): number | undefined {
		let total = 0;
		let measuredRunCount = 0;
		for (const summary of summaries) {
			const value = summary[fieldName];
			if (value === undefined) {
				continue;
			}
			total += value;
			measuredRunCount += 1;
		}
		if (measuredRunCount === 0) {
			return undefined;
		}
		return total / measuredRunCount;
	}
}
