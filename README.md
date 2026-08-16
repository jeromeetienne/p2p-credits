# p2p-credits

Credit Accounting for a Peer-to-Peer Network

A user contributes computing resources when they do not use them, their account accumulates credits, and they later spend those credits to have their own tasks executed by the network. This repository holds the library that keeps that accounting, and a simulation that measures whether the accounting survives fraud.

The library answers three separate questions, and records the movements of credits that follow:

- `price(task)`: how many credits is this task worth?
- `trust(worker)`: how much should this worker be trusted?
- `validity(result)`: how likely is this result to be correct?

## Install

```bash
npm install
```

## Run the first simulation

```bash
npm run example:first_simulation
```

## Run the parameter sweeps

```bash
npm run example:parameter_sweeps
```

## Layout

- `src/`: the library. Its one public interface is `src/index.ts`.
- `examples/first_simulation/`: the first scenario, which uses the library exactly as an external user would.
- `examples/parameter_sweeps/`: the same scenario at many values of one parameter at a time, judged against the three conditions the network has to meet at once.
- `tests/`: the tests of the library, one file per part of the library.
- `docs/design_note.md`: the design note the whole repository implements.

Each folder holds a `CONTEXT.md` that states what the folder is responsible for and which boundary must not be broken.

## Commands

- `npm test`: run every test of `tests/`.
- `npm run typecheck`: type check `src`, `examples`, and `tests`, and emit nothing.
- `npm run build`: compile `src` into `dist/`, with the declaration files. The examples are never published.
- `npm run example:first_simulation`: run the first scenario.
- `npm run example:parameter_sweeps`: run the six parameter sweeps and judge the central hypothesis.

## Documents

- The design note: [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1)
- The implementation plan: [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2)
