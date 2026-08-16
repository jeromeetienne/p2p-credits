# The Documents

Everything written about this repository that is not a `CONTEXT.md` and not a `README.md` of a folder of source code. A `CONTEXT.md` is written for whoever changes the code of that folder; a `README.md` is the entry point of the folder it sits in; the documents here are written for whoever reads the repository before changing anything in it.

The documents are split into four folders, and the split is by the question the reader is asking rather than by the part of the code the answer is about.

| Folder | The reader | What the folder holds |
|---|---|---|
| [`tutorial/`](tutorial/) | Has never run the repository. | Numbered lessons, followed in order, from the first command to a report that can be read. |
| [`guides/`](guides/) | Knows the vocabulary and has one task to perform. | One document per task, each one complete on its own. |
| [`reference/`](reference/) | Wants the exact parameters of one exported name. | One document per folder of `src/`, holding only what `src/index.ts` exports. |
| [`explanation/`](explanation/) | Wants to know why the design is the way it is. | The design note, and one document per decision the design note left open. |

## Where to start

- Never ran this repository: [`tutorial/01_first_simulation.md`](tutorial/01_first_simulation.md).
- Wants to know what the whole thing is for: [`explanation/design_note.md`](explanation/design_note.md), which is a copy of [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1).
- Wants to know what the repository measured: [`explanation/the_central_hypothesis.md`](explanation/the_central_hypothesis.md).
- Wants to call the library from another program: [`reference/public_interface.md`](reference/public_interface.md).

## The tutorial

1. [From nothing to a printed report](tutorial/01_first_simulation.md)
2. [Reading the report](tutorial/02_reading_the_report.md)
3. [Changing one parameter](tutorial/03_changing_one_parameter.md)

## The guides

- [Price a new task type](guides/price_a_new_task_type.md)
- [Choose a settlement policy](guides/choose_a_settlement_policy.md)
- [Choose a penalty](guides/choose_a_penalty.md)
- [Compare results that are not deterministic](guides/compare_non_deterministic_results.md)
- [Set the cost of an identity](guides/set_the_cost_of_an_identity.md)

## The reference

- [The public interface](reference/public_interface.md) — every name `src/index.ts` exports, in one list.
- [Pricing](reference/pricing.md) — `TaskPricer`, `ReferenceBenchmark`, `RecalibrationCheck`.
- [Trust](reference/trust.md) — `TrustScoreBook`, `TrustPolicy`, `SuspensionBook`.
- [Validation](reference/validation.md) — `ValidationSampler`, `ResultComparator`, `DisagreementResolver`.
- [Ledger](reference/ledger.md) — `Ledger`, `SettlementPolicy`, `DeferredPaymentBook`.
- [Identity](reference/identity.md) — `AccountRegistry`, `SpendingPolicy`.
- [Scheduler](reference/scheduler.md) — `TaskScheduler`, `ValidatorSelector`.
- [Simulation](reference/simulation.md) — `SimulationEngine`, `MetricsCollector`, `ParameterSweep`, and the rest of the run.
- [Metrics](reference/metrics.md) — one entry per measured number.

## The explanation

- [The design note](explanation/design_note.md)
- [Three separate questions](explanation/three_separate_questions.md)
- [When a payment becomes spendable](explanation/when_a_payment_becomes_spendable.md)
- [The account or the device](explanation/account_or_device.md)
- [The central hypothesis](explanation/the_central_hypothesis.md)
- [Prior art](explanation/prior_art.md)
