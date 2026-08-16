# Directory Context: `/src/simulation`

## Purpose
The primitives that run a simulated network over the rest of the library: virtual time, seeded randomness, simulated workers, counters, and the run loop.

## Key Exports & Entry Points
- `simulation_engine.ts`: `SimulationEngine.run()` runs one scenario and returns its report.
- `simulation_types.ts`: `SimulationParameters` and `SimulationReport`, what a run receives and what a run measures.
- `worker_behavior.ts`: the honest worker, the unstable worker, and the malicious worker.
- `metrics_collector.ts`: the counters of a run and the report built from them.
- `report_summary.ts`: `ReportSummary.summarize(...)` turns those counters into the four families of metrics.
- `operating_region.ts`: `OperatingRegion.judge(...)` says whether one run met the three conditions of section 15.
- `parameter_sweep.ts`: `ParameterSweep.run(...)` runs one scenario at several values of one parameter, several seeds each.
- `random_generator.ts`: the seeded source of randomness.
- `simulation_clock.ts`: the virtual time, counted in ticks.

## Rules
- No inference is ever executed. Each task has one true vector of numbers, and the behaviour of the worker decides what comes back: that vector carrying the small differences of a real execution, that vector badly damaged, or a vector of the right shape that was never computed at all.
- A result carries whether the worker really performed the computation. The network never receives that, and the simulation never judges a result by comparing it with the true vector, because a genuine result is not expected to be identical to anything.
- Only this folder knows which value was the correct one, and only this folder knows the true cost of a task type. The rest of the library judges a result exclusively by comparing it with the result of another worker, and prices a task exclusively from what the benchmark measured. Neither must ever receive the true value.
- The benchmark of a run is measured with noise, so the prices the network uses are wrong by a few percent, as they always are in reality.
- The engine owns no rule of its own. It composes the price, the trust, the validation, the scheduling, and the ledger, exactly as a real network would.
- Nothing outside this folder imports from it, apart from `index.ts`.
- A metric that two runs are compared by is a share or an average, never a count. A run that executes half as many tasks meets half as much fraud, and that says nothing about how safe it was.

## Background
- The kinds of worker and what a run must model come from section 9 of [the design note](../../docs/design_note.md), the parameters from section 10, and the measured metrics from section 11.
