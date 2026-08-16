# Reference: Pricing

What a task is worth. The price is a normalized amount of work rather than a measured time, so a slow machine is not rewarded more than a fast machine for exactly the same useful work.

Everything here comes from `src/pricing/`.

## `TaskPricer`

The price of a task, in credits.

### `new TaskPricer(taskPricerOptions: TaskPricerOptions)`

`TaskPricerOptions` holds:

- `taskTypes: TaskType[]` — every task type the network knows, with the cost each one takes on the reference machine.
- `referenceTaskCostSeconds: number` — the cost of the reference task, in seconds measured on the reference machine.
- `creditPerReferenceTask: number` — the number of credits paid for one reference task.

### `TaskPricer.fromReferenceBenchmark(referenceBenchmark, creditPerReferenceTask, currentEnvironment): TaskPricer`

Builds the prices from a measured benchmark. Throws when the environment changed since the benchmark was measured, and the message names every part that changed, because the measured ratios then describe a network that no longer exists.

### `priceOf(taskTypeName: TaskTypeName): number`

The price in credits, which is the cost of the task type on the reference machine divided by the cost of the reference task, multiplied by the credits paid for one reference task. Throws when the task type is unknown, because a task with no price must never be executed.

### `knownTaskTypes(): TaskType[]`

Every task type the pricer knows.

## `ReferenceBenchmark`

The cost of every task type, measured on the reference machines. This is the only place in the library where a duration in seconds is ever read.

### `new ReferenceBenchmark(referenceBenchmarkOptions: ReferenceBenchmarkOptions)`

`ReferenceBenchmarkOptions` holds:

- `environment: BenchmarkEnvironment` — the environment every run of this benchmark is measured in.
- `referenceTaskTypeName: TaskTypeName` — the task type every other one is compared against.
- `minimumRunCount: number` — how many runs a task type needs before its measured cost may be read.

### `recordRun(benchmarkRun: BenchmarkRun): void`

Records one measured execution. The run is checked against its schema first, because a duration at or below zero is not a measurement and a price read from it would be at or below zero as well.

### `measuredCostSecondsOf(taskTypeName: TaskTypeName): number`

The value in the middle of the recorded runs, and not their average: one run disturbed by something else running on the reference machine moves an average and does not move a middle value. Throws when the task type has fewer runs than the benchmark requires.

### `referenceTaskCostSeconds(): number`

The measured cost of the reference task type. Throws when the reference task type is not measured enough, because without it no price can be read at all.

### `measuredTaskTypes(): TaskType[]`

Every task type measured at least `minimumRunCount` times, in the shape the pricer expects. A task type still being measured is left out rather than made to throw, so that one unfinished measurement never stops the network from pricing the task types that are ready.

### `environment()`, `referenceTaskTypeName()`, `runCountOf(taskTypeName)`

The environment of the benchmark, the name of the reference task type, and the number of runs recorded for one task type.

## `RecalibrationCheck`

Says when a measured price stopped describing the network. Every method is static and nothing is stored.

### `RecalibrationCheck.differencesBetween(measuredEnvironment, currentEnvironment): EnvironmentDifference[]`

One entry per part of the environment that changed, and an empty list when nothing changed. `EnvironmentDifference` holds `partName`, which is `model`, `runtime`, `precision format`, or `hardware family`, together with the measured value and the current value.

### `RecalibrationCheck.isRecalibrationNeeded(measuredEnvironment, currentEnvironment): boolean`

True when at least one part of the environment changed.

### `RecalibrationCheck.describeDifferences(environmentDifferences): string`

The differences written as one sentence, to be shown when a price is refused.

## Related

- [Price a new task type](../guides/price_a_new_task_type.md)
- [The context of `/src/pricing`](../../src/pricing/CONTEXT.md)
