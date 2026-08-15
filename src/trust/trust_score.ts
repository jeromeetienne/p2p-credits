import type { AccountId } from '../types/account_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TrustScoreBook — the estimated likelihood that a worker returns a correct result
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values that decide how fast a trust score rises and falls. */
export type TrustScoreBookOptions = {
	/** Trust score given to an account the first time it is seen. */
	initialTrust: number;
	/** Amount added to the trust score when a result of the account is confirmed by another worker. */
	increaseOnConfirmedResult: number;
	/** Amount removed from the trust score when a result of the account is contradicted by other workers. */
	decreaseOnInvalidResult: number;
	/** Lowest value a trust score can reach. */
	minimumTrust: number;
	/** Highest value a trust score can reach. */
	maximumTrust: number;
};

/**
 * The trust score of every account.
 *
 * The trust score is not money and it is never exchanged. It is the estimated likelihood that a result produced by
 * this account is correct, and it stays completely separate from the balance held by the ledger.
 *
 * This first version holds one score per account. Whether trust belongs to the account, to the device, or to both is
 * an open question of the design note, and the answer will be measured before it is chosen.
 */
export class TrustScoreBook {
	/** The values that decide how fast a trust score rises and falls. */
	private _options: TrustScoreBookOptions;

	/** The current trust score of every account seen so far. */
	private _trustByAccountId = new Map<AccountId, number>();

	/** The number of confirmed results of every account seen so far. */
	private _confirmedResultCountByAccountId = new Map<AccountId, number>();

	/** The number of invalid results of every account seen so far. */
	private _invalidResultCountByAccountId = new Map<AccountId, number>();

	/**
	 * @param trustScoreBookOptions The values that decide how fast a trust score rises and falls.
	 */
	constructor(trustScoreBookOptions: TrustScoreBookOptions) {
		this._options = trustScoreBookOptions;
	}

	/**
	 * Returns the trust score of an account.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The trust score, between the minimum trust and the maximum trust.
	 */
	trustOf(accountId: AccountId): number {
		const trust = this._trustByAccountId.get(accountId);
		if (trust === undefined) {
			return this._options.initialTrust;
		}
		return trust;
	}

	/**
	 * Raises the trust score of an account, because another worker returned the same result.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The new trust score.
	 */
	afterConfirmedResult(accountId: AccountId): number {
		const previousCount = this._confirmedResultCountByAccountId.get(accountId) ?? 0;
		this._confirmedResultCountByAccountId.set(accountId, previousCount + 1);
		return this._changeTrust(accountId, this._options.increaseOnConfirmedResult);
	}

	/**
	 * Lowers the trust score of an account, because other workers contradicted its result.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The new trust score.
	 */
	afterInvalidResult(accountId: AccountId): number {
		const previousCount = this._invalidResultCountByAccountId.get(accountId) ?? 0;
		this._invalidResultCountByAccountId.set(accountId, previousCount + 1);
		return this._changeTrust(accountId, -this._options.decreaseOnInvalidResult);
	}

	/**
	 * Returns the number of results of an account that another worker confirmed.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The number of confirmed results.
	 */
	confirmedResultCountOf(accountId: AccountId): number {
		return this._confirmedResultCountByAccountId.get(accountId) ?? 0;
	}

	/**
	 * Returns the number of results of an account that other workers contradicted.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The number of invalid results.
	 */
	invalidResultCountOf(accountId: AccountId): number {
		return this._invalidResultCountByAccountId.get(accountId) ?? 0;
	}

	/**
	 * Adds an amount to the trust score of an account and keeps the result inside the allowed range.
	 *
	 * @param accountId Identifier of the account.
	 * @param amount Amount to add, which is negative when the trust must fall.
	 * @returns The new trust score.
	 */
	private _changeTrust(accountId: AccountId, amount: number): number {
		const currentTrust = this.trustOf(accountId);
		const rawTrust = currentTrust + amount;
		const boundedTrust = Math.min(this._options.maximumTrust, Math.max(this._options.minimumTrust, rawTrust));
		this._trustByAccountId.set(accountId, boundedTrust);
		return boundedTrust;
	}
}
