# p2p-credits

Credit Accounting for a Peer-to-Peer Network

A user contributes computing resources when they do not use them, their account accumulates credits, and they later spend those credits to have their own tasks executed by the network. This repository holds the library that keeps that accounting, and a simulation that measures whether the accounting survives fraud.

The library answers three separate questions, and records the movements of credits that follow:

- `price(task)`: how many credits is this task worth?
- `trust(worker)`: how much should this worker be trusted?
- `validity(result)`: how likely is this result to be correct?

## Start here

Never ran this repository: [the tutorial](docs/tutorial/01_first_simulation.md) goes from `npm install` to a printed report, and then to a parameter sweep. Everything else written about the repository is indexed in [`docs/README.md`](docs/README.md).

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
- `tests/`: the tests of the library, one file per part of the library — 107 tests in 13 files.
- `docs/`: everything written about the repository that is not a `CONTEXT.md` and not the `README.md` of a folder — see [its index](docs/README.md).
  - [`docs/tutorial/`](docs/tutorial/01_first_simulation.md): numbered lessons, for a reader who has never run the repository.
  - [`docs/guides/`](docs/guides/): one document per task, for a reader who already knows the vocabulary.
  - [`docs/reference/`](docs/reference/public_interface.md): the exact parameters of every name the library exports, one document per folder of `src/`.
  - [`docs/explanation/`](docs/explanation/): why the design is the way it is, starting with [the design note](docs/explanation/design_note.md).

Each folder holds a `CONTEXT.md` that states what the folder is responsible for and which boundary must not be broken.

## Commands

- `npm test`: run the 107 tests of `tests/`.
- `npm run typecheck`: type check `src`, `examples`, and `tests`, and emit nothing.
- `npm run build`: compile `src` into `dist/`, with the declaration files. The examples are never published.
- `npm run example:first_simulation`: run the first scenario.
- `npm run example:parameter_sweeps`: run every parameter sweep and judge the central hypothesis.

## Documents

Everything is indexed in [`docs/README.md`](docs/README.md), and the documents are split by the question the reader is asking rather than by the part of the code the answer is about. The four folders are listed under `docs/` in the layout above.

Two documents are worth naming on their own.

- [The design note](docs/explanation/design_note.md), which the whole repository implements.
- [The central hypothesis](docs/explanation/the_central_hypothesis.md), which is what the repository measured and what the measurement means.

The copy of the design note under `docs/` is a copy: the authoritative version lives in the issue tracker, together with the implementation plan the repository was built from.

- The design note: [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1)
- The implementation plan: [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2)
