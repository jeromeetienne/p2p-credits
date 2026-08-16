# Prior Art

Section 16 of [the design note](design_note.md) names two systems that have already met most of these problems, and says the goal is to reuse proven mechanisms rather than to reinvent the whole system.

- **BOINC**, the platform underneath many volunteer computing projects.
- **Folding@home**, a distributed computing project for simulating how proteins fold.

Both of them have had to solve distributed computing, task assignment, heterogeneous hardware, result validation, a credit or point system, and worker reputation, on real networks with real people trying to game them.

## What this repository takes from the shape of those systems

Four ideas in the library are recognisably the same ideas those systems arrived at, and the design note names all four.

**A price measured on a reference environment, not on the worker.** Rewarding measured time on the worker's own machine pays a slow machine more for the same useful work, and pays a worker that pretends to be slow more still. The price here is a ratio against a reference task, measured on reference machines.

**Validation by duplication.** Send the same task to more than one worker and compare what comes back. This is the mechanism both systems use, and it is why a result is judged against another result rather than against a rule.

**A reputation that is not money.** A trust score here is never exchanged, never spent, and never converted into credits. It only decides how often a worker is checked.

**Sampling the validation instead of duplicating everything.** Duplicating every task doubles the cost of the network and removes most of the reason to build it.

## Where this repository goes further than the design note describes

Three of the questions this library treats as parameters are places where the design note asks a question those systems answer by convention.

- Comparing two results that are both correct and not identical. For an inference this is harder than for the deterministic workloads volunteer computing mostly carries, and it is why there are four comparison strategies here rather than one exact comparison.
- The cost of an identity, stated as a number in credits so it can be compared with what an account can earn or steal.
- When a payment becomes spendable, kept as three policies rather than one, so that what each one costs can be measured.

## What has not been done

Nobody has gone through the published behaviour of BOINC or of Folding@home and checked the choices here against it. The design note names the two systems as worth studying, and studying them is still owed.

Two questions in particular would be worth answering from what those projects already know.

- What validation rate do they actually run at, and does the floor found by the sweeps of this repository appear there too?
- How do they handle a worker adding new hardware, which is the question of [the account or the device](account_or_device.md)?

## Related

- [The central hypothesis](the_central_hypothesis.md)
- Section 16 of [the design note](design_note.md).
