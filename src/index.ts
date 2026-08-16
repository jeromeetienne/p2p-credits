///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Index — the one public interface of the credit accounting library
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

export type { Account, AccountId } from './types/account_types.js';
export { AccountIdSchema, AccountSchema } from './types/account_types.js';

export type { Device, DeviceEligibilityFn, DeviceId } from './types/device_types.js';
export { DeviceIdSchema, DeviceSchema } from './types/device_types.js';

export type {
	Task,
	TaskAssignment,
	TaskId,
	TaskResult,
	TaskType,
	TaskTypeName,
	ValidationStatus,
} from './types/task_types.js';
export {
	TaskAssignmentSchema,
	TaskIdSchema,
	TaskResultSchema,
	TaskSchema,
	TaskTypeNameSchema,
	TaskTypeSchema,
	ValidationStatusSchema,
} from './types/task_types.js';

export type { BenchmarkEnvironment, BenchmarkRun } from './types/benchmark_types.js';
export { BenchmarkEnvironmentSchema, BenchmarkRunSchema } from './types/benchmark_types.js';

export type { LedgerEntry, LedgerEntryDraft, LedgerEntryType } from './types/ledger_types.js';
export {
	LedgerEntryDraftSchema,
	LedgerEntrySchema,
	LedgerEntryTypeSchema,
} from './types/ledger_types.js';

export type { RandomNumberFn } from './types/random_types.js';
export type { WorkerTrustFn } from './types/trust_types.js';

export { Ledger } from './ledger/ledger.js';
export { DeferredPaymentBook } from './ledger/deferred_payment_book.js';
export { SettlementPolicy, SettlementPolicyNameSchema } from './ledger/settlement_policy.js';
export type {
	SettlementDecision,
	SettlementPolicyName,
	SettlementPolicyOptions,
} from './ledger/settlement_policy.js';

export { AccountRegistry } from './identity/account_registry.js';
export type { AccountRegistryOptions } from './identity/account_registry.js';
export { SpendingPolicy } from './identity/spending_policy.js';
export type { SpendingDecision, SpendingPolicyOptions } from './identity/spending_policy.js';

export { TaskPricer } from './pricing/task_pricer.js';
export type { TaskPricerOptions } from './pricing/task_pricer.js';
export { ReferenceBenchmark } from './pricing/reference_benchmark.js';
export type { ReferenceBenchmarkOptions } from './pricing/reference_benchmark.js';
export { RecalibrationCheck } from './pricing/recalibration_check.js';
export type { EnvironmentDifference } from './pricing/recalibration_check.js';

export { TrustScoreBook } from './trust/trust_score.js';
export type { TrustChange, TrustScoreBookOptions } from './trust/trust_score.js';
export { TrustPolicy, PenaltyPolicyNameSchema } from './trust/trust_policy.js';
export type { PenaltyPolicyName, TrustOutcome, TrustPolicyOptions } from './trust/trust_policy.js';
export { SuspensionBook } from './trust/suspension_book.js';

export {
	ComparisonStrategyNameSchema,
	ComparisonStrategySchema,
	ResultComparator,
} from './validation/result_comparator.js';
export type {
	ComparisonOutcome,
	ComparisonStrategy,
	ComparisonStrategyName,
	ResultComparatorOptions,
} from './validation/result_comparator.js';
export { ValidationSampler } from './validation/validation_sampler.js';
export type { ValidationSamplerOptions } from './validation/validation_sampler.js';
export { DisagreementResolver, ResolutionMethodNameSchema } from './validation/disagreement_resolver.js';
export type { MajorityOutcome, ResolutionMethodName } from './validation/disagreement_resolver.js';

export { TaskScheduler } from './scheduler/task_scheduler.js';
export type { TaskSchedulerOptions } from './scheduler/task_scheduler.js';
export { ValidatorSelector } from './scheduler/validator_selector.js';
export type { ValidatorSelectorOptions } from './scheduler/validator_selector.js';

export { MetricsCollector } from './simulation/metrics_collector.js';
export type { ReportInputs } from './simulation/metrics_collector.js';
export { RandomGenerator } from './simulation/random_generator.js';
export { SimulationClock } from './simulation/simulation_clock.js';
export { SimulationEngine } from './simulation/simulation_engine.js';
export { ReportSummary } from './simulation/report_summary.js';
export type { SimulationSummary } from './simulation/report_summary.js';
export { OperatingRegion } from './simulation/operating_region.js';
export type { OperatingRegionLimits, OperatingRegionVerdict } from './simulation/operating_region.js';
export { ParameterSweep } from './simulation/parameter_sweep.js';
export type { SweepPoint, SweepResult } from './simulation/parameter_sweep.js';
export type {
	DeviceSummary,
	RefusedTaskCount,
	SimulationParameters,
	SimulationReport,
	TaskTypeComparisonStrategy,
	TaskTypePricingSummary,
	TaskTypeValidationSummary,
	TrueTaskCost,
	WorkerSummary,
} from './simulation/simulation_types.js';
export { WorkerBehavior, WorkerBehaviorNameSchema, WorkerProfileSchema } from './simulation/worker_behavior.js';
export type { ProducedResult, WorkerBehaviorName, WorkerProfile } from './simulation/worker_behavior.js';
