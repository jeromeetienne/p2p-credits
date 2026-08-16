# The Public Interface

`src/index.ts` is the one public interface of the library. Nothing outside the library ever imports a file inside a subfolder of `src/`, and an example that cannot reach something through this interface is a gap in the library rather than something to work around.

```ts
import { Ledger, ResultComparator, TaskPricer } from 'p2p-credits';
```

Inside this repository the same names are imported from `../../src/index.js`, because the examples run over the source and not over the compiled package.

## The shared shapes

Declared in `src/types/`, which holds no logic at all. Every one of them carries a Zod schema of the same name followed by `Schema`, except the two function shapes, which cannot be validated at run time.

| Name | What it is |
|---|---|
| `AccountId`, `Account` | The identity of a participant. The account holds the identity only: the balance is rebuilt from the ledger and the trust score is held by the trust module. |
| `DeviceId`, `Device` | A machine that executes tasks on behalf of an account, with its speed compared to the reference machine. A price never depends on that speed. |
| `TaskTypeName`, `TaskType` | A task type and the cost it takes on the reference machine. |
| `TaskId`, `Task` | One task submitted to the network. |
| `TaskAssignment` | The assignment of a task to one device, and whether the assignment is a duplicated copy. |
| `TaskResult` | The result one device returned for one task. |
| `ValidationStatus` | `pending`, `unverified`, `accepted`, or `rejected`. |
| `BenchmarkEnvironment`, `BenchmarkRun` | The environment a price was measured in, and one measured execution. |
| `LedgerEntryType`, `LedgerEntryDraft`, `LedgerEntry` | One movement of credits, before and after the ledger gives it an identifier. |
| `RandomNumberFn` | A function returning a number greater than or equal to 0 and lower than 1. |
| `WorkerTrustFn` | A function returning the trust of a worker, given an account identifier and a device identifier. |

The two function shapes are how a module reaches across a boundary it is not allowed to import across. `DeviceEligibilityFn`, declared with the device shapes, is the third.

## The classes, by the question they answer

| Question | Names | Document |
|---|---|---|
| What is this task worth? | `TaskPricer`, `ReferenceBenchmark`, `RecalibrationCheck` | [Pricing](pricing.md) |
| How much is this worker trusted? | `TrustScoreBook`, `TrustPolicy`, `SuspensionBook` | [Trust](trust.md) |
| Is this result correct? | `ValidationSampler`, `ResultComparator`, `DisagreementResolver` | [Validation](validation.md) |
| What movements of credits followed? | `Ledger`, `SettlementPolicy`, `DeferredPaymentBook` | [Ledger](ledger.md) |
| Who may open an account, and who may spend? | `AccountRegistry`, `SpendingPolicy` | [Identity](identity.md) |
| Who receives this task? | `TaskScheduler`, `ValidatorSelector` | [Scheduler](scheduler.md) |
| What happens when all of that is run together? | `SimulationEngine`, `MetricsCollector`, `ReportSummary`, `OperatingRegion`, `ParameterSweep`, `RandomGenerator`, `SimulationClock`, `WorkerBehavior` | [Simulation](simulation.md) |
| What did the run measure? | `SimulationReport`, `SimulationSummary` | [Metrics](metrics.md) |

## The two rules that hold everywhere

**The library never calls the global random number generator.** Every policy that needs randomness receives a `RandomNumberFn`. Without it, a difference measured between two sets of parameters could not be told apart from the noise of the draw.

**Every question the design note leaves open is a parameter, never a fixed choice in the code.** The settlement policy, the penalty, the comparison of two results, the weight of a device against its account, and the deficit allowed to a newcomer are all values passed in.

## The boundaries between the folders

Stated in full in [the README of the library](../../src/README.md) and held by the `CONTEXT.md` of each folder. In short: `pricing/`, `trust/`, and `validation/` never import from each other; `ledger/` and `identity/` import from none of the three; `simulation/` may import from every folder and no folder imports from `simulation/`.

[Three separate questions](../explanation/three_separate_questions.md) explains why.
