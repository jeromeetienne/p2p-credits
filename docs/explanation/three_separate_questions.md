# Three Separate Questions

Section 1 of [the design note](design_note.md) says that a credit network has to solve three problems, and that the three should remain separate. This document says what "separate" means in the code, and what goes wrong when it stops being true.

## The three questions

- **What is this task worth?** `price(task)`, a number of credits.
- **How much is this worker trusted?** `trust(worker)`, the estimated likelihood that a result of this worker is correct.
- **Is this result correct?** `validity(result)`, a verdict.

They are hard for different reasons. A price is hard because machines differ in speed and a benchmark carries noise. A trust score is hard because it has to rise slowly and fall fast without punishing a machine for its own instability. A verdict is hard because two correct executions of the same task are not identical.

Once the three are answered, the accounting is easy: a movement of credits, written down.

## What separate means here

The separation is held by import rules rather than by good intentions, because a boundary nobody can break is the only boundary that survives.

- `pricing/`, `trust/`, and `validation/` never import from each other. A change in one of the three never forces a change in the other two.
- `ledger/` imports from none of them. It receives an amount and a validation status, and it stores them. This is what keeps the accounting simple while the three questions stay hard.
- `identity/` imports from none of them either. It reads balances as plain numbers, so the rule about who may spend is never mixed with the record of what was spent.
- `simulation/` may import from every folder, and no folder imports from `simulation/`.

## Where a module has to look across a line

Some of them genuinely need something from the other side. The validation has to know how much a worker is trusted, to decide how often to duplicate its tasks. The scheduler has to know whether a device is set aside. Neither is allowed to import the module that knows.

They receive a function instead, declared in `types/` and handed in by whoever composes the parts.

- `WorkerTrustFn` answers "how much is this worker trusted", and the caller never learns how the score was computed.
- `DeviceEligibilityFn` answers "may this device receive a task right now", and the scheduler never learns whether the reason is a suspension, a maintenance window, or something added later.
- `RandomNumberFn` supplies randomness, and the policy never learns where the numbers come from.

A function passed in is a boundary that can be seen. An import is a boundary that has already been crossed.

## What breaks when they merge

**Price merged into trust.** Paying a trusted worker more than an untrusted one for the same task makes the trust score into money. It is then worth buying, worth stealing, and worth farming, and the network has invented a second currency it never meant to have.

**Validity merged into trust.** Accepting the result of a trusted worker without ever comparing it makes trust self-confirming: a worker trusted enough is never checked again, so it can never be caught, so it stays trusted. The `trust weighted` resolution comes close to this line on purpose, and the minimum vote weight is what keeps it on the right side — a single trusted worker cannot decide alone against everybody else.

**Price merged into validity.** Paying less for a result nobody verified would make the price of a task depend on how the network happened to check it, and two workers doing identical work would be paid differently for reasons neither of them controls.

## What the separation costs

Composing the parts is more work. The engine in `src/simulation/simulation_engine.ts` is the one place that holds all of them at once, and it is the largest file in the repository for exactly that reason.

That is the trade the design accepted: one composing file that knows everything, so that no policy file knows more than it should.

## Related

- [The public interface](../reference/public_interface.md)
- [The README of the library](../../src/README.md)
