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
 */
export const firstSimulationParameters: SimulationParameters = {
	randomSeed: 20260815,
	tickCount: 200,
	tasksPerTick: 10,
	validationRate: 0.1,
	honestWorkerCount: 20,
	unstableWorkerCount: 4,
	unstableErrorProbability: 0.05,
	maliciousWorkerCount: 2,
	taskTypes: [
		{
			taskTypeName: 'reference task',
			referenceCostSeconds: 10,
		},
		{
			taskTypeName: 'task A',
			referenceCostSeconds: 30,
		},
		{
			taskTypeName: 'task B',
			referenceCostSeconds: 5,
		},
	],
	referenceTaskCostSeconds: 10,
	creditPerReferenceTask: 1,
	initialTrust: 0,
	trustIncreaseOnConfirmedResult: 1,
	trustDecreaseOnInvalidResult: 5,
	minimumTrust: -20,
	maximumTrust: 100,
	trustedThreshold: 10,
};
