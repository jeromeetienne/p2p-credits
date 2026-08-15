import type { BenchmarkEnvironment } from '../types/benchmark_types.js';
import type { TaskType, TaskTypeName } from '../types/task_types.js';
import { RecalibrationCheck } from './recalibration_check.js';
import type { ReferenceBenchmark } from './reference_benchmark.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TaskPricer — turns the cost measured on the reference machine into a credit price
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values needed to turn a measured cost into a credit price. */
export type TaskPricerOptions = {
	/** Every task type the network knows, with the cost each one takes on the reference machine. */
	taskTypes: TaskType[];
	/** Cost of the reference task, in seconds measured on the reference machine. */
	referenceTaskCostSeconds: number;
	/** Number of credits paid for one reference task. */
	creditPerReferenceTask: number;
};

/**
 * The price of a task, expressed in credits.
 *
 * The price is a normalized amount of work: it is the ratio between the cost of the task on the reference machine and
 * the cost of the reference task on the same machine. The price therefore never depends on the machine that executes
 * the task, so a slow machine is not rewarded more than a fast machine for the same useful work.
 */
export class TaskPricer {
	/** Cost of the reference task, in seconds measured on the reference machine. */
	private _referenceTaskCostSeconds: number;

	/** Number of credits paid for one reference task. */
	private _creditPerReferenceTask: number;

	/** Every known task type, indexed by its name. */
	private _taskTypeByName = new Map<TaskTypeName, TaskType>();

	/**
	 * @param taskPricerOptions The task types, the cost of the reference task, and the price of the reference task.
	 */
	constructor(taskPricerOptions: TaskPricerOptions) {
		this._referenceTaskCostSeconds = taskPricerOptions.referenceTaskCostSeconds;
		this._creditPerReferenceTask = taskPricerOptions.creditPerReferenceTask;
		for (const taskType of taskPricerOptions.taskTypes) {
			this._taskTypeByName.set(taskType.taskTypeName, taskType);
		}
	}

	/**
	 * Builds the prices from a reference benchmark, and refuses to build them when the benchmark was measured in
	 * another environment.
	 *
	 * @param referenceBenchmark The benchmark holding the measured cost of every task type.
	 * @param creditPerReferenceTask Number of credits paid for one reference task.
	 * @param currentEnvironment The environment the network runs in now.
	 * @returns The prices of every measured task type.
	 * @throws When the environment changed since the benchmark was measured, because the measured ratios then
	 *         describe a network that no longer exists.
	 */
	static fromReferenceBenchmark(
		referenceBenchmark: ReferenceBenchmark,
		creditPerReferenceTask: number,
		currentEnvironment: BenchmarkEnvironment,
	): TaskPricer {
		const environmentDifferences = RecalibrationCheck.differencesBetween(
			referenceBenchmark.environment(),
			currentEnvironment,
		);
		if (environmentDifferences.length > 0) {
			throw new Error(
				'the benchmark has to be measured again before its prices are used, because '
					+ RecalibrationCheck.describeDifferences(environmentDifferences),
			);
		}
		return new TaskPricer({
			taskTypes: referenceBenchmark.measuredTaskTypes(),
			referenceTaskCostSeconds: referenceBenchmark.referenceTaskCostSeconds(),
			creditPerReferenceTask: creditPerReferenceTask,
		});
	}

	/**
	 * Returns the price of one task of the given type.
	 *
	 * @param taskTypeName Name of the task type.
	 * @returns The price in credits.
	 * @throws When the task type is unknown, because a task with no price must never be executed.
	 */
	priceOf(taskTypeName: TaskTypeName): number {
		const taskType = this._taskTypeByName.get(taskTypeName);
		if (taskType === undefined) {
			throw new Error(`the task type "${taskTypeName}" has no measured cost, so it has no price`);
		}
		const normalizedCost = taskType.referenceCostSeconds / this._referenceTaskCostSeconds;
		return normalizedCost * this._creditPerReferenceTask;
	}

	/**
	 * Returns every task type the pricer knows.
	 *
	 * @returns The known task types.
	 */
	knownTaskTypes(): TaskType[] {
		return Array.from(this._taskTypeByName.values());
	}
}
