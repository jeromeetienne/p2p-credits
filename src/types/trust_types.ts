import type { AccountId } from './account_types.js';
import type { DeviceId } from './device_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TrustTypes — how a module reads a trust score without depending on the trust module
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * A function that returns the trust of a worker.
 *
 * The scheduler and the validation both need to know how much a worker is trusted, and neither is allowed to import
 * the trust module, because the three questions of the design note stay separate. They receive this function instead,
 * and never learn how the score was computed.
 */
export type WorkerTrustFn = (accountId: AccountId, deviceId: DeviceId) => number;
