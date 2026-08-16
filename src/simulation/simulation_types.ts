import type { AccountId } from '../types/account_types.js';
import type { BenchmarkEnvironment } from '../types/benchmark_types.js';
import type { DeviceId } from '../types/device_types.js';
import type { SettlementPolicyName } from '../ledger/settlement_policy.js';
import type { PenaltyPolicyName } from '../trust/trust_policy.js';
import type { TaskTypeName } from '../types/task_types.js';
import type { ResolutionMethodName } from '../validation/disagreement_resolver.js';
import type { ComparisonStrategy, ComparisonStrategyName } from '../validation/result_comparator.js';
import type { WorkerBehaviorName } from './worker_behavior.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SimulationTypes — what a run receives and what a run measures
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * The cost one task type truly takes on the reference machine.
 *
 * Only the simulation knows this value. The network never reads it: the network reads the value the benchmark
 * measured, which carries the measurement noise of the run.
 */
export type TrueTaskCost = {
	/** Name of the task type. */
	taskTypeName: TaskTypeName;
	/** Cost the task type truly takes on the reference machine, in seconds. */
	trueCostSeconds: number;
};

/** The comparison one task type uses, instead of the default one. */
export type TaskTypeComparisonStrategy = {
	/** Name of the task type. */
	taskTypeName: TaskTypeName;
	/** The comparison used for the results of that task type. */
	comparisonStrategy: ComparisonStrategy;
};

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
	/** Share of the tasks duplicated for a worker at or below the untrusted threshold, between 0 and 1. */
	untrustedValidationRate: number;
	/** Share of the tasks duplicated for a worker at or above the trusted threshold, between 0 and 1. */
	trustedValidationRate: number;
	/** Share of the tasks duplicated for a worker that returned an invalid result recently, between 0 and 1. */
	recentErrorValidationRate: number;
	/** Trust score at or below which a worker is treated as new and is verified often. */
	untrustedThreshold: number;
	/** Number of ticks an invalid result stays recent for, and keeps the worker under close verification. */
	recentErrorTickCount: number;
	/** The comparison used by every task type that has no comparison of its own. */
	defaultComparisonStrategy: ComparisonStrategy;
	/** The comparison of each task type that needs one of its own. */
	taskTypeComparisonStrategies: TaskTypeComparisonStrategy[];
	/** The way a disagreement between workers is settled. */
	resolutionMethodName: ResolutionMethodName;
	/** The weight of a vote carried by a worker with no trust at all, used by the `trust weighted` method. */
	minimumVoteWeight: number;
	/** Share of the candidates, ordered from the most trusted, the worker settling a disagreement is drawn from. */
	trustedArbiterShare: number;
	/** Number of numbers a result is made of. */
	resultVectorLength: number;
	/**
	 * Largest share by which one number of a genuine result may miss the true number. This is the non-determinism of
	 * section 12.1 of the design note: two correct executions of the same task do not return the same value.
	 */
	honestNoiseRatio: number;
	/** Number of honest workers. */
	honestWorkerCount: number;
	/** Number of unstable workers. */
	unstableWorkerCount: number;
	/** Likelihood that an unstable worker returns a wrong value, between 0 and 1. */
	unstableErrorProbability: number;
	/** Number of malicious workers. */
	maliciousWorkerCount: number;
	/** Number of Sybil attackers, each of which abandons its account for a new one once it is caught enough. */
	sybilAttackerCount: number;
	/** Trust at or below which a Sybil attacker abandons its account and opens a freshly created one. */
	sybilAbandonTrust: number;
	/** The way a payment is recorded and made spendable. */
	settlementPolicyName: SettlementPolicyName;
	/** Number of ticks a payment stays unspendable under the `provisional credit` policy. */
	provisionalTickCount: number;
	/** Number of ticks between two settlements under the `delayed settlement` policy. */
	settlementPeriodTickCount: number;
	/** How far below zero an account that has not contributed enough yet may go, in credits. */
	allowedInitialDeficit: number;
	/** How far below zero an account that has contributed enough may go, in credits. */
	allowedDeficitAfterContribution: number;
	/** Amount an account has to have earned before the larger deficit is opened to it, in credits. */
	requiredContribution: number;
	/** What creating one account costs whoever creates it, written in credits. */
	identityCost: number;
	/** Name of the proof the network asks for before it opens an account. */
	identityProofName: string;
	/** Every task type the network knows, with the cost each one truly takes on the reference machine. */
	taskCosts: TrueTaskCost[];
	/** Name of the task type used as the reference, against which every other task type is compared. */
	referenceTaskTypeName: TaskTypeName;
	/** Number of credits paid for one reference task. */
	creditPerReferenceTask: number;
	/** The environment the benchmark is measured in, and that the network runs in. */
	benchmarkEnvironment: BenchmarkEnvironment;
	/** Number of runs measured for every task type, to smooth the measurement noise. */
	benchmarkRunCount: number;
	/**
	 * Largest share by which one measured run can miss the true cost, between 0 and 1. A value of 0.1 spreads every
	 * measured run between nine tenths and eleven tenths of the true cost, which is the pricing error of section 10
	 * of the design note.
	 */
	pricingErrorRatio: number;
	/** Trust score given to an account the first time it is seen. */
	initialTrust: number;
	/** Amount added to the trust score when a result is confirmed by another worker. */
	trustIncreaseOnConfirmedResult: number;
	/** Amount removed from the trust score when a result is contradicted by other workers. */
	trustDecreaseOnInvalidResult: number;
	/** Number the ordinary reduction is multiplied by under the `strong reduction` penalty. */
	strongPenaltyFactor: number;
	/** The penalty applied to a worker whose result was contradicted. */
	penaltyPolicyName: PenaltyPolicyName;
	/** Number of ticks a worker receives no task for under the `suspension` penalty. */
	suspensionTickCount: number;
	/**
	 * Share of the combined trust that comes from the device, between 0 and 1. A value of 0 gives a new device the
	 * whole trust of its account, and a value of 1 makes a new device earn its trust alone.
	 */
	deviceTrustWeight: number;
	/**
	 * Tick at which every worker adds a second, unknown device to its account, or `undefined` when no worker ever
	 * does. This is the moment the question of section 12.3 of the design note becomes measurable: a trusted account
	 * meets a device that earned nothing, and a caught account meets one too.
	 */
	secondDeviceTick: number | undefined;
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
	/** Combined trust of the worker at the end of the run. */
	trust: number;
	/** Trust of the account at the end of the run. */
	accountTrust: number;
	/** Trust of the device at the end of the run. */
	deviceTrust: number;
	/** Number of results of the worker that another worker confirmed. */
	confirmedResultCount: number;
	/** Number of results of the worker that other workers contradicted. */
	invalidResultCount: number;
	/** Tick at which the worker first reached the trusted threshold, or `undefined` when it never did. */
	firstTrustedTick: number | undefined;
};

/** What one task type was paid, compared with what it was worth. */
export type TaskTypePricingSummary = {
	/** Name of the task type. */
	taskTypeName: TaskTypeName;
	/** Cost the task type truly takes on the reference machine, in seconds. */
	trueCostSeconds: number;
	/** Cost the benchmark measured for the task type, in seconds. */
	measuredCostSeconds: number;
	/** Price the network pays for the task type, in credits, computed from the measured cost. */
	price: number;
	/** Price the network would pay if the benchmark had measured the true cost, in credits. */
	truePrice: number;
	/**
	 * The price divided by the true price. A value of 1 pays exactly the work performed, a value above 1 pays more
	 * than the work performed, and the task type is then more profitable than the others.
	 */
	profitabilityRatio: number;
};

/** How the comparison of one task type behaved during the run. */
export type TaskTypeValidationSummary = {
	/** Name of the task type. */
	taskTypeName: TaskTypeName;
	/** The comparison used for the results of that task type. */
	comparisonStrategyName: ComparisonStrategyName;
	/** Number of times two results of that task type were compared. */
	comparisonCount: number;
	/** Number of those comparisons that ended in a disagreement. */
	disagreementCount: number;
	/**
	 * Number of results of that task type that were genuinely computed and rejected anyway. This is the price an
	 * honest worker pays for a comparison that is stricter than the machine it runs on.
	 */
	genuineResultRejectedCount: number;
};

/** How often one kind of worker was refused a task for lack of credits. */
export type RefusedTaskCount = {
	/** The behaviour of the workers that were refused. */
	behaviorName: WorkerBehaviorName;
	/** Number of tasks refused to workers of that behaviour. */
	refusedTaskCount: number;
};

/** What one device earned in trust, and when it joined the network. */
export type DeviceSummary = {
	/** Identifier of the device. */
	deviceId: DeviceId;
	/** Identifier of the account that owns the device. */
	accountId: AccountId;
	/** The behaviour of the worker that owns the device. */
	behaviorName: WorkerBehaviorName;
	/** Trust of the device at the end of the run. */
	deviceTrust: number;
	/** Trust of the account that owns the device, at the end of the run. */
	accountTrust: number;
	/** The trust the worker is judged with when it uses this device, at the end of the run. */
	combinedTrust: number;
	/** Tick at which the device joined the network. */
	addedAtTick: number;
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
	/** Number of executions asked for to settle a disagreement, which is the cost of the third opinion. */
	arbiterExecutionCount: number;
	/**
	 * Average number of ticks between the first wrong result of an account and the first time the network rejected
	 * one of its results, or `undefined` when no account was ever caught.
	 */
	averageDetectionDelayTicks: number | undefined;
	/** Largest amount one single account was paid for wrong results before it was ever caught, in credits. */
	largestLossBeforeFirstRejection: number;
	/** Average number of ticks a worker waits between being paid and being able to spend. */
	averageSpendableDelayTicks: number;
	/** Share of the credits held by the richest tenth of the accounts, between 0 and 1. */
	creditShareOfRichestTenth: number;
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
	/** Number of tasks nobody executed, because every device was suspended at that moment. */
	unassignedTaskCount: number;
	/** Number of suspensions pronounced during the run. */
	suspensionCount: number;
	/** Amount of credits taken back from workers caught returning a wrong result, in credits. */
	confiscatedCredits: number;
	/**
	 * Amount of credits a settlement policy was still holding and that were dropped before ever being recorded,
	 * because the worker they were owed to was caught first, in credits. These credits never entered the ledger, so
	 * they are counted apart from the credits taken back from it.
	 */
	droppedHeldCredits: number;
	/** Number of tasks the network refused, because the account asking for them had not contributed enough. */
	refusedTaskCount: number;
	/** How many of those refusals each kind of worker met. */
	refusedTaskCounts: RefusedTaskCount[];
	/** Number of accounts ever opened, including the ones a Sybil attacker opened after abandoning another. */
	createdAccountCount: number;
	/** What opening every account cost, taken together, in credits. */
	totalIdentityCost: number;
	/** Number of accounts a Sybil attacker abandoned after the network stopped trusting them. */
	abandonedAccountCount: number;
	/**
	 * What every Sybil attacker kept, taken together: the credits its accounts hold at the end of the run, less what
	 * opening those accounts cost. A number at or below zero means the attack did not pay for itself.
	 */
	sybilAttackerProfit: number;
	/** Amount of credits still waiting to be recorded at the end of the run, in credits. */
	unsettledCredits: number;
	/** Total amount of credits created by the network during the run. */
	totalCreditsCreated: number;
	/** Total amount of credits consumed by the users of the network during the run. */
	totalCreditsConsumed: number;
	/**
	 * Amount of credits created only because the benchmark did not measure the true cost, in credits. A negative
	 * amount means the network paid its workers less than the work they performed.
	 */
	creditsCreatedByPricingError: number;
	/**
	 * The highest profitability ratio divided by the lowest one. A value of 1 means every task type pays exactly the
	 * work it costs, and a value above 1 measures how much a worker would gain by picking the task type that the
	 * benchmark over-measured, which is the arbitrage of section 12.7 of the design note.
	 */
	pricingArbitrageRatio: number;
	/** What each task type was paid, compared with what it was worth. */
	taskTypePricingSummaries: TaskTypePricingSummary[];
	/** What each worker earned, and how the network judged it. */
	workerSummaries: WorkerSummary[];
	/** What each device earned in trust, and when it joined the network. */
	deviceSummaries: DeviceSummary[];
	/** How the comparison of each task type behaved. */
	taskTypeValidationSummaries: TaskTypeValidationSummary[];
};
