# Directory Context: `/tests`

## Purpose
Holds every test of the library. One file per part of the library, named after the part it tests, so that a failure names the module it comes from before anything is read.

## Key Exports & Entry Points
- Nothing is exported from this folder: no file here is ever imported by `src` or by `examples`.
- Each file is named `<part>.test.ts` and is run on its own or with the others.
- Command to run this folder: `npm test`

## Rules
- A test imports from `../src/<folder>/<file>.js` directly, never from `../src/index.js` and never from `../examples`, so that a test names the module it exercises and a change made to an example never changes what a test measures.
- A test never reads the global random number generator and never reads the clock: a source of randomness is handed in as a `RandomNumberFn`, and a run of the simulation is given a seed.
- A test that runs the simulation writes its own `SimulationParameters` in the test file, rather than importing a scenario from `examples`.
- A test name is a sentence saying what must hold, not the name of the method it calls.

## Background
- The seeded generator that makes a run repeatable is described in `../src/simulation/random_generator.ts`.
- The plan these tests belong to is [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2), under the design note of [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1).
