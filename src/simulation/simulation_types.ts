import type { AccountId } from '../types/account_types.js';
import type { TaskType } from '../types/task_types.js';
import type { WorkerBehaviorName } from './worker_behavior.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SimulationTypes — what a run receives and what a run measures
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Everything one run of the simulation needs.
 *
 * Every question the design note leaves open is a parameter here rather than a fixed choice in the code, because the
 * purpose of the simulation is to measure the answers before choosing them.
 */
export type SimulationParameters = {
	/** Seed of the run. The same seed always produces the same run. */
	randomSeed: number;
	/** Number of ticks the run lasts. */
	tickCount: number;
	/** Number of tasks submitted at every tick. */
	tasksPerTick: number;
	/** Share of the tasks that are duplicated to be validated, between 0 and 1. */
	validationRate: number;
	/** Number of honest workers. */
	honestWorkerCount: number;
	/** Number of unstable workers. */
	unstableWorkerCount: number;
	/** Likelihood that an unstable worker returns a wrong value, between 0 and 1. */
	unstableErrorProbability: number;
	/** Number of malicious workers. */
	maliciousWorkerCount: number;
	/** Every task type the network knows, with the cost each one takes on the reference machine. */
	taskTypes: TaskType[];
	/** Cost of the reference task, in seconds measured on the reference machine. */
	referenceTaskCostSeconds: number;
	/** Number of credits paid for one reference task. */
	creditPerReferenceTask: number;
	/** Trust score given to an account the first time it is seen. */
	initialTrust: number;
	/** Amount added to the trust score when a result is confirmed by another worker. */
	trustIncreaseOnConfirmedResult: number;
	/** Amount removed from the trust score when a result is contradicted by other workers. */
	trustDecreaseOnInvalidResult: number;
	/** Lowest value a trust score can reach. */
	minimumTrust: number;
	/** Highest value a trust score can reach. */
	maximumTrust: number;
	/** Trust score from which a worker is considered trusted, used to measure how long that takes. */
	trustedThreshold: number;
};

/** What one worker earned, and how the network judged it, at the end of a run. */
export type WorkerSummary = {
	/** Identifier of the account of the worker. */
	accountId: AccountId;
	/** The behaviour of the worker. */
	behaviorName: WorkerBehaviorName;
	/** Balance of the account at the end of the run, in credits. */
	balance: number;
	/** Trust score of the account at the end of the run. */
	trust: number;
	/** Number of results of the worker that another worker confirmed. */
	confirmedResultCount: number;
	/** Number of results of the worker that other workers contradicted. */
	invalidResultCount: number;
	/** Tick at which the worker first reached the trusted threshold, or `undefined` when it never did. */
	firstTrustedTick: number | undefined;
};

/**
 * What one run measured.
 *
 * The fields follow the four families of metrics of section 11 of the design note: security, cost, economics, and
 * user experience.
 */
export type SimulationReport = {
	/** Number of ticks the run lasted. */
	tickCount: number;
	/** Number of tasks submitted during the run. */
	taskCount: number;
	/** Number of executions performed, including the duplicated copies. */
	executionCount: number;
	/** Number of executions that were duplicated copies created to validate a first result. */
	validationCopyExecutionCount: number;
	/** Share of the executions that were spent on validation only, between 0 and 1. */
	validationOverheadRatio: number;
	/** Number of returned values that were not the correct value of the task. */
	wrongResultCount: number;
	/** Number of wrong values the network rejected. */
	wrongResultDetectedCount: number;
	/** Number of wrong values the network paid for without noticing. */
	wrongResultUndetectedCount: number;
	/** Amount of credits paid for wrong values, in credits. */
	creditsAwardedForWrongResults: number;
	/** Number of correct values the network rejected, which is the unfair penalty of an honest worker. */
	correctResultRejectedCount: number;
	/** Number of tasks where no value reached a majority, so nobody was paid. */
	unresolvedTaskCount: number;
	/** Total amount of credits created by the network during the run. */
	totalCreditsCreated: number;
	/** Total amount of credits consumed by the users of the network during the run. */
	totalCreditsConsumed: number;
	/** What each worker earned, and how the network judged it. */
	workerSummaries: WorkerSummary[];
};
