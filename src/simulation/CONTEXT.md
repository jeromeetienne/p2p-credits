# Directory Context: `/src/simulation`

## Purpose
The primitives that run a simulated network over the rest of the library: virtual time, seeded randomness, simulated workers, counters, and the run loop.

## Key Exports & Entry Points
- `simulation_engine.ts`: `SimulationEngine.run()` runs one scenario and returns its report.
- `simulation_types.ts`: `SimulationParameters` and `SimulationReport`, what a run receives and what a run measures.
- `worker_behavior.ts`: the honest worker, the unstable worker, and the malicious worker.
- `metrics_collector.ts`: the counters of a run and the report built from them.
- `random_generator.ts`: the seeded source of randomness.
- `simulation_clock.ts`: the virtual time, counted in ticks.

## Rules
- No inference is ever executed. Each task has one correct value, and the behaviour of the worker decides whether that value is returned.
- Only this folder knows which value was the correct one. The rest of the library judges a result exclusively by comparing it with the result of another worker, and must never receive that information.
- The engine owns no rule of its own. It composes the price, the trust, the validation, the scheduling, and the ledger, exactly as a real network would.
- Nothing outside this folder imports from it, apart from `index.ts`.

## Background
- The kinds of worker and what a run must model come from section 9 of [the design note](../../docs/design_note.md), the parameters from section 10, and the measured metrics from section 11.
