# Choose A Settlement Policy

The question is when the credits a worker earned become its own. Section 6 of [the design note](../explanation/design_note.md) leaves it open on purpose, because the three answers trade the comfort of an honest user against the time an attacker has to spend what it stole.

The choice is the `settlementPolicyName` parameter, and the three values it takes are below.

## The three policies

| Policy | The worker is paid | The worker may spend | What it costs |
|---|---|---|---|
| `immediate credit` | at once | at once | An attacker can spend what it stole before anybody notices. |
| `provisional credit` | at once | after `provisionalTickCount` ticks | The worker waits. In exchange there is a window where a fraud found late can still be taken back from something. |
| `delayed settlement` | at the end of the period | at the end of the period | The worker waits the longest. The payment is not in the ledger at all until then, so it can be dropped rather than taken back. |

## What each one changes in the accounting

Under `immediate credit` and `provisional credit`, the payment is recorded in the ledger straight away. It appears in the balance. Under `provisional credit` it does not appear in the spendable balance until its tick has come — that split between a balance and a spendable balance is the whole mechanism, and [when a payment becomes spendable](../explanation/when_a_payment_becomes_spendable.md) explains it.

Under `delayed settlement` the payment is not recorded at all. It waits in the deferred payment book, where it appears in no balance, and it can be dropped before it is ever recorded. This is what a settlement in batches actually buys: a moment where the network can still change its mind about work it has not paid for yet.

That moment matters when it meets the `credit confiscation` penalty. Confiscation takes back the credits paid for results nobody ever verified. Under the first two policies those credits are in the ledger and are taken back with a correcting movement. Under `delayed settlement` some of them are still waiting, and those are dropped instead of taken back — which is why the report counts credits taken back and credits dropped as two separate numbers.

## Which one to pick

Run the first simulation. It prints the same scenario once per settlement policy, in one table.

```bash
npm run example:first_simulation
```

The numbers to compare are the average number of ticks a worker waits between being paid and being able to spend, which is the cost to an honest user, and the largest amount one single account was paid for wrong results before it was ever caught, which is what the delay buys.

If those two numbers barely move between the policies in your scenario, the choice is not the thing limiting your network, and `immediate credit` is the one an honest user prefers.

## The values that go with each policy

- `provisionalTickCount`: how many ticks a payment stays unspendable under `provisional credit`. Ignored by the other two.
- `settlementPeriodTickCount`: how many ticks between two settlements under `delayed settlement`. Ignored by the other two.

## The exact signatures

- [The reference of the ledger](../reference/ledger.md).
