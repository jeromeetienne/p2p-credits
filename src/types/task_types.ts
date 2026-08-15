import { z as Zod } from 'zod';

import { AccountIdSchema } from './account_types.js';
import { DeviceIdSchema } from './device_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TaskTypes — the unit of work, its type, its assignment, and its result
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the name of a task type. */
export const TaskTypeNameSchema = Zod.string().min(1);

/** Name of a task type. */
export type TaskTypeName = Zod.infer<typeof TaskTypeNameSchema>;

/** Schema of a task type and of its measured cost on the reference machine. */
export const TaskTypeSchema = Zod.object({
	/** Name of the task type. */
	taskTypeName: TaskTypeNameSchema,
	/** Cost of one task of this type, in seconds measured on the reference machine. */
	referenceCostSeconds: Zod.number().positive(),
});

/** A task type and the cost it takes on the reference machine. */
export type TaskType = Zod.infer<typeof TaskTypeSchema>;

/** Schema of the unique identifier of a task. */
export const TaskIdSchema = Zod.string().min(1);

/** Unique identifier of a task. */
export type TaskId = Zod.infer<typeof TaskIdSchema>;

/** Schema of one task submitted to the network. */
export const TaskSchema = Zod.object({
	/** Unique identifier of the task. */
	taskId: TaskIdSchema,
	/** Name of the type of the task, which determines its price. */
	taskTypeName: TaskTypeNameSchema,
	/** Identifier of the account that requested the task and that is debited for it. */
	requesterAccountId: AccountIdSchema,
	/** Tick of the simulation clock at which the task was submitted. */
	createdAtTick: Zod.number().int().nonnegative(),
});

/** One task submitted to the network. */
export type Task = Zod.infer<typeof TaskSchema>;

/** Schema of the assignment of a task to one device. */
export const TaskAssignmentSchema = Zod.object({
	/** Identifier of the assigned task. */
	taskId: TaskIdSchema,
	/** Identifier of the account that executes the task. */
	accountId: AccountIdSchema,
	/** Identifier of the device that executes the task. */
	deviceId: DeviceIdSchema,
	/** True when this assignment is a duplicated copy created to validate the first result. */
	isValidationCopy: Zod.boolean(),
});

/**
 * The assignment of a task to one device.
 *
 * The scheduler creates the assignment, so a worker never selects its own task. This removes the arbitrage described
 * in section 12.7 of the design note.
 */
export type TaskAssignment = Zod.infer<typeof TaskAssignmentSchema>;

/** Schema of the result returned by one device for one task. */
export const TaskResultSchema = Zod.object({
	/** Identifier of the task the result belongs to. */
	taskId: TaskIdSchema,
	/** Identifier of the account that returned the result. */
	accountId: AccountIdSchema,
	/** Identifier of the device that returned the result. */
	deviceId: DeviceIdSchema,
	/** The returned value, compared against the value returned by another worker to decide validity. */
	resultValue: Zod.string(),
	/** Tick of the simulation clock at which the result was returned. */
	completedAtTick: Zod.number().int().nonnegative(),
});

/** The result returned by one device for one task. */
export type TaskResult = Zod.infer<typeof TaskResultSchema>;

/** Schema of the validation status of a result. */
export const ValidationStatusSchema = Zod.enum([
	'pending',
	'unverified',
	'accepted',
	'rejected',
]);

/**
 * The validation status of a result.
 *
 * - `pending`: the result waits for a validation that has not happened yet.
 * - `unverified`: the result was never duplicated, and is accepted without a second opinion.
 * - `accepted`: the result was duplicated and confirmed.
 * - `rejected`: the result was duplicated and contradicted.
 */
export type ValidationStatus = Zod.infer<typeof ValidationStatusSchema>;
