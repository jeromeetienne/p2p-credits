# When A Payment Becomes Spendable

Not every task is validated. The network therefore has to decide when the credits a worker earned become final, and section 6 of [the design note](design_note.md) leaves the decision open because the three answers trade the comfort of an honest user against the time an attacker has to spend what it stole.

This document explains the mechanism the library uses to make all three answers possible at once. The choice between them is [a guide](../guides/choose_a_settlement_policy.md).

## A balance and a spendable balance are two different numbers

The ledger answers two questions about the same account, and they do not have the same answer.

- `balanceOf(accountId)` — everything recorded for the account, including the credits still waiting for a validation.
- `spendableBalanceOf(accountId, currentTick)` — the part of that the account may spend right now.

A credit is left out of the spendable balance when it is still `pending`, and when its `spendableFromTick` has not come. A debit always counts, whatever its tick, so an account can never hide a debt behind a credit it cannot spend.

That asymmetry is deliberate. It is the same asymmetry a bank uses: money owed to you clears slowly, money you owe is taken at once.

## What the split buys

A worker is paid at once, and the network keeps the right to take the credits back until the result has been verified. Both halves matter.

Paying at once is what makes the network usable. A worker that saw nothing appear for hours would conclude the network is broken, and a worker that could not tell whether its work had been received would keep asking.

Holding the spending is what makes fraud expensive. An attacker returning fabricated results is paid immediately, in a number it can see, and cannot turn any of it into executed tasks until the results have survived long enough to be verified. The `largestLossBeforeFirstRejection` metric measures exactly how much one account got away with before that happened.

## Three degrees of the same idea

Under `immediate credit` the two ticks are the same tick, and the split has no effect: the balance and the spendable balance always agree.

Under `provisional credit` the payment is recorded at once and the spendable tick is pushed forward. The balance and the spendable balance disagree for the length of the delay, and that gap is the window in which a fraud found late can still be taken back from something.

Under `delayed settlement` the payment is not recorded at all. It waits in the deferred payment book, where it appears in neither number.

## Taken back, or dropped

That last difference has a consequence worth stating on its own.

A payment in the ledger cannot be removed, because the ledger is append-only. Taking credits back is a correcting movement — an `adjustment` with a negative amount — and the movement it corrects stays visible forever. That is the point of an append-only ledger: what happened stays readable, including the mistakes.

A payment still waiting in the deferred payment book was never recorded, so there is nothing to correct. It is dropped, and it leaves no trace in the ledger at all.

The report counts the two separately, as `confiscatedCredits` and `droppedHeldCredits`, because they are not the same event. One is the network reversing something it did; the other is the network deciding not to do it. Settling in batches buys exactly that second possibility: a moment where the network can still change its mind about work it has not paid for yet.

## What it costs an honest user

`averageSpendableDelayTicks` measures it: the average number of ticks a worker waits between being paid and being able to spend. Every tick of that is a tick where a genuine user who contributed cannot yet consume, and a user whose account is new can be refused a task because of it.

The first simulation prints the same scenario once per settlement policy, so the cost and what it buys can be read side by side.

```bash
npm run example:first_simulation
```

## Related

- [Choose a settlement policy](../guides/choose_a_settlement_policy.md)
- [The reference of the ledger](../reference/ledger.md)
