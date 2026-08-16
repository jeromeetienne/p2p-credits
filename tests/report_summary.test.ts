import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { ReportSummary } from '../src/simulation/report_summary.js';
import type { SimulationReport } from '../src/simulation/simulation_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ReportSummaryTest — the shares and the averages read from the counters of a run
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds one report, with everything a test does not care about left at zero.
 *
 * @param simulationReportFields The counters the test cares about.
 * @returns The report to summarize.
 */
function buildReport(simulationReportFields: Partial<SimulationReport>): SimulationReport {
	return {
		tickCount: 10,
		taskCount: 0,
		executionCount: 0,
		validationCopyExecutionCount: 0,
		arbiterExecutionCount: 0,
		averageDetectionDelayTicks: undefined,
		largestLossBeforeFirstRejection: 0,
		averageSpendableDelayTicks: 0,
		creditShareOfRichestTenth: 0,
		validationOverheadRatio: 0,
		wrongResultCount: 0,
		wrongResultDetectedCount: 0,
		wrongResultUndetectedCount: 0,
		creditsAwardedForWrongResults: 0,
		correctResultRejectedCount: 0,
		unresolvedTaskCount: 0,
		unassignedTaskCount: 0,
		suspensionCount: 0,
		confiscatedCredits: 0,
		droppedHeldCredits: 0,
		refusedTaskCount: 0,
		refusedTaskCounts: [],
		createdAccountCount: 0,
		totalIdentityCost: 0,
		abandonedAccountCount: 0,
		sybilAttackerProfit: 0,
		unsettledCredits: 0,
		totalCreditsCreated: 0,
		totalCreditsConsumed: 0,
		creditsCreatedByPricingError: 0,
		pricingArbitrageRatio: 1,
		taskTypePricingSummaries: [],
		workerSummaries: [],
		deviceSummaries: [],
		taskTypeValidationSummaries: [],
		...simulationReportFields,
	};
}

test('the inflation is the credits created for every credit consumed', () => {
	const simulationSummary = ReportSummary.summarize(buildReport({
		totalCreditsCreated: 30,
		totalCreditsConsumed: 20,
	}));

	Assert.equal(simulationSummary.inflationRatio, 1.5);
});

test('credits created against no consumption at all are the most inflated of all', () => {
	const simulationSummary = ReportSummary.summarize(buildReport({
		totalCreditsCreated: 30,
		totalCreditsConsumed: 0,
	}));

	Assert.equal(simulationSummary.inflationRatio, Number.POSITIVE_INFINITY);
});

test('a run that created nothing and consumed nothing is not inflated', () => {
	const simulationSummary = ReportSummary.summarize(buildReport({
		totalCreditsCreated: 0,
		totalCreditsConsumed: 0,
	}));

	Assert.equal(simulationSummary.inflationRatio, 1);
});
