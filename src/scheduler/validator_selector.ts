import type { AccountId } from '../types/account_types.js';
import type { Device, DeviceEligibilityFn } from '../types/device_types.js';
import type { RandomNumberFn } from '../types/random_types.js';
import type { Task, TaskAssignment } from '../types/task_types.js';
import type { WorkerTrustFn } from '../types/trust_types.js';

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
	/** Says whether a device receives tasks right now. Every device receives tasks when this is left out. */
	isDeviceEligibleFn?: DeviceEligibilityFn;
	/** The trust of a worker, used when a third source of truth is needed to settle a disagreement. */
	workerTrustFn?: WorkerTrustFn;
	/**
	 * Share of the candidates, ordered from the most trusted, an arbiter is drawn from, between 0 and 1. A value of
	 * 0.5 draws the arbiter at random among the more trusted half.
	 */
	trustedArbiterShare?: number;
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

	/** Says whether a device receives tasks right now. */
	private _isDeviceEligibleFn: DeviceEligibilityFn;

	/** The trust of a worker, used when a third source of truth is needed. */
	private _workerTrustFn: WorkerTrustFn;

	/** Share of the candidates, ordered from the most trusted, an arbiter is drawn from. */
	private _trustedArbiterShare: number;

	/**
	 * @param validatorSelectorOptions The devices able to execute a task, the source of randomness, and the question
	 *        asked before a device is given a duplicated copy.
	 */
	constructor(validatorSelectorOptions: ValidatorSelectorOptions) {
		this._devices = validatorSelectorOptions.devices;
		this._randomNumberFn = validatorSelectorOptions.randomNumberFn;
		this._isDeviceEligibleFn = validatorSelectorOptions.isDeviceEligibleFn ?? (() => {
			return true;
		});
		this._workerTrustFn = validatorSelectorOptions.workerTrustFn ?? (() => {
			return 0;
		});
		this._trustedArbiterShare = validatorSelectorOptions.trustedArbiterShare ?? 1;
	}

	/**
	 * Chooses one worker to execute a duplicated copy of a task.
	 *
	 * @param task The task to duplicate.
	 * @param excludedAccountIds The accounts that already returned a result for this task.
	 * @returns The assignment of the duplicated copy, or `undefined` when every account is excluded or set aside.
	 */
	chooseValidator(task: Task, excludedAccountIds: AccountId[]): TaskAssignment | undefined {
		const candidateDevices = this._candidateDevices(excludedAccountIds);
		return this._assignOneOf(task, candidateDevices);
	}

	/**
	 * Chooses one worker to settle a disagreement, drawn at random among the more trusted candidates.
	 *
	 * The draw stays random inside that group, because an arbiter that could be named in advance is an arbiter two
	 * colluding accounts can wait for.
	 *
	 * @param task The task the workers disagree about.
	 * @param excludedAccountIds The accounts that already returned a result for this task.
	 * @returns The assignment of the deciding copy, or `undefined` when every account is excluded or set aside.
	 */
	chooseArbiter(task: Task, excludedAccountIds: AccountId[]): TaskAssignment | undefined {
		const candidateDevices = this._candidateDevices(excludedAccountIds);
		if (candidateDevices.length === 0) {
			return undefined;
		}

		const devicesFromMostTrusted = [...candidateDevices].sort((deviceA, deviceB) => {
			return this._workerTrustFn(deviceB.accountId, deviceB.deviceId)
				- this._workerTrustFn(deviceA.accountId, deviceA.deviceId);
		});
		const keptCount = Math.max(1, Math.floor(devicesFromMostTrusted.length * this._trustedArbiterShare));
		return this._assignOneOf(task, devicesFromMostTrusted.slice(0, keptCount));
	}

	/**
	 * Returns the devices that may receive a copy of a task right now.
	 *
	 * @param excludedAccountIds The accounts that already returned a result for this task.
	 * @returns The devices that are neither excluded nor set aside.
	 */
	private _candidateDevices(excludedAccountIds: AccountId[]): Device[] {
		return this._devices.filter((device) => {
			if (excludedAccountIds.includes(device.accountId) === true) {
				return false;
			}
			return this._isDeviceEligibleFn(device);
		});
	}

	/**
	 * Draws one device at random out of a list and assigns the copy to it.
	 *
	 * @param task The task to duplicate.
	 * @param candidateDevices The devices to draw from.
	 * @returns The assignment of the duplicated copy, or `undefined` when the list is empty.
	 */
	private _assignOneOf(task: Task, candidateDevices: Device[]): TaskAssignment | undefined {
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
