import type { SimulationParameters } from '../../src/index.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	FirstSimulationParameters — the values of this scenario, and nothing else
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * The values of the first scenario.
 *
 * The three task types follow the example of section 2 of the design note: the reference task costs 10 seconds on the
 * reference machine and is worth 1 credit, a task of 30 seconds is worth 3 credits, and a task of 5 seconds is worth
 * half a credit.
 *
 * Those three costs are the true ones, and the network never reads them. The benchmark measures each task type five
 * times, and every measured run misses the true cost by up to one tenth, so the prices the network uses are wrong by
 * a few percent, as they always are in reality.
 *
 * A new worker sees one task out of two duplicated, a trusted worker one out of twenty, and a worker caught recently
 * sees nine out of ten. Half of the trust of a worker comes from its account and half from its device, so a trusted
 * account that adds an unknown device is trusted half as much on that device as on the one it earned its history on.
 *
 * At the tick in the middle of the run, every worker adds a second device the network has never seen. The device
 * table at the end of the report then shows what each account handed to that new device.
 *
 * A result is a vector of four numbers, and two genuine executions of the same task differ by up to one ten
 * thousandth, because no two executions of an inference are identical. Each task type is compared in its own way, so
 * that the three comparisons can be watched side by side in one run: the reference task by a numerical tolerance,
 * task A by a canonical form kept to two decimals, and task B by the angle between the two vectors.
 *
 * A worker is paid at once and waits ten ticks before it can spend, an account that has earned nothing may go one
 * credit into debt and no further, and opening an account costs five credits. Two Sybil attackers abandon their
 * account for a fresh one every time the network has lowered its trust to minus ten, so that the cost of an identity
 * can be compared with what the attack brings in.
 */
export const firstSimulationParameters: SimulationParameters = {
	randomSeed: 20260815,
	tickCount: 200,
	tasksPerTick: 10,
	untrustedValidationRate: 0.5,
	trustedValidationRate: 0.05,
	recentErrorValidationRate: 0.9,
	untrustedThreshold: 0,
	recentErrorTickCount: 20,
	defaultComparisonStrategy: {
		strategyName: 'exact',
		numericalTolerance: 0,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	taskTypeComparisonStrategies: [
		{
			taskTypeName: 'reference task',
			comparisonStrategy: {
				strategyName: 'numerical tolerance',
				numericalTolerance: 0.001,
				decimalCount: 6,
				similarityThreshold: 1,
			},
		},
		{
			taskTypeName: 'task A',
			comparisonStrategy: {
				strategyName: 'normalized hash',
				numericalTolerance: 0,
				decimalCount: 2,
				similarityThreshold: 1,
			},
		},
		{
			taskTypeName: 'task B',
			comparisonStrategy: {
				strategyName: 'similarity score',
				numericalTolerance: 0,
				decimalCount: 6,
				similarityThreshold: 0.9999,
			},
		},
	],
	resolutionMethodName: 'trust weighted',
	minimumVoteWeight: 1,
	trustedArbiterShare: 0.5,
	resultVectorLength: 4,
	honestNoiseRatio: 0.0001,
	honestWorkerCount: 20,
	unstableWorkerCount: 4,
	unstableErrorProbability: 0.05,
	maliciousWorkerCount: 2,
	sybilAttackerCount: 2,
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
		{
			taskTypeName: 'task B',
			trueCostSeconds: 5,
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
	secondDeviceTick: 100,
	minimumTrust: -20,
	maximumTrust: 100,
	trustedThreshold: 10,
};

/**
 * The same scenario under each of the three settlement policies of section 6 of the design note.
 *
 * Nothing else moves, so the three reports say what the network pays for choosing when a worker may spend what it
 * earned.
 */
export const settlementComparisonParameters: SimulationParameters[] = [
	{
		...firstSimulationParameters,
		settlementPolicyName: 'immediate credit',
	},
	{
		...firstSimulationParameters,
		settlementPolicyName: 'provisional credit',
	},
	{
		...firstSimulationParameters,
		settlementPolicyName: 'delayed settlement',
	},
];

/**
 * The same scenario, with one single change: every task type is compared character for character.
 *
 * Two genuine executions of the same task never write the same numbers, so this run shows what a network costs its
 * honest workers when it knows only how to compare exactly. It is run beside the first one to make that price
 * visible, and nothing else about the scenario moves.
 */
export const exactComparisonParameters: SimulationParameters = {
	...firstSimulationParameters,
	defaultComparisonStrategy: {
		strategyName: 'exact',
		numericalTolerance: 0,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	taskTypeComparisonStrategies: [],
};
