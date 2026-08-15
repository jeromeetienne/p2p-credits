import { z as Zod } from 'zod';

import { AccountIdSchema } from '../types/account_types.js';
import { DeviceIdSchema } from '../types/device_types.js';
import type { RandomNumberFn } from '../types/random_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	WorkerBehavior — the way each kind of worker produces the value it returns
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the name of a worker behaviour. */
export const WorkerBehaviorNameSchema = Zod.enum([
	'honest',
	'unstable',
	'malicious',
]);

/**
 * The name of a worker behaviour.
 *
 * - `honest`: almost always returns a correct result.
 * - `unstable`: sometimes returns a wrong result, because of the hardware, the runtime, a crash, or a numerical
 *   problem. The worker does not try to cheat.
 * - `malicious`: never performs the computation and always returns a fabricated value, to be paid for work it did not
 *   do.
 */
export type WorkerBehaviorName = Zod.infer<typeof WorkerBehaviorNameSchema>;

/** Schema of one simulated worker. */
export const WorkerProfileSchema = Zod.object({
	/** Identifier of the account of the worker. */
	accountId: AccountIdSchema,
	/** Identifier of the device of the worker. */
	deviceId: DeviceIdSchema,
	/** The behaviour of the worker. */
	behaviorName: WorkerBehaviorNameSchema,
	/**
	 * Likelihood that the worker returns a wrong value without trying to cheat, between 0 and 1. The value is ignored
	 * for a malicious worker, which always returns a fabricated value.
	 */
	errorProbability: Zod.number().min(0).max(1),
});

/** One simulated worker: an account, a device, and the way the worker produces the value it returns. */
export type WorkerProfile = Zod.infer<typeof WorkerProfileSchema>;

/**
 * The value returned by a simulated worker.
 *
 * The simulation never executes an inference. Each task has one correct value, and the behaviour of the worker decides
 * whether that value, or another one, is returned.
 */
export class WorkerBehavior {
	/**
	 * Produces the value one worker returns for one task.
	 *
	 * @param workerProfile The worker that executes the task.
	 * @param correctResultValue The value a correct execution of the task returns.
	 * @param randomNumberFn The source of randomness.
	 * @returns The value the worker returns, which is the correct value or a wrong one.
	 */
	static produceResultValue(
		workerProfile: WorkerProfile,
		correctResultValue: string,
		randomNumberFn: RandomNumberFn,
	): string {
		if (workerProfile.behaviorName === 'malicious') {
			return WorkerBehavior._buildWrongValue('fabricated', randomNumberFn);
		}
		if (randomNumberFn() < workerProfile.errorProbability) {
			return WorkerBehavior._buildWrongValue('corrupted', randomNumberFn);
		}
		return correctResultValue;
	}

	/**
	 * Builds a wrong value that no other worker can return by chance.
	 *
	 * @param prefix Word saying why the value is wrong, either `fabricated` or `corrupted`.
	 * @param randomNumberFn The source of randomness.
	 * @returns A wrong value.
	 */
	private static _buildWrongValue(prefix: string, randomNumberFn: RandomNumberFn): string {
		const drawnNumber = Math.floor(randomNumberFn() * 1000000000);
		return `${prefix}-value-${drawnNumber}`;
	}
}
