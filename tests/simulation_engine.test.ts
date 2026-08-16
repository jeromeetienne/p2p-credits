import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { SimulationEngine } from '../src/simulation/simulation_engine.js';
import type { SimulationParameters } from '../src/simulation/simulation_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SimulationEngineTest — a run that repeats itself, and books that still balance
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * A short scenario, written here rather than read from an example, so that a change made to an example never changes
 * what these tests measure.
 */
const baseParameters: SimulationParameters = {
	randomSeed: 1,
	tickCount: 40,
	tasksPerTick: 4,
	untrustedValidationRate: 0.5,
	trustedValidationRate: 0.05,
	recentErrorValidationRate: 0.9,
	untrustedThreshold: 0,
	recentErrorTickCount: 20,
	defaultComparisonStrategy: {
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.001,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	taskTypeComparisonStrategies: [],
	resolutionMethodName: 'trust weighted',
	minimumVoteWeight: 1,
	trustedArbiterShare: 0.5,
	resultVectorLength: 4,
	honestNoiseRatio: 0.0001,
	honestWorkerCount: 10,
	unstableWorkerCount: 2,
	unstableErrorProbability: 0.05,
	maliciousWorkerCount: 1,
	sybilAttackerCount: 1,
	sybilAbandonTrust: -10,
	settlementPolicyName: 'provisional credit',
	provisionalTickCount: 10,
	settlementPeriodTickCount: 20,
	allowedInitialDeficit: 1,
	allowedDeficitAfterContribution: 5,
	requiredContribution: 10,
	identityCost: 5,
	identityProofName: 'verified electronic mail address',
	taskCosts: [
		{
			taskTypeName: 'reference task',
			trueCostSeconds: 10,
		},
		{
			taskTypeName: 'task A',
			trueCostSeconds: 30,
		},
	],
	referenceTaskTypeName: 'reference task',
	creditPerReferenceTask: 1,
	benchmarkEnvironment: {
		modelName: 'reference model',
		runtimeName: 'reference runtime',
		precisionFormatName: 'float16',
		hardwareFamilyName: 'reference hardware family',
	},
	benchmarkRunCount: 5,
	pricingErrorRatio: 0.1,
	initialTrust: 0,
	trustIncreaseOnConfirmedResult: 1,
	trustDecreaseOnInvalidResult: 5,
	strongPenaltyFactor: 4,
	penaltyPolicyName: 'credit confiscation',
	suspensionTickCount: 20,
	deviceTrustWeight: 0.5,
	secondDeviceTick: 20,
	minimumTrust: -20,
	maximumTrust: 100,
	trustedThreshold: 10,
};

/** The same scenario with nobody in it but honest workers. */
const honestOnlyParameters: SimulationParameters = {
	...baseParameters,
	honestWorkerCount: 12,
	unstableWorkerCount: 0,
	maliciousWorkerCount: 0,
	sybilAttackerCount: 0,
};

test('the same seed always produces the same report', () => {
	const firstReport = new SimulationEngine(baseParameters).run();
	const secondReport = new SimulationEngine(baseParameters).run();

	Assert.deepEqual(firstReport, secondReport);
});

test('two different seeds produce two different reports', () => {
	const firstReport = new SimulationEngine(baseParameters).run();
	const secondReport = new SimulationEngine({
		...baseParameters,
		randomSeed: 2,
	}).run();

	Assert.notDeepEqual(firstReport, secondReport);
});

test('every task asked for is either submitted or refused, and none is lost', () => {
	const simulationReport = new SimulationEngine(baseParameters).run();

	Assert.equal(simulationReport.tickCount, 40);
	Assert.equal(simulationReport.taskCount + simulationReport.refusedTaskCount, 160);
	Assert.equal(simulationReport.executionCount >= simulationReport.taskCount, true);
	Assert.equal(
		simulationReport.wrongResultDetectedCount + simulationReport.wrongResultUndetectedCount,
		simulationReport.wrongResultCount,
	);
});

test('the ledger of a finished run still balances', () => {
	const simulationEngine = new SimulationEngine(baseParameters);
	const simulationReport = simulationEngine.run();
	const ledger = simulationEngine.ledger();
	const accountIds = new Set(
		ledger.allEntries().map((ledgerEntry) => {
			return ledgerEntry.accountId;
		}),
	);

	let totalBalance = 0;
	let totalAdjustment = 0;
	for (const accountId of accountIds) {
		totalBalance += ledger.balanceOf(accountId);
		totalAdjustment += ledger.adjustmentTotalOf(accountId);
	}

	const expectedBalance = ledger.totalCreditsCreated() - ledger.totalCreditsConsumed() + totalAdjustment;

	Assert.equal(Math.abs(totalBalance - expectedBalance) < 1e-9, true);
	Assert.equal(totalAdjustment, -simulationReport.confiscatedCredits);
});

test('a network of honest workers alone never rejects a genuine result', () => {
	const simulationReport = new SimulationEngine(honestOnlyParameters).run();

	Assert.equal(simulationReport.wrongResultCount, 0);
	Assert.equal(simulationReport.correctResultRejectedCount, 0);
	Assert.equal(simulationReport.unresolvedTaskCount, 0);
	Assert.equal(simulationReport.suspensionCount, 0);
	Assert.equal(simulationReport.confiscatedCredits, 0);
	Assert.equal(simulationReport.creditsAwardedForWrongResults, 0);
});

test('a comparison stricter than the machines leaves honest workers unpaid', () => {
	const simulationReport = new SimulationEngine({
		...honestOnlyParameters,
		defaultComparisonStrategy: {
			strategyName: 'exact',
			numericalTolerance: 0,
			decimalCount: 6,
			similarityThreshold: 1,
		},
	}).run();

	Assert.equal(simulationReport.wrongResultCount, 0);
	Assert.equal(simulationReport.unresolvedTaskCount > 0, true);
	Assert.equal(new SimulationEngine(honestOnlyParameters).run().unresolvedTaskCount, 0);
});

test('every task type is priced, and the price is read from the measured cost', () => {
	const simulationReport = new SimulationEngine(baseParameters).run();

	Assert.equal(simulationReport.taskTypePricingSummaries.length, 2);
	for (const taskTypePricingSummary of simulationReport.taskTypePricingSummaries) {
		const expectedRatio = taskTypePricingSummary.price / taskTypePricingSummary.truePrice;

		Assert.equal(taskTypePricingSummary.price > 0, true);
		Assert.equal(Math.abs(taskTypePricingSummary.profitabilityRatio - expectedRatio) < 1e-9, true);
	}
	Assert.equal(simulationReport.pricingArbitrageRatio >= 1, true);
});

test('every worker gets a summary, and every worker gets a second device', () => {
	const simulationReport = new SimulationEngine(honestOnlyParameters).run();

	Assert.equal(simulationReport.workerSummaries.length, 12);
	Assert.equal(simulationReport.deviceSummaries.length, 24);
	Assert.equal(
		simulationReport.deviceSummaries.filter((deviceSummary) => {
			return deviceSummary.addedAtTick === 20;
		}).length,
		12,
	);
});

test('an account a Sybil attacker abandons is replaced by a freshly opened one', () => {
	const simulationReport = new SimulationEngine(baseParameters).run();

	Assert.equal(simulationReport.abandonedAccountCount > 0, true);
	Assert.equal(
		simulationReport.workerSummaries.length,
		baseParameters.honestWorkerCount +
			baseParameters.unstableWorkerCount +
			baseParameters.maliciousWorkerCount +
			baseParameters.sybilAttackerCount,
	);
	Assert.equal(simulationReport.deviceSummaries.length > simulationReport.workerSummaries.length * 2, true);
	Assert.equal(simulationReport.totalIdentityCost, simulationReport.createdAccountCount * baseParameters.identityCost);
});

test('an account is never abandoned for a replacement that starts no higher', () => {
	const simulationReport = new SimulationEngine({
		...baseParameters,
		sybilAbandonTrust: baseParameters.initialTrust,
	}).run();

	Assert.equal(simulationReport.abandonedAccountCount, 0);
	Assert.equal(
		simulationReport.createdAccountCount,
		baseParameters.honestWorkerCount
			+ baseParameters.unstableWorkerCount
			+ baseParameters.maliciousWorkerCount
			+ baseParameters.sybilAttackerCount,
	);
});

test('a payment a settlement policy still holds is dropped when its worker is caught', () => {
	/**
	 * A settlement in batches records nothing before the end of a period, so no account can earn anything to spend
	 * inside that period. The deficit allowed to a newcomer is opened wide here, and only here, so that tasks are
	 * actually executed and payments actually pile up while waiting to be recorded.
	 */
	const heldPaymentParameters: SimulationParameters = {
		...baseParameters,
		settlementPolicyName: 'delayed settlement',
		penaltyPolicyName: 'credit confiscation',
		allowedInitialDeficit: 100,
	};

	Assert.equal(new SimulationEngine(heldPaymentParameters).run().droppedHeldCredits > 0, true);
	Assert.equal(new SimulationEngine(baseParameters).run().droppedHeldCredits, 0);
});
