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
	'sybil attacker',
]);

/**
 * The name of a worker behaviour.
 *
 * - `honest`: performs the computation and returns what it found.
 * - `unstable`: performs the computation, and sometimes returns a badly wrong value because of the hardware, the
 *   runtime, a crash, or a numerical problem. The worker does not try to cheat.
 * - `malicious`: never performs the computation and returns a value of the right shape and of the wrong content, to
 *   be paid for work it did not do.
 * - `sybil attacker`: behaves exactly like a malicious worker, and abandons its account for a freshly created one as
 *   soon as the network has lowered its trust far enough to make it unprofitable.
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
	 * Likelihood that the worker returns a badly wrong value without trying to cheat, between 0 and 1. The value is
	 * ignored for a malicious worker, which never performs the computation at all.
	 */
	errorProbability: Zod.number().min(0).max(1),
});

/** One simulated worker: an account, a device, and the way the worker produces the value it returns. */
export type WorkerProfile = Zod.infer<typeof WorkerProfileSchema>;

/** What one worker returned, and whether it did the work it was paid for. */
export type ProducedResult = {
	/** The value the worker returned, written as numbers separated by commas. */
	resultValue: string;
	/**
	 * True when the worker performed the computation and returned what it found. A genuine result can still differ
	 * from the result of another genuine worker, because two correct executions are not identical.
	 */
	isGenuine: boolean;
};

/**
 * The value returned by a simulated worker.
 *
 * The simulation never executes an inference. Each task has one true vector of numbers, and the behaviour of the
 * worker decides what comes back: that vector carrying the small differences of a real execution, that vector badly
 * damaged, or a vector of the right shape that was never computed at all.
 */
export class WorkerBehavior {
	/**
	 * Produces the value one worker returns for one task.
	 *
	 * @param workerProfile The worker that executes the task.
	 * @param trueVector The vector a perfect execution of the task returns.
	 * @param noiseRatio Largest share by which one number of a genuine result may miss the true number.
	 * @param randomNumberFn The source of randomness.
	 * @returns The value the worker returns, and whether the work was really performed.
	 */
	static produceResult(
		workerProfile: WorkerProfile,
		trueVector: number[],
		noiseRatio: number,
		randomNumberFn: RandomNumberFn,
	): ProducedResult {
		if (workerProfile.behaviorName === 'malicious' || workerProfile.behaviorName === 'sybil attacker') {
			const fabricatedVector = trueVector.map((trueNumber) => {
				return trueNumber * (0.5 + randomNumberFn());
			});
			return {
				resultValue: WorkerBehavior._writeVector(fabricatedVector),
				isGenuine: false,
			};
		}

		if (randomNumberFn() < workerProfile.errorProbability) {
			const damagedVector = trueVector.map((trueNumber) => {
				return trueNumber * (1 + randomNumberFn());
			});
			return {
				resultValue: WorkerBehavior._writeVector(damagedVector),
				isGenuine: false,
			};
		}

		const executedVector = trueVector.map((trueNumber) => {
			const noise = (randomNumberFn() * 2 - 1) * noiseRatio;
			return trueNumber * (1 + noise);
		});
		return {
			resultValue: WorkerBehavior._writeVector(executedVector),
			isGenuine: true,
		};
	}

	/**
	 * Writes a vector of numbers as the text a worker returns.
	 *
	 * @param vector The numbers to write.
	 * @returns The numbers written one after the other and separated by commas.
	 */
	private static _writeVector(vector: number[]): string {
		return vector.map((numberOfVector) => {
			return numberOfVector.toFixed(6);
		}).join(',');
	}
}
