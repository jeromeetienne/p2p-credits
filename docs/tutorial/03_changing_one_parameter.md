# 3. Changing One Parameter

One run says very little. It says what happened at one set of parameters, with one seed, and a seed carries its own luck. This lesson moves one parameter at a time and reads where the network stops working.

## Run the sweeps

```bash
npm run example:parameter_sweeps
```

This takes noticeably longer than the first simulation, because it is several hundred whole simulations. Every point is run with five seeds and the metrics are averaged, so that the difference between two points is the parameter and not the draw.

## What gets printed

One table per sweep. The columns are, in order: the share of the computing power spent validating, the share of the credits paid for wrong results, what the Sybil attackers kept, how long an account took to be caught, the share of correct results rejected unfairly, the share of tasks refused to honest workers for lack of credits, and the verdict.

The verdict says only `yes` or `no`. It answers one question: does this value of this parameter sit inside the region where the network is worth running? After the tables, one line per value that fell outside the region names every condition it broke.

## The three conditions, and the four limits

The verdict comes from section 15 of [the design note](../explanation/design_note.md). The network is worth running when three things hold at once.

- The validation cost is low.
- Fraud is unprofitable.
- Honest users meet little friction.

Those three are turned into four numbers in `examples/parameter_sweeps/sweep_definitions.ts`: at most 20 percent of the computing power spent validating, at most 2 percent of the credits paid for wrong results, at most 1 percent of correct results rejected, and at most 10 percent of tasks refused to honest workers.

Those four limits are a first guess. They are what the sweeps are held to, and not a result the sweeps produced. Changing them changes every verdict, so a reader who does not like a verdict should first look at the limit that produced it.

## Change one value yourself

Every value of the first scenario lives in one file, `examples/first_simulation/simulation_parameters.ts`, and no number of that scenario lives anywhere else. The sweeps start from that same scenario, shortened, so a change there moves both examples.

Try `trustedValidationRate`, which is the share of the tasks duplicated for a worker that has been confirmed many times. Lower it, and run the first simulation again. The share of the computing power spent validating falls, and the share of wrong values paid for without noticing rises. That single trade is the whole subject of the repository.

Then try `allowedInitialDeficit`, which is how far below zero an account that has not contributed yet may go. Raise it, and the tasks refused to honest workers fall away — and what the Sybil attackers keep climbs, because the deficit a brand new account is allowed is exactly what an abandoned account walks away with. The two conditions pull against each other through one parameter.

## What the sweeps found

The verdict is `no` at every value of every sweep, and the hypothesis of section 15 survives only in a weakened form. [The central hypothesis](../explanation/the_central_hypothesis.md) states what was measured and what it means.

The short version: the tuned scenario comes closest, and it fails one condition at a time rather than three. With no attacker at all it spends 16 percent of the computing power validating, inside the limit of 20 percent, and it still refuses 15 percent of the tasks of honest workers against a limit of 10 percent. Add two attackers and the friction falls to 9 percent while the validation cost climbs to 25 percent. The two conditions trade against each other instead of holding together.

## Where to go next

- [The guides](../guides/), for one task at a time: pricing a new task type, choosing a settlement policy, choosing a penalty, comparing results that are not deterministic, and setting the cost of an identity.
- [The reference](../reference/public_interface.md), to call the library from another program.
- [The explanation](../explanation/), for why the design is the way it is.
