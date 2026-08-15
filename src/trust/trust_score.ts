import type { AccountId } from '../types/account_types.js';
import type { DeviceId } from '../types/device_types.js';
import type { TrustPolicy } from './trust_policy.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TrustScoreBook — the trust of every account and of every device, and their combination
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values the trust score book needs. */
export type TrustScoreBookOptions = {
	/** What happens to a score after a result was confirmed or contradicted. */
	trustPolicy: TrustPolicy;
	/**
	 * Share of the combined trust that comes from the device, between 0 and 1. A value of 0 gives a new device the
	 * whole trust of its account, and a value of 1 makes a new device earn its trust alone whatever its account did.
	 */
	deviceTrustWeight: number;
};

/** What one judged result changed, for the account, for the device, and for the worker. */
export type TrustChange = {
	/** The trust of the account after the result was judged. */
	newAccountTrust: number;
	/** The trust of the device after the result was judged. */
	newDeviceTrust: number;
	/** The combined trust of the worker after the result was judged. */
	newCombinedTrust: number;
	/** Number of ticks the worker receives no task for, which is 0 when the worker is not suspended. */
	suspensionTickCount: number;
	/** True when the credits paid for the results nobody verified have to be taken back. */
	confiscatesUnverifiedCredits: boolean;
};

/**
 * The trust score of every account and of every device.
 *
 * The trust score is not money and it is never exchanged. It is the estimated likelihood that a result produced by
 * this worker is correct, and it stays completely separate from the balance held by the ledger.
 *
 * An account and a device each carry their own score, and the trust of a worker combines the two. A trusted account
 * that adds an unknown device therefore does not hand the whole of its history to that device, which is the question
 * left open by section 12.3 of the design note. How much is handed over is the weight given at construction, so the
 * answer can be measured instead of decided.
 */
export class TrustScoreBook {
	/** What happens to a score after a result was confirmed or contradicted. */
	private _trustPolicy: TrustPolicy;

	/** Share of the combined trust that comes from the device, between 0 and 1. */
	private _deviceTrustWeight: number;

	/** The current trust score of every account seen so far. */
	private _trustByAccountId = new Map<AccountId, number>();

	/** The current trust score of every device seen so far. */
	private _trustByDeviceId = new Map<DeviceId, number>();

	/** The number of confirmed results of every account seen so far. */
	private _confirmedResultCountByAccountId = new Map<AccountId, number>();

	/** The number of invalid results of every account seen so far. */
	private _invalidResultCountByAccountId = new Map<AccountId, number>();

	/** The tick of the last invalid result of every account that ever returned one. */
	private _lastInvalidResultTickByAccountId = new Map<AccountId, number>();

	/**
	 * @param trustScoreBookOptions The policy that moves a score, and the share of the trust that the device carries.
	 */
	constructor(trustScoreBookOptions: TrustScoreBookOptions) {
		this._trustPolicy = trustScoreBookOptions.trustPolicy;
		this._deviceTrustWeight = trustScoreBookOptions.deviceTrustWeight;
	}

	/**
	 * Returns the trust score of an account.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The trust score of the account.
	 */
	accountTrustOf(accountId: AccountId): number {
		return this._trustByAccountId.get(accountId) ?? this._trustPolicy.initialTrust();
	}

	/**
	 * Returns the trust score of a device.
	 *
	 * @param deviceId Identifier of the device.
	 * @returns The trust score of the device.
	 */
	deviceTrustOf(deviceId: DeviceId): number {
		return this._trustByDeviceId.get(deviceId) ?? this._trustPolicy.initialTrust();
	}

	/**
	 * Returns the trust of a worker, which combines the trust of its account and the trust of its device.
	 *
	 * @param accountId Identifier of the account.
	 * @param deviceId Identifier of the device.
	 * @returns The combined trust score.
	 */
	trustOf(accountId: AccountId, deviceId: DeviceId): number {
		const accountTrust = this.accountTrustOf(accountId);
		const deviceTrust = this.deviceTrustOf(deviceId);
		return (1 - this._deviceTrustWeight) * accountTrust + this._deviceTrustWeight * deviceTrust;
	}

	/**
	 * Raises the trust of an account and of its device, because another worker returned the same result.
	 *
	 * @param accountId Identifier of the account.
	 * @param deviceId Identifier of the device.
	 * @returns What the confirmed result changed.
	 */
	afterConfirmedResult(accountId: AccountId, deviceId: DeviceId): TrustChange {
		const previousCount = this._confirmedResultCountByAccountId.get(accountId) ?? 0;
		this._confirmedResultCountByAccountId.set(accountId, previousCount + 1);

		const accountOutcome = this._trustPolicy.afterConfirmedResult(this.accountTrustOf(accountId));
		const deviceOutcome = this._trustPolicy.afterConfirmedResult(this.deviceTrustOf(deviceId));
		this._trustByAccountId.set(accountId, accountOutcome.newTrust);
		this._trustByDeviceId.set(deviceId, deviceOutcome.newTrust);

		return {
			newAccountTrust: accountOutcome.newTrust,
			newDeviceTrust: deviceOutcome.newTrust,
			newCombinedTrust: this.trustOf(accountId, deviceId),
			suspensionTickCount: 0,
			confiscatesUnverifiedCredits: false,
		};
	}

	/**
	 * Lowers the trust of an account and of its device, and applies the penalty policy, because other workers
	 * contradicted the result.
	 *
	 * @param accountId Identifier of the account.
	 * @param deviceId Identifier of the device.
	 * @param tick The current tick, kept to know how recent the error is.
	 * @returns What the invalid result changed, and what else the network takes from the worker.
	 */
	afterInvalidResult(accountId: AccountId, deviceId: DeviceId, tick: number): TrustChange {
		const previousCount = this._invalidResultCountByAccountId.get(accountId) ?? 0;
		this._invalidResultCountByAccountId.set(accountId, previousCount + 1);
		this._lastInvalidResultTickByAccountId.set(accountId, tick);

		const accountOutcome = this._trustPolicy.afterInvalidResult(this.accountTrustOf(accountId));
		const deviceOutcome = this._trustPolicy.afterInvalidResult(this.deviceTrustOf(deviceId));
		this._trustByAccountId.set(accountId, accountOutcome.newTrust);
		this._trustByDeviceId.set(deviceId, deviceOutcome.newTrust);

		return {
			newAccountTrust: accountOutcome.newTrust,
			newDeviceTrust: deviceOutcome.newTrust,
			newCombinedTrust: this.trustOf(accountId, deviceId),
			suspensionTickCount: accountOutcome.suspensionTickCount,
			confiscatesUnverifiedCredits: accountOutcome.confiscatesUnverifiedCredits,
		};
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
	 * Returns the tick of the last invalid result of an account.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The tick of the last invalid result, or `undefined` when the account never returned one.
	 */
	lastInvalidResultTickOf(accountId: AccountId): number | undefined {
		return this._lastInvalidResultTickByAccountId.get(accountId);
	}
}
