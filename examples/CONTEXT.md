# Directory Context: `/examples`

## Purpose
The scenarios that run over the library. An example is the proof that the public interface of the library is complete.

## Key Exports & Entry Points
- `first_simulation/`: the first scenario, run once in full and once per settlement policy — see its own CONTEXT.md.
- `parameter_sweeps/`: the same scenario at many values of one parameter at a time, judged against the three conditions of section 15 of the design note — see its own CONTEXT.md.

## Rules
- An example imports the library through `src/index.ts` only, never through a file inside `src/`. Anything an example cannot reach that way is a gap in the library, and the gap is filled in the library rather than worked around here.
- An example holds no rule of the network. It chooses parameters, runs, and prints.
- No example is ever compiled into `dist/`, because `tsconfig.build.json` includes `src` only.

## Background
- The example as the only consumer of the library is the organizing principle of [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).
