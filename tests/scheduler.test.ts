import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { TaskScheduler } from '../src/scheduler/task_scheduler.js';
import { ValidatorSelector } from '../src/scheduler/validator_selector.js';
import type { Device } from '../src/types/device_types.js';
import type { Task } from '../src/types/task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SchedulerTest — who is given a task, and who is asked to settle a disagreement
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The task every test of this file assigns. */
const task: Task = {
	taskId: 'task-1',
	taskTypeName: 'a task',
	requesterAccountId: 'a requester',
	createdAtTick: 0,
};

/**
 * Builds one device owned by one account.
 *
 * @param accountId Identifier of the account that owns it.
 * @returns The device.
 */
function buildDevice(accountId: string): Device {
	return {
		deviceId: `${accountId}-device`,
		accountId: accountId,
		hardwareProfileName: 'a machine',
		speedFactor: 1,
	};
}

/** Three devices, one per account. */
const devices = [buildDevice('alice'), buildDevice('bob'), buildDevice('charlie')];

test('a task is assigned to a device, and never marked as a duplicated copy', () => {
	const taskScheduler = new TaskScheduler({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
	});

	const taskAssignment = taskScheduler.assign(task);

	Assert.equal(taskAssignment?.accountId, 'alice');
	Assert.equal(taskAssignment?.deviceId, 'alice-device');
	Assert.equal(taskAssignment?.isValidationCopy, false);
});

test('a device that receives no task right now is not assigned one', () => {
	const taskScheduler = new TaskScheduler({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
		isDeviceEligibleFn: (device) => {
			return device.accountId !== 'alice';
		},
	});

	Assert.equal(taskScheduler.assign(task)?.accountId, 'bob');
});

test('a task nobody may execute is not assigned at all', () => {
	const taskScheduler = new TaskScheduler({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
		isDeviceEligibleFn: () => {
			return false;
		},
	});

	Assert.equal(taskScheduler.assign(task), undefined);
});

test('a scheduler with no device at all refuses to pretend otherwise', () => {
	const taskScheduler = new TaskScheduler({
		devices: [],
		randomNumberFn: () => {
			return 0;
		},
	});

	Assert.throws(() => {
		taskScheduler.assign(task);
	}, /no device/);
});

test('a duplicated copy never goes to an account that already returned a result', () => {
	const validatorSelector = new ValidatorSelector({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
	});

	const taskAssignment = validatorSelector.chooseValidator(task, ['alice']);

	Assert.equal(taskAssignment?.accountId, 'bob');
	Assert.equal(taskAssignment?.isValidationCopy, true);
});

test('a duplicated copy is not created when every account is excluded', () => {
	const validatorSelector = new ValidatorSelector({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
	});

	Assert.equal(validatorSelector.chooseValidator(task, ['alice', 'bob', 'charlie']), undefined);
});

test('the worker settling a disagreement is drawn from the more trusted candidates', () => {
	const trustByAccountId = new Map([
		['alice', 0],
		['bob', 5],
		['charlie', 100],
	]);
	const validatorSelector = new ValidatorSelector({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
		workerTrustFn: (accountId) => {
			return trustByAccountId.get(accountId) ?? 0;
		},
		trustedArbiterShare: 0.34,
	});

	Assert.equal(validatorSelector.chooseArbiter(task, [])?.accountId, 'charlie');
	Assert.equal(validatorSelector.chooseArbiter(task, ['charlie'])?.accountId, 'bob');
});

test('an arbiter is still found when the trusted share leaves less than one candidate', () => {
	const validatorSelector = new ValidatorSelector({
		devices: devices,
		randomNumberFn: () => {
			return 0;
		},
		workerTrustFn: () => {
			return 0;
		},
		trustedArbiterShare: 0,
	});

	Assert.notEqual(validatorSelector.chooseArbiter(task, []), undefined);
});
