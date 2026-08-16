# Directory Context: `/src/pricing`

## Purpose
The price of a task, expressed in credits, computed from the cost the task takes on the reference machine.

## Key Exports & Entry Points
- `reference_benchmark.ts`: `ReferenceBenchmark` records the measured runs of every task type and returns the measured cost of each one.
- `task_pricer.ts`: `TaskPricer.priceOf(taskTypeName)` returns the price of one task of that type, and `TaskPricer.fromReferenceBenchmark(...)` builds the prices from a benchmark.
- `recalibration_check.ts`: `RecalibrationCheck.differencesBetween(...)` names the parts of the environment that changed since the benchmark was measured.

## Rules
- The price is a normalized amount of work: the ratio between the cost of the task on the reference machine and the cost of the reference task on that same machine. The price never depends on the machine that executed the task, so a slow machine is never rewarded more than a fast machine for the same useful work.
- The benchmark is the only place where a duration in seconds is ever read. Everything after it works with the ratio between two of those durations.
- A measured cost is the value in the middle of the recorded runs, not their average, because one disturbed run moves an average and does not move a middle value.
- A task type with fewer runs than the benchmark requires has no measured cost, and a task type with no measured cost has no price. Both throw rather than inventing a value, because a task with no price must never be executed.
- A price is refused when the model, the runtime, the precision format, or the family of hardware changed since the benchmark was measured, because the measured ratios then describe a network that no longer exists.
- Nothing here imports from `trust/`, `validation/`, or `ledger/`.

## Background
- The normalized cost, the reference benchmark, and the recalibration come from section 2 of [the design note](../../docs/explanation/design_note.md), and the questions left open about the number of reference machines and the drift of a benchmark come from section 12.6.
