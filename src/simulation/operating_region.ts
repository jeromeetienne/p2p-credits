import type { SimulationSummary } from './report_summary.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	OperatingRegion — says whether one run sits where the network is worth running
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The three limits that together say where the network is worth running. */
export type OperatingRegionLimits = {
	/** Largest share of the executions that may be spent on validation, between 0 and 1. */
	largestValidationShare: number;
	/** Largest share of the credits created that may have been paid for results that were not genuine. */
	largestFraudulentCreditShare: number;
	/** Largest share of the genuine results the network may reject anyway, between 0 and 1. */
	largestUnfairRejectionShare: number;
	/** Largest share of the tasks of an honest worker the network may refuse, between 0 and 1. */
	largestHonestRefusalShare: number;
};

/** Whether one run met each of the three conditions, and all of them together. */
export type OperatingRegionVerdict = {
	/** True when the network spent little enough of its computing power on validation. */
	isValidationCostLow: boolean;
	/** True when fraud brought in little enough, and brought a Sybil attacker nothing at all. */
	isFraudUnprofitable: boolean;
	/** True when honest workers were rarely rejected and rarely refused. */
	isFrictionLow: boolean;
	/** True when the three conditions above all hold. */
	isInsideOperatingRegion: boolean;
};

/**
 * The test of the central hypothesis of section 15 of the design note.
 *
 * The hypothesis is that a network can stay economically reliable while validating only a small share of the tasks,
 * provided that the verification frequency follows the reputation of the worker and that disposable identities cost
 * enough. The desired region is a low validation cost, fraud that does not pay, and little friction for honest
 * users, all three at once. A run that misses one of the three misses the point of the whole system.
 */
export class OperatingRegion {
	/**
	 * Says whether one run sits inside the region where the network is worth running.
	 *
	 * @param simulationSummary The summary of the run.
	 * @param operatingRegionLimits The three limits the run is held to.
	 * @returns Which conditions the run met, and whether it met all of them.
	 */
	static judge(
		simulationSummary: SimulationSummary,
		operatingRegionLimits: OperatingRegionLimits,
	): OperatingRegionVerdict {
		const isValidationCostLow = simulationSummary.validationShare
			<= operatingRegionLimits.largestValidationShare;
		const isFraudUnprofitable = simulationSummary.fraudulentCreditShare
				<= operatingRegionLimits.largestFraudulentCreditShare
			&& simulationSummary.sybilAttackerProfit <= 0;
		const isFrictionLow = simulationSummary.unfairRejectionShare
				<= operatingRegionLimits.largestUnfairRejectionShare
			&& simulationSummary.honestRefusalShare <= operatingRegionLimits.largestHonestRefusalShare;

		return {
			isValidationCostLow: isValidationCostLow,
			isFraudUnprofitable: isFraudUnprofitable,
			isFrictionLow: isFrictionLow,
			isInsideOperatingRegion: isValidationCostLow && isFraudUnprofitable && isFrictionLow,
		};
	}
}
