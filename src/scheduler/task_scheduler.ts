import type { Device, DeviceEligibilityFn } from '../types/device_types.js';
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
	/** Says whether a device receives tasks right now. Every device receives tasks when this is left out. */
	isDeviceEligibleFn?: DeviceEligibilityFn;
};

/**
 * The assignment of tasks to devices.
 *
 * The scheduler chooses the device, and a worker therefore never selects the task it executes. This removes the
 * arbitrage of section 12.7 of the design note, where every worker would pick the task type that happens to be the
 * most profitable on its own hardware.
 *
 * The account that requested a task never executes it either, because a task executed by the account that asked for
 * it pays that account exactly what it was debited and hands it the trust of a confirmed worker for nothing.
 */
export class TaskScheduler {
	/** Every device able to execute a task. */
	private _devices: Device[];

	/** The source of randomness. */
	private _randomNumberFn: RandomNumberFn;

	/** Says whether a device receives tasks right now. */
	private _isDeviceEligibleFn: DeviceEligibilityFn;

	/**
	 * @param taskSchedulerOptions The devices able to execute a task, the source of randomness, and the question
	 *        asked before a device is given a task.
	 */
	constructor(taskSchedulerOptions: TaskSchedulerOptions) {
		this._devices = taskSchedulerOptions.devices;
		this._randomNumberFn = taskSchedulerOptions.randomNumberFn;
		this._isDeviceEligibleFn = taskSchedulerOptions.isDeviceEligibleFn ?? (() => {
			return true;
		});
	}

	/**
	 * Assigns one task to one device chosen at random among the devices that receive tasks right now, leaving out
	 * every device of the account that requested the task.
	 *
	 * An account that executed its own task would be debited and paid the same amount, so it would gain trust and
	 * would satisfy the rule about contributing before consuming at no cost at all, and the result nobody else looked
	 * at would be its own.
	 *
	 * @param task The task to assign.
	 * @returns The assignment of the task to a device, or `undefined` when no other account receives tasks right now.
	 * @throws When the scheduler was built with no device at all.
	 */
	assign(task: Task): TaskAssignment | undefined {
		if (this._devices.length === 0) {
			throw new Error('no device is able to execute a task');
		}
		const eligibleDevices = this._devices.filter((candidateDevice) => {
			if (candidateDevice.accountId === task.requesterAccountId) {
				return false;
			}
			return this._isDeviceEligibleFn(candidateDevice);
		});
		if (eligibleDevices.length === 0) {
			return undefined;
		}
		const deviceIndex = Math.floor(this._randomNumberFn() * eligibleDevices.length);
		const device = eligibleDevices[deviceIndex];
		if (device === undefined) {
			return undefined;
		}
		return {
			taskId: task.taskId,
			accountId: device.accountId,
			deviceId: device.deviceId,
			isValidationCopy: false,
		};
	}
}
