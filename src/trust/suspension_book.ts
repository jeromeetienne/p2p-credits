import type { AccountId } from '../types/account_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SuspensionBook — the accounts that receive no task for a while
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * The accounts the network stopped sending tasks to.
 *
 * A suspension is not a trust score and not a movement of credits. It is the one penalty that costs the network
 * nothing and costs the worker everything, because a suspended worker earns nothing while it waits.
 */
export class SuspensionBook {
	/** The tick each suspended account becomes able to receive tasks again. */
	private _suspendedUntilTickByAccountId = new Map<AccountId, number>();

	/** The number of suspensions pronounced since the beginning. */
	private _suspensionCount = 0;

	/**
	 * Stops sending tasks to an account until the given tick.
	 *
	 * @param accountId Identifier of the account.
	 * @param untilTick The tick the account becomes able to receive tasks again.
	 * @returns Nothing.
	 */
	suspend(accountId: AccountId, untilTick: number): void {
		const previousUntilTick = this._suspendedUntilTickByAccountId.get(accountId) ?? 0;
		this._suspendedUntilTickByAccountId.set(accountId, Math.max(previousUntilTick, untilTick));
		this._suspensionCount += 1;
	}

	/**
	 * Says whether an account receives tasks at the given tick.
	 *
	 * @param accountId Identifier of the account.
	 * @param currentTick The current tick.
	 * @returns True when the account is suspended and receives no task.
	 */
	isSuspended(accountId: AccountId, currentTick: number): boolean {
		const suspendedUntilTick = this._suspendedUntilTickByAccountId.get(accountId);
		if (suspendedUntilTick === undefined) {
			return false;
		}
		return currentTick < suspendedUntilTick;
	}

	/**
	 * Returns the number of suspensions pronounced since the beginning.
	 *
	 * @returns The number of suspensions.
	 */
	suspensionCount(): number {
		return this._suspensionCount;
	}
}
