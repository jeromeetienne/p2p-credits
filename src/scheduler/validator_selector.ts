import type { AccountId } from '../types/account_types.js';
import type { Device } from '../types/device_types.js';
import type { RandomNumberFn } from '../types/random_types.js';
import type { Task, TaskAssignment } from '../types/task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ValidatorSelector — chooses the worker that executes a duplicated copy of a task
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values the validator selector needs to choose a worker. */
export type ValidatorSelectorOptions = {
	/** Every device able to execute a task. */
	devices: Device[];
	/** The source of randomness, so a simulation can reproduce a run exactly. */
	randomNumberFn: RandomNumberFn;
};

/**
 * The choice of the worker that executes a duplicated copy of a task.
 *
 * The choice is random and it never selects an account that already returned a result for the same task. Two accounts
 * that try to confirm each other therefore cannot decide when they meet, which is the collusion problem of section
 * 12.2 of the design note. A preference for workers that appear unrelated will be added later.
 */
export class ValidatorSelector {
	/** Every device able to execute a task. */
	private _devices: Device[];

	/** The source of randomness. */
	private _randomNumberFn: RandomNumberFn;

	/**
	 * @param validatorSelectorOptions The devices able to execute a task and the source of randomness.
	 */
	constructor(validatorSelectorOptions: ValidatorSelectorOptions) {
		this._devices = validatorSelectorOptions.devices;
		this._randomNumberFn = validatorSelectorOptions.randomNumberFn;
	}

	/**
	 * Chooses one worker to execute a duplicated copy of a task.
	 *
	 * @param task The task to duplicate.
	 * @param excludedAccountIds The accounts that already returned a result for this task.
	 * @returns The assignment of the duplicated copy, or `undefined` when every account is excluded.
	 */
	chooseValidator(task: Task, excludedAccountIds: AccountId[]): TaskAssignment | undefined {
		const candidateDevices = this._devices.filter((device) => {
			return excludedAccountIds.includes(device.accountId) === false;
		});
		if (candidateDevices.length === 0) {
			return undefined;
		}
		const deviceIndex = Math.floor(this._randomNumberFn() * candidateDevices.length);
		const device = candidateDevices[deviceIndex];
		if (device === undefined) {
			return undefined;
		}
		return {
			taskId: task.taskId,
			accountId: device.accountId,
			deviceId: device.deviceId,
			isValidationCopy: true,
		};
	}
}
