# Parameter Sweeps

Runs the scenario of [`first_simulation`](../first_simulation/README.md) many times over, moving one parameter at a time, and judges every value against the three conditions of section 15 of [the design note](../../docs/explanation/design_note.md): the validation cost stays low, fraud stays unprofitable, and honest users meet little friction.

The question the whole repository exists to answer is whether any set of parameters meets all three at once. This example is where that question is measured rather than argued.

## Running it

```bash
npm run example:parameter_sweeps
```

Every point is run with five seeds and the metrics are averaged, so that the difference between two points is the parameter and not the draw. The run takes noticeably longer than the first simulation, because it is several hundred whole simulations.

## The seven sweeps

Five of them come from section 10 of the design note.

- **validation rate of a trusted worker** — how rarely a worker that has been confirmed many times is verified.
- **share of malicious workers** — from none to twelve of the twenty-eight workers.
- **initial trust** — what the network extends to an account it has never seen.
- **penalty** — small reduction, strong reduction, reset, suspension, and credit confiscation.
- **pricing error** — how far the benchmark misses the true cost.

Two more were added afterwards.

- **tasks asked for per tick** — because the first five sweeps left it unclear whether the friction measured was the deficit rule or simply too much demand for the number of accounts.
- **deficit allowed to a new account** — added because the sweeps above showed this one parameter deciding almost all of the friction an honest worker meets.

A last sweep, **share of attackers, tuned scenario**, holds the tuned parameters the six sweeps point at and raises the number of attackers against them.

Each sweep moves one parameter and nothing else. A sweep over a share holds the total at twenty-eight workers and trades one kind of worker for another, because a sweep that also changes the number of accounts changes the load each account carries and would then be measuring two things at once.

## What gets printed

One table per sweep. The columns are, in order: the share of the compute spent validating, the share of the credits paid for wrong results, what the Sybil attackers kept, how long an account took to be caught, the share of correct results rejected unfairly, the share of tasks refused to honest workers for lack of credits, and the verdict.

The verdict column says only `yes` or `no`. After the tables, one line per value that fell outside the region names every condition it broke, so that a `no` never has to be guessed at.

## The limits

The four limits are written down in one place, in `sweep_definitions.ts`: at most 20 percent of the compute spent validating, at most 2 percent of the credits paid for wrong results, at most 1 percent of correct results rejected, and at most 10 percent of tasks refused to honest workers.

They are a first guess. They are what the sweeps are held to, not a result the sweeps produced.

## What the sweeps show

The verdict is `no` at every value of every sweep, and the hypothesis of section 15 survives only in a weakened form.

- The deficit allowed to a new account is what drives the friction an honest worker meets, and raising it is also what makes the Sybil attack less unprofitable. The two conditions pull against each other through the same parameter.
- Raising the initial trust makes verification cheap and makes fraud pay, in the same movement.
- The tuned scenario comes closest, and it fails one condition at a time rather than three. With no attacker at all it spends 16 percent of the compute validating, inside the limit of 20 percent, and rejects almost no genuine result, but it still refuses 15 percent of the tasks of honest workers against a limit of 10 percent. As soon as two attackers are added the friction falls to 9 percent and the validation cost climbs to 25 percent, so the two conditions trade against each other instead of holding together.

## The files

- `main.ts`: runs every sweep and writes the tables.
- `sweep_definitions.ts`: the sweeps, the four limits, the tuned scenario, and the sweep over the share of attackers that scenario is held to. The base scenario is imported from `first_simulation`, so the two examples never drift apart.
- `sweep_printer.ts`: writes one sweep as one table, and the reason every value that fell outside the region did.
