# Directory Context: `/`

## Purpose
This repository holds a credit accounting library for a peer-to-peer inference network, and one example that runs a simulation of that network over the library.

## Key Exports & Entry Points
- `src/`: the library, whose one public interface is `src/index.ts` — see its own CONTEXT.md.
- `examples/`: the scenarios that run over the library — see its own CONTEXT.md.
- `tests/`: the tests of the library — see its own CONTEXT.md.
- `docs/`: the tutorial, the guides, the reference, and the explanation, including the design note the whole repository implements — see its own CONTEXT.md.
- Command to run the tests: `npm test`
- Command to type check this folder: `npm run typecheck`
- Command to build the library: `npm run build`
- Command to run the first simulation: `npm run example:first_simulation`

## Rules
- `tsconfig.json` type checks `src`, `examples`, and `tests` and emits nothing; `tsconfig.build.json` compiles only `src` into `dist/`, so an example is never published.
- An example imports the library through `src/index.ts` only, never through a file inside `src/`, because an example is the proof that the public interface is complete.
- The library never calls the global random number generator. Every policy that needs randomness receives a `RandomNumberFn`, so a run can be reproduced from its seed.
- Every question the design note leaves open is a parameter of the simulation, never a fixed choice in the code.

## Background
- The design note is [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1) and the implementation plan is [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).
