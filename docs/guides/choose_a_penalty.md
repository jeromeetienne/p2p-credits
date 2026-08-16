# Choose A Penalty

The question is what the network does to a worker whose result was contradicted by other workers. Section 12.5 of [the design note](../explanation/design_note.md) lists five answers and picks none, so the answer is the `penaltyPolicyName` parameter.

Every penalty lowers the trust score. What each one adds on top of that is what separates them.

## The five penalties

| Penalty | What it does on top of the ordinary reduction | What it costs an honest worker |
|---|---|---|
| `small reduction` | Nothing. The trust falls by `trustDecreaseOnInvalidResult`. | Almost nothing. An unstable machine recovers within a few confirmed results. |
| `strong reduction` | The reduction is multiplied by `strongPenaltyFactor`. | An unstable machine falls a long way for a fault of its hardware, and climbs back slowly. |
| `reset` | The trust returns to the value a brand new account starts with. | An honest worker with a long history loses all of it for one bad result. |
| `suspension` | The worker receives no task for `suspensionTickCount` ticks. | The worker earns nothing while it waits, and its own tasks are refused once its balance runs down. |
| `credit confiscation` | The credits paid for results nobody ever verified are taken back. | An honest worker loses payments for work it really performed, because nobody ever looked at that work. |

## Two things the penalties do not do

**A penalty never raises a trust score.** Under `reset`, a worker already below the value a newcomer starts with takes the ordinary reduction instead. Otherwise being caught would promote it back to the standing of a newcomer, however often it was contradicted.

**A penalty never falls below `minimumTrust` or climbs above `maximumTrust`.** Every score stays inside that range.

## Which one to pick

The sweeps run all five.

```bash
npm run example:parameter_sweeps
```

Read the penalty table. The column that matters for the cost of the penalty to an honest worker is the share of correct results rejected unfairly, and the column that matters for what the penalty buys is the share of the credits paid for wrong results.

The important thing the sweeps show is that no penalty on this list is what makes the difference. What keeps fraud down is verifying a caught worker every single time afterwards — a high `recentErrorValidationRate` held for a long `recentErrorTickCount` — and not the size of the trust reduction at the moment of the offence.

## The parameter that goes with the penalty

`recentErrorTickCount` decides how long a wrong result stays recent. While it is recent, the worker is verified at `recentErrorValidationRate`, whatever its trust score says. Setting that period to the whole length of the run means a worker caught once is never trusted cheaply again.

That is the setting the tuned scenario of the sweeps uses, and it is what makes the tuned scenario satisfy the fraud condition. It also costs computing power, which is exactly why the tuned scenario fails the cost condition.

## The exact signatures

- [The reference of the trust](../reference/trust.md).
