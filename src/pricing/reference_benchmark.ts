import { BenchmarkRunSchema, type BenchmarkEnvironment, type BenchmarkRun } from '../types/benchmark_types.js';
import type { TaskType, TaskTypeName } from '../types/task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ReferenceBenchmark — the cost of every task type, measured on the reference machines
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values the reference benchmark needs. */
export type ReferenceBenchmarkOptions = {
	/** The environment every run of this benchmark is measured in. */
	environment: BenchmarkEnvironment;
	/** Name of the task type used as the reference, against which every other task type is compared. */
	referenceTaskTypeName: TaskTypeName;
	/** Number of runs a task type needs before its measured cost is allowed to be read. */
	minimumRunCount: number;
};

/**
 * The cost of every task type, measured on the reference machines.
 *
 * The benchmark is the only place where a duration in seconds is ever read. Everything after it works with the ratio
 * between two of those durations, so the price of a task stays a normalized amount of work rather than a time.
 */
export class ReferenceBenchmark {
	/** The environment every run of this benchmark is measured in. */
	private _environment: BenchmarkEnvironment;

	/** Name of the task type used as the reference. */
	private _referenceTaskTypeName: TaskTypeName;

	/** Number of runs a task type needs before its measured cost is allowed to be read. */
	private _minimumRunCount: number;

	/** Every recorded run, indexed by the name of the measured task type. */
	private _runsByTaskTypeName = new Map<TaskTypeName, BenchmarkRun[]>();

	/**
	 * @param referenceBenchmarkOptions The environment, the reference task type, and the number of runs required.
	 */
	constructor(referenceBenchmarkOptions: ReferenceBenchmarkOptions) {
		this._environment = referenceBenchmarkOptions.environment;
		this._referenceTaskTypeName = referenceBenchmarkOptions.referenceTaskTypeName;
		this._minimumRunCount = referenceBenchmarkOptions.minimumRunCount;
	}

	/**
	 * Records one measured execution of one task type on one reference machine.
	 *
	 * The run is checked against its schema before it is kept, because a duration at or below zero is not a
	 * measurement, and a price read from it would be at or below zero as well.
	 *
	 * @param benchmarkRun The measured run.
	 * @returns Nothing.
	 * @throws When the run does not hold a positive duration and the two names a measurement needs.
	 */
	recordRun(benchmarkRun: BenchmarkRun): void {
		BenchmarkRunSchema.parse(benchmarkRun);
		const benchmarkRuns = this._runsByTaskTypeName.get(benchmarkRun.taskTypeName) ?? [];
		benchmarkRuns.push(benchmarkRun);
		this._runsByTaskTypeName.set(benchmarkRun.taskTypeName, benchmarkRuns);
	}

	/**
	 * Returns the environment every run of this benchmark was measured in.
	 *
	 * @returns The environment of the benchmark.
	 */
	environment(): BenchmarkEnvironment {
		return this._environment;
	}

	/**
	 * Returns the name of the task type used as the reference.
	 *
	 * @returns The name of the reference task type.
	 */
	referenceTaskTypeName(): TaskTypeName {
		return this._referenceTaskTypeName;
	}

	/**
	 * Returns the number of runs recorded for one task type.
	 *
	 * @param taskTypeName Name of the task type.
	 * @returns The number of recorded runs.
	 */
	runCountOf(taskTypeName: TaskTypeName): number {
		return this._runsByTaskTypeName.get(taskTypeName)?.length ?? 0;
	}

	/**
	 * Returns the measured cost of one task type.
	 *
	 * The value kept is the one in the middle of the recorded runs, and not their average, because one run that was
	 * disturbed by something else running on the reference machine moves an average and does not move a middle value.
	 *
	 * @param taskTypeName Name of the task type.
	 * @returns The measured cost, in seconds.
	 * @throws When the task type has fewer recorded runs than the benchmark requires.
	 */
	measuredCostSecondsOf(taskTypeName: TaskTypeName): number {
		const benchmarkRuns = this._runsByTaskTypeName.get(taskTypeName) ?? [];
		if (benchmarkRuns.length < this._minimumRunCount) {
			throw new Error(
				`the task type "${taskTypeName}" has ${benchmarkRuns.length} runs, `
					+ `and the benchmark requires ${this._minimumRunCount}`,
			);
		}
		const durations = benchmarkRuns.map((benchmarkRun) => {
			return benchmarkRun.durationSeconds;
		});
		return ReferenceBenchmark._middleValueOf(durations);
	}

	/**
	 * Returns the measured cost of the reference task type.
	 *
	 * @returns The measured cost of the reference task type, in seconds.
	 */
	referenceTaskCostSeconds(): number {
		return this.measuredCostSecondsOf(this._referenceTaskTypeName);
	}

	/**
	 * Returns every task type measured enough times, in the shape the pricer expects.
	 *
	 * A task type still being measured is left out rather than made to throw, because one task type whose runs are not
	 * all collected yet must not stop the network from pricing the task types that are ready. The reference task type
	 * is the exception: `referenceTaskCostSeconds` still throws when it is not measured enough, because without it no
	 * price can be read at all.
	 *
	 * @returns The task types that have at least the number of runs the benchmark requires.
	 */
	measuredTaskTypes(): TaskType[] {
		const taskTypes: TaskType[] = [];
		for (const taskTypeName of this._runsByTaskTypeName.keys()) {
			if (this.runCountOf(taskTypeName) < this._minimumRunCount) {
				continue;
			}
			taskTypes.push({
				taskTypeName: taskTypeName,
				referenceCostSeconds: this.measuredCostSecondsOf(taskTypeName),
			});
		}
		return taskTypes;
	}

	/**
	 * Returns the value in the middle of a list of numbers, which is the average of the two middle values when the
	 * list holds an even number of them.
	 *
	 * @param values The numbers to read.
	 * @returns The value in the middle.
	 * @throws When the list is empty.
	 */
	private static _middleValueOf(values: number[]): number {
		if (values.length === 0) {
			throw new Error('cannot read the middle value of an empty list');
		}
		const sortedValues = [...values].sort((valueA, valueB) => {
			return valueA - valueB;
		});
		const middleIndex = Math.floor(sortedValues.length / 2);
		const higherValue = sortedValues[middleIndex];
		if (higherValue === undefined) {
			throw new Error(`the index ${middleIndex} is outside the list of ${sortedValues.length} values`);
		}
		if (sortedValues.length % 2 === 1) {
			return higherValue;
		}
		const lowerValue = sortedValues[middleIndex - 1];
		if (lowerValue === undefined) {
			throw new Error(`the index ${middleIndex - 1} is outside the list of ${sortedValues.length} values`);
		}
		return (lowerValue + higherValue) / 2;
	}
}
