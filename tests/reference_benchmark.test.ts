import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { ReferenceBenchmark } from '../src/pricing/reference_benchmark.js';
import type { BenchmarkEnvironment } from '../src/types/benchmark_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ReferenceBenchmarkTest — the cost a benchmark keeps out of several measured runs
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The environment every benchmark of this file is measured in. */
const environment: BenchmarkEnvironment = {
	modelName: 'a model',
	runtimeName: 'a runtime',
	precisionFormatName: 'float16',
	hardwareFamilyName: 'a hardware family',
};

/**
 * Builds a benchmark and records the given durations for one task type.
 *
 * @param taskTypeName Name of the measured task type.
 * @param durations The duration of every run, in seconds.
 * @param minimumRunCount Number of runs a task type needs before its cost can be read.
 * @returns The benchmark holding those runs.
 */
function buildBenchmark(
	taskTypeName: string,
	durations: number[],
	minimumRunCount = 1,
): ReferenceBenchmark {
	const referenceBenchmark = new ReferenceBenchmark({
		environment: environment,
		referenceTaskTypeName: 'reference task',
		minimumRunCount: minimumRunCount,
	});
	for (const durationSeconds of durations) {
		referenceBenchmark.recordRun({
			taskTypeName: taskTypeName,
			referenceMachineName: 'a reference machine',
			durationSeconds: durationSeconds,
		});
	}
	return referenceBenchmark;
}

test('the measured cost is the value in the middle of an odd number of runs', () => {
	const referenceBenchmark = buildBenchmark('reference task', [9, 10, 11]);

	Assert.equal(referenceBenchmark.measuredCostSecondsOf('reference task'), 10);
});

test('the measured cost is the average of the two middle values of an even number of runs', () => {
	const referenceBenchmark = buildBenchmark('reference task', [9, 10, 12, 13]);

	Assert.equal(referenceBenchmark.measuredCostSecondsOf('reference task'), 11);
});

test('one run disturbed by something else moves an average and does not move the middle value', () => {
	const referenceBenchmark = buildBenchmark('reference task', [10, 10, 10, 10, 1000]);

	Assert.equal(referenceBenchmark.measuredCostSecondsOf('reference task'), 10);
});

test('the order the runs arrived in changes nothing', () => {
	const inOneOrder = buildBenchmark('reference task', [13, 9, 12, 10]);
	const inAnother = buildBenchmark('reference task', [10, 12, 13, 9]);

	Assert.equal(
		inOneOrder.measuredCostSecondsOf('reference task'),
		inAnother.measuredCostSecondsOf('reference task'),
	);
});

test('a task type with too few runs has no cost, and asking for it throws', () => {
	const referenceBenchmark = buildBenchmark('reference task', [10, 10], 3);

	Assert.equal(referenceBenchmark.runCountOf('reference task'), 2);
	Assert.throws(() => {
		referenceBenchmark.measuredCostSecondsOf('reference task');
	}, /requires 3/);
});

test('a task type nobody measured has no cost either', () => {
	const referenceBenchmark = buildBenchmark('reference task', [10]);

	Assert.equal(referenceBenchmark.runCountOf('task A'), 0);
	Assert.throws(() => {
		referenceBenchmark.measuredCostSecondsOf('task A');
	});
});

test('every measured task type is handed on with its measured cost', () => {
	const referenceBenchmark = buildBenchmark('reference task', [10]);
	referenceBenchmark.recordRun({
		taskTypeName: 'task A',
		referenceMachineName: 'a reference machine',
		durationSeconds: 30,
	});

	Assert.deepEqual(referenceBenchmark.measuredTaskTypes(), [
		{
			taskTypeName: 'reference task',
			referenceCostSeconds: 10,
		},
		{
			taskTypeName: 'task A',
			referenceCostSeconds: 30,
		},
	]);
	Assert.equal(referenceBenchmark.referenceTaskCostSeconds(), 10);
});
