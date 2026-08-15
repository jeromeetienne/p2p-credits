import { z as Zod } from 'zod';

import { AccountIdSchema } from './account_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	DeviceTypes — the machine that executes a task on behalf of an account
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the unique identifier of a device. */
export const DeviceIdSchema = Zod.string().min(1);

/** Unique identifier of a device. */
export type DeviceId = Zod.infer<typeof DeviceIdSchema>;

/** Schema of a device that executes tasks. */
export const DeviceSchema = Zod.object({
	/** Unique identifier of the device. */
	deviceId: DeviceIdSchema,
	/** Identifier of the account that owns the device. */
	accountId: AccountIdSchema,
	/** Name of the hardware profile of the device, for example "reference machine" or "slow machine". */
	hardwareProfileName: Zod.string(),
	/**
	 * Speed of the device compared to the reference machine. A value of 2 means the device executes a task in half
	 * the time of the reference machine. The price of a task never depends on this value, on purpose.
	 */
	speedFactor: Zod.number().positive(),
});

/** A device that executes tasks on behalf of an account. */
export type Device = Zod.infer<typeof DeviceSchema>;

/**
 * A function that says whether a device is allowed to receive a task right now.
 *
 * The scheduler asks this question and never answers it, so it stays ignorant of the reason a device is set aside,
 * whether that reason is a suspension, a maintenance window, or anything added later.
 */
export type DeviceEligibilityFn = (device: Device) => boolean;
