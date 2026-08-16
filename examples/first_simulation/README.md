# First Simulation

One run of a whole peer-to-peer inference network, from the first tick to the last, over the library in `src/`. Twenty honest workers, four unstable workers, two malicious workers, and two Sybil attackers submit tasks, execute the tasks of the others, get verified as often as their trust deserves, get paid, and spend what they earned.

Nothing here is a rule of the network. This folder chooses the parameters, runs the simulation, and prints what the run measured.

## Running it

```bash
npm run example:first_simulation
```

The run is reproducible: the seed is fixed in `simulation_parameters.ts`, so the same parameters always print the same report. Change one value in that file and the whole report moves with it.

## The three task types

The task types follow the example of section 2 of [the design note](../../docs/explanation/design_note.md). The reference task truly costs 10 seconds on the reference machine and is worth 1 credit, task A truly costs 30 seconds, and task B truly costs 5 seconds.

The network never reads those true costs. A benchmark measures each task type five times, and every measured run misses the true cost by up to one tenth, so the prices the network works with are a few percent wrong, exactly as they are in reality. The `price` section of the report puts the measured cost beside the true cost so that the error can be read.

## What gets printed

The report is printed in eight parts.

- **cost**: how many tasks were submitted, how many executions that took, and what share of the compute was spent verifying rather than producing.
- **security**: how many wrong values were returned, how many the network rejected, how many it paid for without noticing, and how many correct values it rejected by mistake.
- **identity**: how many accounts were opened, how many a Sybil attacker abandoned, what opening them cost, what the Sybil attackers kept in the end, and how many tasks were refused for lack of credits.
- **economics**: credits created, credits consumed, and credits not settled yet at the end of the run.
- **price**: the measured cost against the true cost for every task type, and the arbitrage between them — how much a worker would gain by only accepting the task type the benchmark over-measured.
- **validity**: how each comparison behaved, task type by task type, and how many genuine results it threw away.
- **workers** and **devices**: what each kind of worker earned and how the network judged it, and what each account handed to the second device it added halfway through the run.

Two further runs are printed after the main one.

- **validity, comparing character for character**: the same scenario with one single change, every task type compared exactly. Two genuine executions of an inference never write the same numbers, so this run shows what a network costs itself when it only knows how to compare exactly.
- **timing of payment**: the same scenario once per settlement policy — immediate credit, provisional credit, and delayed settlement — so that the price of making a worker wait before it can spend can be read in one table.

## What the run shows

Three results are worth looking for.

- The malicious workers end at the lowest trust the network allows and are caught within a few ticks, but they are still paid for a fraction of the wrong values they returned, because only a share of the tasks is ever verified.
- The Sybil attackers keep a negative amount: over this run, opening accounts costs the attackers more than the abandoned accounts brought in.
- Comparing character for character rejects nothing outright — it leaves tasks with no majority at all, and the network pays nobody for them. That is the failure mode of a comparison stricter than the machines it runs on.

## The files

- `main.ts`: composes the library, runs the three sets of runs, and prints them.
- `simulation_parameters.ts`: every value of this scenario, and nothing else. No number lives anywhere else in this folder.
- `report_printer.ts`: writes the measured metrics on the terminal. It only reads the report; it never computes a metric of its own.
