# Reference: Trust

How much a worker is trusted. A trust score is not money, it is never exchanged, and it stays completely separate from the balance held by the ledger. It is the estimated likelihood that a result produced by this worker is correct.

Everything here comes from `src/trust/`.

## `TrustScoreBook`

The trust score of every account and of every device.

### `new TrustScoreBook(trustScoreBookOptions: TrustScoreBookOptions)`

`TrustScoreBookOptions` holds:

- `trustPolicy: TrustPolicy` — what happens to a score after a result was judged.
- `deviceTrustWeight: number` — the share of the combined trust that comes from the device, between 0 and 1. A value of 0 gives a new device the whole trust of its account, and a value of 1 makes a new device earn its trust alone whatever its account did.

### `accountTrustOf(accountId)`, `deviceTrustOf(deviceId)`

The score of an account and the score of a device. An account or a device that was never seen carries the initial trust of the policy.

### `trustOf(accountId, deviceId): number`

The combined trust of a worker, which is the account score and the device score mixed by `deviceTrustWeight`. This is the shape a `WorkerTrustFn` has, and it is how the scheduler and the validation read a trust score without importing this module.

### `afterConfirmedResult(accountId, deviceId): TrustChange`

Raises the score of the account and the score of its device, because another worker returned the same result.

### `afterInvalidResult(accountId, deviceId, tick): TrustChange`

Lowers both scores and applies the penalty policy, because other workers contradicted the result. The tick is kept so that the network knows how recent the error is.

`TrustChange` holds the new account trust, the new device trust, the new combined trust, the number of ticks the worker receives no task for, and whether the credits paid for unverified results have to be taken back.

### `confirmedResultCountOf(accountId)`, `invalidResultCountOf(accountId)`, `lastInvalidResultTickOf(accountId)`

How many results of an account were confirmed, how many were contradicted, and when the last contradicted one was. The last of the three returns `undefined` when the account never returned an invalid result.

## `TrustPolicy`

What happens to a score after a result was judged. The policy computes and decides; it stores nothing, so the same policy applies to the score of an account and to the score of a device.

### `new TrustPolicy(trustPolicyOptions: TrustPolicyOptions)`

`TrustPolicyOptions` holds:

- `initialTrust: number` — the score given the first time an account or a device is seen.
- `increaseOnConfirmedResult: number` — added when a result is confirmed.
- `decreaseOnInvalidResult: number` — removed when a result is contradicted.
- `strongPenaltyFactor: number` — what the ordinary reduction is multiplied by under `strong reduction`.
- `penaltyPolicyName: PenaltyPolicyName` — the penalty applied to a contradicted worker.
- `suspensionTickCount: number` — how many ticks a worker receives no task for under `suspension`.
- `minimumTrust: number`, `maximumTrust: number` — the range every score stays inside.

### `PenaltyPolicyName`

- `small reduction` — the trust falls by the ordinary amount.
- `strong reduction` — the trust falls by the ordinary amount multiplied by `strongPenaltyFactor`.
- `reset` — the trust returns to the initial trust, and a worker already below that value takes the ordinary reduction instead, because a penalty never raises a trust score.
- `suspension` — the trust falls by the ordinary amount, and the worker receives no task for `suspensionTickCount` ticks.
- `credit confiscation` — the trust falls by the ordinary amount, and the credits paid for results nobody ever verified are taken back, because those results are now suspect.

`PenaltyPolicyNameSchema` validates the name at run time.

### `initialTrust(): number`

The value a brand new account or a brand new device starts with.

### `afterConfirmedResult(currentTrust): TrustOutcome`, `afterInvalidResult(currentTrust): TrustOutcome`

`TrustOutcome` holds `newTrust`, `suspensionTickCount`, and `confiscatesUnverifiedCredits`.

## `SuspensionBook`

The accounts the network stopped sending tasks to. A suspension is neither a trust score nor a movement of credits: it is the one penalty that costs the network nothing and costs the worker everything, because a suspended worker earns nothing while it waits.

### `suspend(accountId, untilTick): void`

Stops sending tasks to an account until the given tick. A second suspension while one is running keeps the later of the two ticks.

### `isSuspended(accountId, currentTick): boolean`

True when the account receives no task at that tick.

### `suspensionCount(): number`

How many suspensions were pronounced since the beginning.

## Related

- [Choose a penalty](../guides/choose_a_penalty.md)
- [The account or the device](../explanation/account_or_device.md)
- [The context of `/src/trust`](../../src/trust/CONTEXT.md)
