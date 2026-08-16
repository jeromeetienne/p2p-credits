import type { OperatingRegionLimits, SimulationParameters, SweepPoint } from '../../src/index.js';
import { firstSimulationParameters } from '../first_simulation/simulation_parameters.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SweepDefinitions — the five sweeps of section 10, and the limits of section 15
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** One sweep: the parameter that moves, and every value it takes. */
export type SweepDefinition = {
	/** Name of the parameter that moves, written as it is shown. */
	sweepName: string;
	/** Every value the parameter takes, each with the whole scenario that goes with it. */
	sweepPoints: SweepPoint[];
};

/** Number of seeds every point is run with, so that the draw of one run does not decide the answer. */
export const seedCount = 5;

/**
 * The scenario every sweep starts from.
 *
 * It is the first scenario, shortened so that five sweeps of five points and five seeds each stay quick to run.
 */
const baseParameters: SimulationParameters = {
	...firstSimulationParameters,
	tickCount: 100,
	tasksPerTick: 10,
};

/**
 * The three limits that say where the network is worth running.
 *
 * They are a first guess and nothing more. The point of the sweeps is to find out whether any set of parameters
 * meets all three at once, not to prove that these particular limits are the right ones.
 */
export const operatingRegionLimits: OperatingRegionLimits = {
	largestValidationShare: 0.2,
	largestFraudulentCreditShare: 0.02,
	largestUnfairRejectionShare: 0.01,
	largestHonestRefusalShare: 0.1,
};

/**
 * The scenario the sweeps point at, once each of them has said which way is better.
 *
 * It gives a newcomer ten credits of credit instead of one, raises trust twice as fast so that a worker reaches the
 * cheap verification sooner, and never stops verifying a worker that was caught once. The identity costs ten credits.
 */
export const tunedParameters: SimulationParameters = {
	...baseParameters,
	tickCount: 400,
	trustIncreaseOnConfirmedResult: 2,
	trustedThreshold: 5,
	allowedInitialDeficit: 10,
	allowedDeficitAfterContribution: 10,
	untrustedValidationRate: 0.5,
	trustedValidationRate: 0.03,
	recentErrorValidationRate: 1,
	recentErrorTickCount: 400,
	identityCost: 10,
};

/**
 * The tuned scenario at several shares of attackers.
 *
 * This is the last question of the whole plan: the hypothesis of section 15 is not "can the network be made safe",
 * it is "can it be made safe cheaply". Verifying a caught worker every single time is what keeps fraud down, and the
 * bill for it is set by how many attackers there are to verify.
 */
export const attackerShareSweep: SweepDefinition = {
	sweepName: 'share of attackers, tuned scenario',
	sweepPoints: [0, 1, 2, 4].map((attackerCount) => {
		return {
			pointName: `${attackerCount * 2} attackers among 28 workers`,
			parameters: {
				...tunedParameters,
				honestWorkerCount: 24 - attackerCount * 2,
				maliciousWorkerCount: attackerCount,
				sybilAttackerCount: attackerCount,
			},
		};
	}),
};

/** The six sweeps of section 10 of the design note. */
export const sweepDefinitions: SweepDefinition[] = [
	{
		sweepName: 'validation rate of a trusted worker',
		sweepPoints: [0.01, 0.02, 0.05, 0.1, 0.2].map((trustedValidationRate) => {
			return {
				pointName: trustedValidationRate.toFixed(2),
				parameters: {
					...baseParameters,
					trustedValidationRate: trustedValidationRate,
				},
			};
		}),
	},
	{
		sweepName: 'share of malicious workers',
		sweepPoints: [0, 1, 3, 6, 12].map((maliciousWorkerCount) => {
			return {
				pointName: `${maliciousWorkerCount} of 28 workers`,
				parameters: {
					...baseParameters,
					honestWorkerCount: 22 - maliciousWorkerCount,
					maliciousWorkerCount: maliciousWorkerCount,
				},
			};
		}),
	},
	{
		sweepName: 'initial trust',
		sweepPoints: [-5, 0, 5, 10, 20].map((initialTrust) => {
			return {
				pointName: initialTrust.toFixed(0),
				parameters: {
					...baseParameters,
					initialTrust: initialTrust,
				},
			};
		}),
	},
	{
		sweepName: 'penalty',
		sweepPoints: [
			'small reduction',
			'strong reduction',
			'reset',
			'suspension',
			'credit confiscation',
		].map((penaltyPolicyName) => {
			return {
				pointName: penaltyPolicyName,
				parameters: {
					...baseParameters,
					penaltyPolicyName: penaltyPolicyName as SimulationParameters['penaltyPolicyName'],
				},
			};
		}),
	},
	{
		sweepName: 'tasks asked for per tick',
		sweepPoints: [2, 4, 6, 8, 10].map((tasksPerTick) => {
			return {
				pointName: `${tasksPerTick} tasks for 28 accounts`,
				parameters: {
					...baseParameters,
					tasksPerTick: tasksPerTick,
				},
			};
		}),
	},
	{
		sweepName: 'deficit allowed to a new account',
		sweepPoints: [1, 3, 5, 10, 20].map((allowedDeficit) => {
			return {
				pointName: `${allowedDeficit} credits`,
				parameters: {
					...baseParameters,
					allowedInitialDeficit: allowedDeficit,
					allowedDeficitAfterContribution: Math.max(allowedDeficit, 5),
				},
			};
		}),
	},
	{
		sweepName: 'pricing error',
		sweepPoints: [0.01, 0.05, 0.1, 0.2, 0.3].map((pricingErrorRatio) => {
			return {
				pointName: `${(pricingErrorRatio * 100).toFixed(0)} percent`,
				parameters: {
					...baseParameters,
					pricingErrorRatio: pricingErrorRatio,
				},
			};
		}),
	},
];
