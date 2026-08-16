# Directory Context: `/examples/parameter_sweeps`

## Purpose
Runs the first scenario at many values of one parameter at a time, and judges every value against the three conditions that say where the network is worth running.

## Key Exports & Entry Points
- `main.ts`: runs every sweep and writes the tables.
- `sweep_definitions.ts`: the six sweeps of section 10, the limits of section 15, the tuned scenario the sweeps point at, and the sweep over the share of attackers that scenario is held to.
- `sweep_printer.ts`: writes one sweep as one table, and the reason every value that fell outside the region did.
- Command to run this folder: `npm run example:parameter_sweeps`

## Rules
- A sweep moves one parameter and nothing else. A sweep over a share holds the number of workers fixed and trades one kind of worker for another, because a sweep that also changes the number of accounts changes the load each account carries and then measures two things at once.
- Every point is run with several seeds and the metrics are averaged, so that the difference between two points is the parameter and not the draw.
- The limits in `sweep_definitions.ts` are a first guess written down in one place. They are what the sweeps are held to, not a result the sweeps produced.
- The base scenario is imported from `first_simulation`, so the two examples never drift apart.

## Background
- The five parameters swept come from section 10 of [the design note](../../docs/explanation/design_note.md), the metrics from section 11, and the three conditions from section 15. The sixth sweep, over the deficit allowed to a new account, was added because the first five showed that deficit deciding almost all of the friction an honest worker meets.
