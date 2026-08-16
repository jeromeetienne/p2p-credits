# 1. From Nothing To A Printed Report

This lesson takes a machine that has never seen this repository and ends with one whole simulated network printed on the terminal. It takes a few minutes. Nothing is installed outside the repository, and no network service is called.

## What the repository is

A user contributes computing resources when they do not use them, their account accumulates credits, and they later spend those credits to have their own tasks executed by the network. The library in `src/` keeps that accounting. The examples in `examples/` run a simulated network over the library and measure whether the accounting survives fraud.

Nothing here executes a real inference. The simulation gives every task one true vector of numbers, and the workers return that vector well, badly, or without ever having computed it.

## Install

```bash
npm install
```

The repository has one dependency at run time, which is Zod, and three that are needed only while working on it, which are the type checker, the runner that executes TypeScript directly, and the type declarations of Node.js.

## Check that the repository is sound

```bash
npm test
```

Every test of `tests/` runs, one file per part of the library. If this command fails on a fresh copy of the repository, stop here: nothing further in this lesson will mean anything.

## Run the first simulation

```bash
npm run example:first_simulation
```

This runs `examples/first_simulation/main.ts`, which composes the library into one whole network and runs it from the first tick to the last.

The scenario is twenty honest workers, four unstable workers, two malicious workers, and two Sybil attackers. They submit tasks, execute the tasks of the others, get verified as often as their trust deserves, get paid, and spend what they earned. Halfway through the run, every account adds a second device that has earned nothing of its own.

The run is reproducible. The seed is fixed in `examples/first_simulation/simulation_parameters.ts`, so the same command always prints the same report. This matters more than it sounds: without it, a difference measured between two sets of parameters could not be told apart from the luck of the draw.

## What just got printed

The report arrives in eight parts, named `cost`, `security`, `identity`, `economics`, `price`, `validity`, `workers`, and `devices`. Two further sets of runs are printed after the main one: the same scenario with every task type compared character for character, and the same scenario once per settlement policy.

Lesson 2 reads those parts one by one. For now, three things in the printed report are worth finding by eye.

- The two malicious workers end at the lowest trust the network allows, and they were still paid for some of the wrong values they returned, because only a share of the tasks is ever verified.
- The two Sybil attackers kept a negative amount. Over this run, opening accounts cost them more than the accounts they abandoned brought in.
- The run that compares character for character rejects almost nothing outright. It leaves tasks with no majority at all, and the network pays nobody for them.

## The four commands of this repository

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npm run example:first_simulation
```

```bash
npm run example:parameter_sweeps
```

The last one is the subject of lesson 3, and it takes noticeably longer than the others, because it is several hundred whole simulations.

## Next

- [2. Reading the report](02_reading_the_report.md)
