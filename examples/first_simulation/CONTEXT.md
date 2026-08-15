# Directory Context: `/examples/first_simulation`

## Purpose
The first scenario run over the library: twenty honest workers, four unstable workers, two malicious workers, and one task out of ten duplicated for validation.

## Key Exports & Entry Points
- `main.ts`: composes the library, runs the scenario, and prints the report.
- `simulation_parameters.ts`: the values of this scenario, and nothing else.
- `report_printer.ts`: writes the measured metrics on the terminal.
- Command to run this folder: `npm run example:first_simulation`

## Rules
- Every value of the scenario lives in `simulation_parameters.ts`. No number is written inside `main.ts` or inside `report_printer.ts`.
- The run is reproducible: the seed is fixed, so the same parameters always print the same report.
- The printer only reads the report. It never computes a metric the library did not measure, otherwise a metric would exist that no other example could obtain.

## Background
- The task types follow the example of section 2 of [the design note](../../docs/design_note.md): the reference task costs 10 seconds and is worth 1 credit, task A costs 30 seconds, and task B costs 5 seconds. Those are the true costs; the scenario measures each of them five times with an error of up to one tenth, which is the pricing error of section 10.
