import { z as Zod } from 'zod';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SettlementPolicy — decides when a payment is recorded and when it can be spent
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the name of a settlement policy. */
export const SettlementPolicyNameSchema = Zod.enum([
	'immediate credit',
	'provisional credit',
	'delayed settlement',
]);

/**
 * The name of a settlement policy, which is when the credits a worker earned become its own.
 *
 * - `immediate credit`: the worker is paid at once and can spend at once. The experience is smooth, and an attacker
 *   can spend what it stole before anybody notices.
 * - `provisional credit`: the worker is paid at once and can spend only after a delay. The experience is less
 *   smooth, and there is a window in which a fraud found late can still be taken back from something.
 * - `delayed settlement`: the payments are held and recorded together at the end of a period. The accounting is the
 *   most robust and the worker waits the longest.
 */
export type SettlementPolicyName = Zod.infer<typeof SettlementPolicyNameSchema>;

/** The values that decide when a payment is recorded and when it can be spent. */
export type SettlementPolicyOptions = {
	/** The policy applied to every payment. */
	policyName: SettlementPolicyName;
	/** Number of ticks a payment stays unspendable under the `provisional credit` policy. */
	provisionalTickCount: number;
	/** Number of ticks between two settlements under the `delayed settlement` policy. */
	settlementPeriodTickCount: number;
};

/** When one payment is recorded in the ledger, and when the worker may spend it. */
export type SettlementDecision = {
	/** The tick the movement is recorded at, which can be later than the tick the work was performed at. */
	recordAtTick: number;
	/** The tick from which the amount can be spent. */
	spendableFromTick: number;
};

/**
 * When the credits a worker earned become its own.
 *
 * Section 6 of the design note leaves this question open, because the three answers trade the comfort of an honest
 * user against the time an attacker has to spend what it stole. The policy computes and decides; holding a payment
 * that is not recorded yet is the work of the deferred payment book.
 */
export class SettlementPolicy {
	/** The values that decide when a payment is recorded and when it can be spent. */
	private _options: SettlementPolicyOptions;

	/**
	 * @param settlementPolicyOptions The policy, and the two delays the policies use.
	 */
	constructor(settlementPolicyOptions: SettlementPolicyOptions) {
		this._options = settlementPolicyOptions;
	}

	/**
	 * Returns the name of the policy applied to every payment.
	 *
	 * @returns The name of the policy.
	 */
	policyName(): SettlementPolicyName {
		return this._options.policyName;
	}

	/**
	 * Decides when one payment is recorded and when the worker may spend it.
	 *
	 * @param currentTick The tick the work was performed at.
	 * @returns The tick the movement is recorded at, and the tick from which the amount can be spent.
	 */
	decideForPayment(currentTick: number): SettlementDecision {
		if (this._options.policyName === 'provisional credit') {
			return {
				recordAtTick: currentTick,
				spendableFromTick: currentTick + this._options.provisionalTickCount,
			};
		}
		if (this._options.policyName === 'delayed settlement') {
			const settlementTick = this._nextSettlementTick(currentTick);
			return {
				recordAtTick: settlementTick,
				spendableFromTick: settlementTick,
			};
		}
		return {
			recordAtTick: currentTick,
			spendableFromTick: currentTick,
		};
	}

	/**
	 * Returns the tick the period holding the given tick is settled at.
	 *
	 * @param currentTick The tick the work was performed at.
	 * @returns The tick the payments of that period are recorded at.
	 */
	private _nextSettlementTick(currentTick: number): number {
		const periodTickCount = Math.max(1, this._options.settlementPeriodTickCount);
		const finishedPeriodCount = Math.floor(currentTick / periodTickCount);
		return (finishedPeriodCount + 1) * periodTickCount;
	}
}
