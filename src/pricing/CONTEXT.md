# Directory Context: `/src/pricing`

## Purpose
The price of a task, expressed in credits, computed from the cost the task takes on the reference machine.

## Key Exports & Entry Points
- `task_pricer.ts`: `TaskPricer.priceOf(taskTypeName)` returns the price of one task of that type.

## Rules
- The price is a normalized amount of work: the ratio between the cost of the task on the reference machine and the cost of the reference task on that same machine. The price never depends on the machine that executed the task, so a slow machine is never rewarded more than a fast machine for the same useful work.
- A task type with no measured cost has no price, and `priceOf` throws rather than inventing one, because a task with no price must never be executed.
- Nothing here imports from `trust/`, `validation/`, or `ledger/`.

## Background
- The normalized cost and the reference benchmark come from section 2 of [the design note](../../docs/design_note.md). The measurement of the benchmark itself, its recalibration, and the injection of a pricing error are milestone 2 of [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).
