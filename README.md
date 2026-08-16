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

- `src/`: the library. Its one public interface is `src/index.ts` — see [its README](src/README.md).
- `examples/first_simulation/`: the first scenario, which uses the library exactly as an external user would — see [its README](examples/first_simulation/README.md).
- `examples/parameter_sweeps/`: the same scenario at many values of one parameter at a time, judged against the three conditions the network has to meet at once — see [its README](examples/parameter_sweeps/README.md).
- `tests/`: the tests of the library, one file per part of the library.
- `docs/`: everything written about the repository that is not a `CONTEXT.md` and not the `README.md` of a folder — see [its index](docs/README.md).

Each folder holds a `CONTEXT.md` that states what the folder is responsible for and which boundary must not be broken.

## Commands

- `npm test`: run every test of `tests/`.
- `npm run typecheck`: type check `src`, `examples`, and `tests`, and emit nothing.
- `npm run build`: compile `src` into `dist/`, with the declaration files. The examples are never published.
- `npm run example:first_simulation`: run the first scenario.
- `npm run example:parameter_sweeps`: run the six parameter sweeps and judge the central hypothesis.

## Documents

Everything is indexed in [`docs/README.md`](docs/README.md), and the documents are split by the question the reader is asking.

- Never ran this repository: [the tutorial](docs/tutorial/01_first_simulation.md).
- One task to perform: [the guides](docs/guides/).
- The exact parameters of an exported name: [the reference](docs/reference/public_interface.md).
- Why the design is the way it is: [the explanation](docs/explanation/), starting with [the design note](docs/explanation/design_note.md).
- What the repository measured: [the central hypothesis](docs/explanation/the_central_hypothesis.md).

The authoritative versions of two of them live in the issue tracker.

- The design note: [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1)
- The implementation plan: [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2)
