import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { RecalibrationCheck } from '../src/pricing/recalibration_check.js';
import { ReferenceBenchmark } from '../src/pricing/reference_benchmark.js';
import { TaskPricer } from '../src/pricing/task_pricer.js';
import type { BenchmarkEnvironment } from '../src/types/benchmark_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TaskPricerTest — the credit price read from the cost on the reference machine
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The environment the benchmarks of this file are measured in. */
const measuredEnvironment: BenchmarkEnvironment = {
	modelName: 'a model',
	runtimeName: 'a runtime',
	precisionFormatName: 'float16',
	hardwareFamilyName: 'a hardware family',
};

test('a task worth three times the reference task costs three credits', () => {
	const taskPricer = new TaskPricer({
		taskTypes: [
			{
				taskTypeName: 'reference task',
				referenceCostSeconds: 10,
			},
			{
				taskTypeName: 'task A',
				referenceCostSeconds: 30,
			},
			{
				taskTypeName: 'task B',
				referenceCostSeconds: 5,
			},
		],
		referenceTaskCostSeconds: 10,
		creditPerReferenceTask: 1,
	});

	Assert.equal(taskPricer.priceOf('reference task'), 1);
	Assert.equal(taskPricer.priceOf('task A'), 3);
	Assert.equal(taskPricer.priceOf('task B'), 0.5);
});

test('a task type with no measured cost has no price', () => {
	const taskPricer = new TaskPricer({
		taskTypes: [],
		referenceTaskCostSeconds: 10,
		creditPerReferenceTask: 1,
	});

	Assert.throws(() => {
		taskPricer.priceOf('task A');
	}, /has no measured cost/);
});

test('the price is built from the benchmark when the environment has not changed', () => {
	const referenceBenchmark = new ReferenceBenchmark({
		environment: measuredEnvironment,
		referenceTaskTypeName: 'reference task',
		minimumRunCount: 1,
	});
	referenceBenchmark.recordRun({
		taskTypeName: 'reference task',
		referenceMachineName: 'a reference machine',
		durationSeconds: 10,
	});
	referenceBenchmark.recordRun({
		taskTypeName: 'task A',
		referenceMachineName: 'a reference machine',
		durationSeconds: 20,
	});

	const taskPricer = TaskPricer.fromReferenceBenchmark(referenceBenchmark, 1, measuredEnvironment);

	Assert.equal(taskPricer.priceOf('task A'), 2);
});

test('the price is refused when the network no longer runs what the benchmark measured', () => {
	const referenceBenchmark = new ReferenceBenchmark({
		environment: measuredEnvironment,
		referenceTaskTypeName: 'reference task',
		minimumRunCount: 1,
	});
	referenceBenchmark.recordRun({
		taskTypeName: 'reference task',
		referenceMachineName: 'a reference machine',
		durationSeconds: 10,
	});

	const currentEnvironment: BenchmarkEnvironment = {
		...measuredEnvironment,
		precisionFormatName: 'float8',
	};

	Assert.throws(() => {
		TaskPricer.fromReferenceBenchmark(referenceBenchmark, 1, currentEnvironment);
	}, /measured again/);
});

test('a recalibration is asked for once, and named, for every part that changed', () => {
	const currentEnvironment: BenchmarkEnvironment = {
		modelName: 'another model',
		runtimeName: 'a runtime',
		precisionFormatName: 'float8',
		hardwareFamilyName: 'a hardware family',
	};

	const environmentDifferences = RecalibrationCheck.differencesBetween(measuredEnvironment, currentEnvironment);

	Assert.equal(RecalibrationCheck.isRecalibrationNeeded(measuredEnvironment, currentEnvironment), true);
	Assert.deepEqual(
		environmentDifferences.map((environmentDifference) => {
			return environmentDifference.partName;
		}),
		['model', 'precision format'],
	);
});

test('nothing has to be measured again when nothing changed', () => {
	Assert.equal(RecalibrationCheck.isRecalibrationNeeded(measuredEnvironment, measuredEnvironment), false);
	Assert.deepEqual(RecalibrationCheck.differencesBetween(measuredEnvironment, measuredEnvironment), []);
});
