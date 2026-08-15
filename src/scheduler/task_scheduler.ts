import type { Device } from '../types/device_types.js';
import type { RandomNumberFn } from '../types/random_types.js';
import type { Task, TaskAssignment } from '../types/task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TaskScheduler — gives each task to a device, so that no worker selects its own task
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values the scheduler needs to assign a task. */
export type TaskSchedulerOptions = {
	/** Every device able to execute a task. */
	devices: Device[];
	/** The source of randomness, so a simulation can reproduce a run exactly. */
	randomNumberFn: RandomNumberFn;
};

/**
 * The assignment of tasks to devices.
 *
 * The scheduler chooses the device, and a worker therefore never selects the task it executes. This removes the
 * arbitrage of section 12.7 of the design note, where every worker would pick the task type that happens to be the
 * most profitable on its own hardware.
 */
export class TaskScheduler {
	/** Every device able to execute a task. */
	private _devices: Device[];

	/** The source of randomness. */
	private _randomNumberFn: RandomNumberFn;

	/**
	 * @param taskSchedulerOptions The devices able to execute a task and the source of randomness.
	 */
	constructor(taskSchedulerOptions: TaskSchedulerOptions) {
		this._devices = taskSchedulerOptions.devices;
		this._randomNumberFn = taskSchedulerOptions.randomNumberFn;
	}

	/**
	 * Assigns one task to one device chosen at random.
	 *
	 * @param task The task to assign.
	 * @returns The assignment of the task to a device.
	 * @throws When no device is able to execute the task.
	 */
	assign(task: Task): TaskAssignment {
		if (this._devices.length === 0) {
			throw new Error('no device is able to execute a task');
		}
		const deviceIndex = Math.floor(this._randomNumberFn() * this._devices.length);
		const device = this._devices[deviceIndex];
		if (device === undefined) {
			throw new Error(`the device index ${deviceIndex} is outside the list of devices`);
		}
		return {
			taskId: task.taskId,
			accountId: device.accountId,
			deviceId: device.deviceId,
			isValidationCopy: false,
		};
	}
}
