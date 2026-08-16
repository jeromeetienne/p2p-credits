# The Reference

The exact parameters of every name the library exports, for a reader who already knows what they want and has come to look it up. This folder holds only what `src/index.ts` exports, and it describes without explaining.

- [The public interface](public_interface.md) — every name `src/index.ts` exports, in one list.
- [Pricing](pricing.md) — `TaskPricer`, `ReferenceBenchmark`, `RecalibrationCheck`.
- [Trust](trust.md) — `TrustScoreBook`, `TrustPolicy`, `SuspensionBook`.
- [Validation](validation.md) — `ValidationSampler`, `ResultComparator`, `DisagreementResolver`.
- [Ledger](ledger.md) — `Ledger`, `SettlementPolicy`, `DeferredPaymentBook`.
- [Identity](identity.md) — `AccountRegistry`, `SpendingPolicy`.
- [Scheduler](scheduler.md) — `TaskScheduler`, `ValidatorSelector`.
- [Simulation](simulation.md) — `SimulationEngine`, `MetricsCollector`, `ParameterSweep`, and the rest of the run.
- [Metrics](metrics.md) — one entry per measured number.

The way to use a name is in [the guides](../guides/), and the reason behind a signature is in [the explanation](../explanation/).

The index of every document is [`docs/README.md`](../README.md).
