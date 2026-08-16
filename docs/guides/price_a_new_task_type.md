# Price A New Task Type

A price is a normalized amount of work, and never a measured time. It is the ratio between what the task costs on the reference machine and what the reference task costs on the same machine. This is what stops a slow machine from being rewarded more than a fast machine for exactly the same useful work.

This guide adds one task type to a network that already has a reference task.

## 1. Measure the task type on the reference machines

Record several runs. One run is never enough, because a single measurement carries the noise of whatever else the reference machine was doing at that moment. The benchmark keeps the value in the middle of the recorded runs rather than their average, because one disturbed run moves an average and does not move a middle value.

```ts
import { ReferenceBenchmark } from '../../src/index.js';

const referenceBenchmark = new ReferenceBenchmark({
	environment: {
		modelName: 'the model of the network',
		runtimeName: 'the runtime of the network',
		precisionFormatName: 'float16',
		hardwareFamilyName: 'the family of hardware of the reference machines',
	},
	referenceTaskTypeName: 'reference task',
	minimumRunCount: 5,
});

referenceBenchmark.recordRun({
	taskTypeName: 'task C',
	referenceMachineName: 'reference machine 1',
	durationSeconds: 20.4,
});
```

Record at least `minimumRunCount` runs of the new task type, and at least that many of the reference task type. A task type that has fewer runs than the benchmark requires is simply left out of the prices, so that one task type still being measured never stops the network from pricing the ones that are ready.

## 2. Build the prices from the benchmark

```ts
import { TaskPricer } from '../../src/index.js';

const taskPricer = TaskPricer.fromReferenceBenchmark(referenceBenchmark, 1, currentEnvironment);

taskPricer.priceOf('task C');
```

The second argument is the number of credits paid for one reference task. The third is the environment the network runs in right now.

That third argument is the one that refuses the whole operation. If the model, the runtime, the precision format, or the family of hardware has changed since the benchmark was measured, `fromReferenceBenchmark` throws, and the message names every part that changed. A ratio between two measured durations only holds inside the environment the durations were measured in.

## 3. Say how the results of that task type are compared

A task type with a price and no comparison strategy falls back on the default one. If the new task type returns something the default strategy handles badly — a hash where the default is a numerical tolerance, or a vector of numbers where the default is an exact comparison — give it a strategy of its own.

[Comparing results that are not deterministic](compare_non_deterministic_results.md) is the guide for that choice.

## What to check afterwards

Run the first simulation and read the `price` part of the report. It puts the measured cost beside the true cost for every task type, and prints the arbitrage: the highest profitability ratio divided by the lowest one.

An arbitrage far above 1 means one task type pays more than the work it costs, and a worker able to pick its own task would only ever pick that one. In this library the scheduler assigns tasks, so no worker can act on the arbitrage — but the number still measures how wrong the benchmark is, and a badly wrong benchmark creates credits out of nothing.

## When to measure everything again

Whenever the model, the runtime, the kernels, the precision format, the family of hardware, or the characteristics of the tasks change. `RecalibrationCheck.isRecalibrationNeeded` answers the question directly, and `RecalibrationCheck.differencesBetween` names what moved.

## The exact signatures

- [The reference of the pricing](../reference/pricing.md).
