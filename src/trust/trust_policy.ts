import { z as Zod } from 'zod';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TrustPolicy — decides what happens to a score after a confirmed or an invalid result
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the name of a penalty policy. */
export const PenaltyPolicyNameSchema = Zod.enum([
	'small reduction',
	'strong reduction',
	'reset',
	'suspension',
	'credit confiscation',
]);

/**
 * The name of a penalty policy, which is what the network does to a worker whose result was contradicted.
 *
 * - `small reduction`: the trust falls by the ordinary amount.
 * - `strong reduction`: the trust falls by the ordinary amount multiplied by the strong penalty factor.
 * - `reset`: the trust returns to the value a brand new account starts with.
 * - `suspension`: the trust falls by the ordinary amount, and the worker receives no task for a while.
 * - `credit confiscation`: the trust falls by the ordinary amount, and the credits the worker was paid for results
 *   nobody ever verified are taken back, because those results are now suspect.
 */
export type PenaltyPolicyName = Zod.infer<typeof PenaltyPolicyNameSchema>;

/** The values that decide how a score moves and what a penalty costs. */
export type TrustPolicyOptions = {
	/** Trust score given to an account or to a device the first time it is seen. */
	initialTrust: number;
	/** Amount added to a trust score when a result is confirmed by another worker. */
	increaseOnConfirmedResult: number;
	/** Amount removed from a trust score when a result is contradicted by other workers. */
	decreaseOnInvalidResult: number;
	/** Number the ordinary reduction is multiplied by under the `strong reduction` policy. */
	strongPenaltyFactor: number;
	/** The penalty applied to a worker whose result was contradicted. */
	penaltyPolicyName: PenaltyPolicyName;
	/** Number of ticks a worker receives no task for under the `suspension` policy. */
	suspensionTickCount: number;
	/** Lowest value a trust score can reach. */
	minimumTrust: number;
	/** Highest value a trust score can reach. */
	maximumTrust: number;
};

/** What the network does to one score, and to one worker, after one judged result. */
export type TrustOutcome = {
	/** The value the score takes after the result was judged. */
	newTrust: number;
	/** Number of ticks the worker receives no task for, which is 0 when the worker is not suspended. */
	suspensionTickCount: number;
	/** True when the credits paid for the results nobody verified have to be taken back. */
	confiscatesUnverifiedCredits: boolean;
};

/**
 * What happens to a trust score after a result was confirmed or contradicted.
 *
 * The policy computes and decides; it stores nothing. The scores themselves are held by the trust score book, so the
 * same policy can be applied to the score of an account and to the score of a device.
 */
export class TrustPolicy {
	/** The values that decide how a score moves and what a penalty costs. */
	private _options: TrustPolicyOptions;

	/**
	 * @param trustPolicyOptions The values that decide how a score moves and what a penalty costs.
	 */
	constructor(trustPolicyOptions: TrustPolicyOptions) {
		this._options = trustPolicyOptions;
	}

	/**
	 * Returns the value a brand new account or a brand new device starts with.
	 *
	 * @returns The initial trust score.
	 */
	initialTrust(): number {
		return this._options.initialTrust;
	}

	/**
	 * Raises a score, because another worker returned the same result.
	 *
	 * @param currentTrust The score before the result was judged.
	 * @returns The new score, with no suspension and no confiscation.
	 */
	afterConfirmedResult(currentTrust: number): TrustOutcome {
		return {
			newTrust: this._boundedTrust(currentTrust + this._options.increaseOnConfirmedResult),
			suspensionTickCount: 0,
			confiscatesUnverifiedCredits: false,
		};
	}

	/**
	 * Lowers a score and applies the penalty policy, because other workers contradicted the result.
	 *
	 * @param currentTrust The score before the result was judged.
	 * @returns The new score, and what else the network takes from the worker.
	 */
	afterInvalidResult(currentTrust: number): TrustOutcome {
		const ordinaryTrust = this._boundedTrust(currentTrust - this._options.decreaseOnInvalidResult);

		if (this._options.penaltyPolicyName === 'strong reduction') {
			const strongDecrease = this._options.decreaseOnInvalidResult * this._options.strongPenaltyFactor;
			return {
				newTrust: this._boundedTrust(currentTrust - strongDecrease),
				suspensionTickCount: 0,
				confiscatesUnverifiedCredits: false,
			};
		}
		if (this._options.penaltyPolicyName === 'reset') {
			return {
				newTrust: this._boundedTrust(this._options.initialTrust),
				suspensionTickCount: 0,
				confiscatesUnverifiedCredits: false,
			};
		}
		if (this._options.penaltyPolicyName === 'suspension') {
			return {
				newTrust: ordinaryTrust,
				suspensionTickCount: this._options.suspensionTickCount,
				confiscatesUnverifiedCredits: false,
			};
		}
		if (this._options.penaltyPolicyName === 'credit confiscation') {
			return {
				newTrust: ordinaryTrust,
				suspensionTickCount: 0,
				confiscatesUnverifiedCredits: true,
			};
		}
		return {
			newTrust: ordinaryTrust,
			suspensionTickCount: 0,
			confiscatesUnverifiedCredits: false,
		};
	}

	/**
	 * Keeps a score inside the allowed range.
	 *
	 * @param trust The score to bound.
	 * @returns The score, between the minimum trust and the maximum trust.
	 */
	private _boundedTrust(trust: number): number {
		return Math.min(this._options.maximumTrust, Math.max(this._options.minimumTrust, trust));
	}
}
