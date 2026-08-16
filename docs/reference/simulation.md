# Reference: Simulation

The primitives that run a whole simulated network over the modules above, and measure it. Every other folder of `src/` may be imported from here, and no other folder imports from here.

Everything here comes from `src/simulation/`. The measured numbers themselves are in [the reference of the metrics](metrics.md).

## `SimulationEngine`

One whole run of a simulated network.

### `new SimulationEngine(simulationParameters: SimulationParameters)`

`SimulationParameters` is the whole scenario: the seed, the length of the run, the workers, the task types, the rates, the thresholds, the policies, and the limits. Every question the design note leaves open appears here as a parameter rather than as a fixed choice in the code, because the purpose of the simulation is to measure the answers before choosing them.

The complete list of fields, each with a sentence saying what it sets, is in `src/simulation/simulation_types.ts`. A worked set of values is `examples/first_simulation/simulation_parameters.ts`, where every number of that scenario lives and no number of it lives anywhere else.

### `run(): SimulationReport`

Runs the whole scenario from the first tick to the last and returns what it measured.

### `ledger(): Ledger`, `referenceBenchmark(): ReferenceBenchmark`

The ledger of the run and the benchmark the prices were read from, for a caller that wants to look at the movements themselves rather than at the measured numbers.

## `ReportSummary`

The four families of metrics of section 11 of the design note, read from the counters of a run.

### `ReportSummary.summarize(simulationReport): SimulationSummary`

Nothing here measures anything new: every value is computed from the report. Every number of a `SimulationSummary` is a share or an average rather than a count, because two runs of different sizes cannot be compared by their counts — a run that executes half as many tasks meets half as much fraud, and that says nothing about how safe it was.

## `OperatingRegion`

The test of the central hypothesis of section 15 of the design note.

### `OperatingRegion.judge(simulationSummary, operatingRegionLimits): OperatingRegionVerdict`

`OperatingRegionLimits` holds `largestValidationShare`, `largestFraudulentCreditShare`, `largestUnfairRejectionShare`, and `largestHonestRefusalShare`.

`OperatingRegionVerdict` holds `isValidationCostLow`, `isFraudUnprofitable`, `isFrictionLow`, and `isInsideOperatingRegion`, which is true only when the three above all hold. A run that misses one of the three misses the point of the whole system.

Fraud counts as unprofitable when the share of the credits paid for wrong results stays inside its limit **and** what the Sybil attackers kept is at or below zero.

## `ParameterSweep`

One scenario run at several values of one parameter.

### `ParameterSweep.run(sweepPoints, seedCount): SweepResult[]`

Runs every point. A `SweepPoint` holds `pointName`, which is what the point changed written as it is shown, and `parameters`, which is the whole scenario at that value.

### `ParameterSweep.runPoint(sweepPoint, seedCount): SweepResult`

Runs one point with several seeds and averages what the runs measured, because one seed carries its own luck and the difference between two points has to be the parameter and not the draw. The seed of each run is the seed of the scenario plus the number of the run. Throws when `seedCount` is below one.

`SweepResult` holds the name of the point, the averaged summary, and the number of seeds.

## `RandomGenerator`

A seeded source of randomness. It never reads the global random number generator of the runtime, so the same seed always produces the same run.

### `new RandomGenerator(seed: number)`, `nextNumber(): number`, `asRandomNumberFn(): RandomNumberFn`, `pick(items)`

`asRandomNumberFn` returns the draw as the plain function shape every policy of the library expects. `pick` draws one item of a list and throws when the list is empty.

## `SimulationClock`

The virtual time of a run, counted in ticks. No inference is executed during a run, so no real duration is ever measured, and one tick holds the tasks submitted during one round of the network.

### `currentTick(): number`, `advance(): number`

The first tick is 0.

## `WorkerBehavior`

The way each kind of worker produces the value it returns. The simulation never executes an inference: each task has one true vector of numbers, and the behaviour of the worker decides what comes back.

### `WorkerBehavior.produceResult(workerProfile, trueVector, noiseRatio, randomNumberFn): ProducedResult`

`ProducedResult` holds `resultValue`, written as numbers separated by commas, and `isGenuine`. A genuine result can still differ from the genuine result of another worker, because two correct executions are not identical.

### `WorkerBehaviorName`

- `honest` — performs the computation and returns what it found.
- `unstable` — performs the computation, and sometimes returns a badly wrong value because of the hardware, the runtime, a crash, or a numerical problem. It does not try to cheat.
- `malicious` — never performs the computation, and returns a value of the right shape and of the wrong content.
- `sybil attacker` — behaves exactly like a malicious worker, and abandons its account for a freshly created one as soon as the network has lowered its trust far enough to make it unprofitable.

`WorkerProfile` holds the account, the device, the behaviour, and `errorProbability`, which is ignored for a malicious worker because a malicious worker never performs the computation at all. `WorkerBehaviorNameSchema` and `WorkerProfileSchema` validate them.

## `MetricsCollector`

The counters of a run. The engine calls one `record…` method per thing that happened — a task submitted, an execution performed, a result paid, a result rejected, a comparison made, a task left unresolved, a task left unassigned, a confiscation, credits dropped, a task refused, an account abandoned, a worker reaching the trusted threshold — and `buildReport(reportInputs)` turns the counters into a `SimulationReport` at the end.

A caller that runs the engine does not need this class. It is exported for a caller composing its own run out of the parts of the library.

## Related

- [The context of `/src/simulation`](../../src/simulation/CONTEXT.md)
- [The example that runs one scenario](../../examples/first_simulation/README.md)
- [The example that sweeps the parameters](../../examples/parameter_sweeps/README.md)
