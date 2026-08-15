///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SpendingPolicy — says whether an account may have a task executed for it
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values that decide how far an account may go before it has to contribute. */
export type SpendingPolicyOptions = {
	/**
	 * How far below zero an account that has not contributed enough yet may go, in credits. This is the small debt
	 * a brand new user is allowed, so that the service can be tried before anything is earned.
	 */
	allowedInitialDeficit: number;
	/** How far below zero an account that has contributed enough may go, in credits. */
	allowedDeficitAfterContribution: number;
	/** Amount an account has to have earned before the larger deficit is opened to it, in credits. */
	requiredContribution: number;
};

/** Why an account was refused, or the fact that it was not. */
export type SpendingDecision = {
	/** True when the account may have the task executed for it. */
	mayConsume: boolean;
	/** How far below zero the account is allowed to go right now, in credits. */
	deficitLimit: number;
};

/**
 * The rule that stops an account from consuming what it never contributed.
 *
 * Section 8 of the design note asks for one simple rule: a new account contributes before it consumes a large amount
 * of resources. A small deficit is still allowed, so that a new user can try the service, and that deficit is the
 * whole of what an abandoned account can ever cost the network.
 */
export class SpendingPolicy {
	/** The values that decide how far an account may go before it has to contribute. */
	private _options: SpendingPolicyOptions;

	/**
	 * @param spendingPolicyOptions The two deficits and the contribution that opens the larger one.
	 */
	constructor(spendingPolicyOptions: SpendingPolicyOptions) {
		this._options = spendingPolicyOptions;
	}

	/**
	 * Says whether an account may have one task executed for it.
	 *
	 * @param spendableBalance What the account can spend right now, in credits.
	 * @param earnedTotal What the account was ever paid for the work it performed, in credits.
	 * @param price The price of the task, in credits.
	 * @returns Whether the account may consume, and the deficit it is allowed right now.
	 */
	decide(spendableBalance: number, earnedTotal: number, price: number): SpendingDecision {
		const deficitLimit = this._deficitLimitOf(earnedTotal);
		return {
			mayConsume: spendableBalance - price >= -deficitLimit,
			deficitLimit: deficitLimit,
		};
	}

	/**
	 * Says whether an account may have one task executed for it.
	 *
	 * @param spendableBalance What the account can spend right now, in credits.
	 * @param earnedTotal What the account was ever paid for the work it performed, in credits.
	 * @param price The price of the task, in credits.
	 * @returns True when the account may consume.
	 */
	mayConsume(spendableBalance: number, earnedTotal: number, price: number): boolean {
		return this.decide(spendableBalance, earnedTotal, price).mayConsume;
	}

	/**
	 * Returns how far below zero an account is allowed to go, from what it has contributed.
	 *
	 * @param earnedTotal What the account was ever paid for the work it performed, in credits.
	 * @returns The deficit the account is allowed, in credits.
	 */
	private _deficitLimitOf(earnedTotal: number): number {
		if (earnedTotal >= this._options.requiredContribution) {
			return this._options.allowedDeficitAfterContribution;
		}
		return this._options.allowedInitialDeficit;
	}
}
