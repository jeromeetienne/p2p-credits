# Reference: The Metrics

Every number one run measures. The families are the four of section 11 of [the design note](../explanation/design_note.md): security, cost, economics, and user experience.

There are two shapes. A `SimulationReport` holds the raw counters of one run. A `SimulationSummary` holds the shares and averages read from those counters, and is what two runs of different sizes can be compared by, because a run that executes half as many tasks meets half as much fraud and that says nothing about how safe it was.

## `SimulationSummary`

This is the shape a sweep averages and the shape the operating region judges.

### Security

| Field | What it measures |
|---|---|
| `falseResultAcceptedShare` | Share of the results that were not genuine and that the network paid for anyway. |
| `fraudulentCreditShare` | Share of the credits created that were paid for results that were not genuine. |
| `averageDetectionDelayTicks` | Average number of ticks between the first wrong result of an account and the first time the network rejected one of its results. `undefined` when no account was ever caught. |
| `largestLossBeforeFirstRejection` | Largest amount one single account was paid for wrong results before it was ever caught, in credits. |
| `sybilAttackerProfit` | What every Sybil attacker kept, taken together: the credits its accounts hold at the end, less what opening those accounts cost. At or below zero means the attack did not pay for itself. |

### Cost

| Field | What it measures |
|---|---|
| `validationShare` | Share of the executions spent on validation rather than on the work asked for. |
| `executionsPerTask` | Average number of times one task was executed, counting the copies. |
| `arbiterShare` | Share of the executions that were the third opinion asked for to settle a disagreement. |

### Economics

| Field | What it measures |
|---|---|
| `creditsCreated` | Total amount of credits created during the run. |
| `inflationRatio` | Credits created for every credit consumed. Above 1 means the network is inflating. It is 1 when nothing was created and nothing consumed, and positive infinity when credits were created while nothing at all was consumed — because a run that created credits against no consumption is the most inflated run there is, not the least. |
| `creditShareOfRichestTenth` | Share of the credits held by the richest tenth of the accounts. |

### User experience

| Field | What it measures |
|---|---|
| `averageTicksToTrusted` | Average tick at which an honest worker first became trusted. `undefined` when none ever did. |
| `averageSpendableDelayTicks` | Average number of ticks a worker waits between being paid and being able to spend. |
| `unfairRejectionShare` | Share of the genuine results the network rejected anyway. |
| `honestRefusalShare` | Share of the tasks asked for by an honest worker that the network refused. |

## `SimulationReport`

The counters themselves. Only the fields whose meaning is not obvious from their name are listed here; the complete list, each field with a sentence, is in `src/simulation/simulation_types.ts`.

### The run

`tickCount`, `taskCount`, `executionCount`, `validationCopyExecutionCount`, `arbiterExecutionCount`, `validationOverheadRatio`.

### What came back and what the network did with it

| Field | What it counts |
|---|---|
| `wrongResultCount` | Returned values that were not the correct value of the task. |
| `wrongResultDetectedCount`, `wrongResultUndetectedCount` | The ones the network rejected, and the ones it paid for without noticing. |
| `correctResultRejectedCount` | Correct values the network rejected, which is the unfair penalty of an honest worker. |
| `unresolvedTaskCount` | Tasks where no value reached a majority, so nobody was paid. This is the failure mode of a comparison stricter than the machines it runs on. |
| `unassignedTaskCount` | Tasks nobody executed, because every device was suspended at that moment. |
| `creditsAwardedForWrongResults` | Credits paid for wrong values. |

### The penalties

| Field | What it counts |
|---|---|
| `suspensionCount` | Suspensions pronounced during the run. |
| `confiscatedCredits` | Credits taken back from workers caught returning a wrong result. |
| `droppedHeldCredits` | Credits a settlement policy was still holding, dropped before ever being recorded, because the worker they were owed to was caught first. These never entered the ledger, so they are counted apart from the credits taken back from it. |

### The identities

| Field | What it counts |
|---|---|
| `createdAccountCount` | Accounts ever opened, including the ones a Sybil attacker opened after abandoning another. |
| `abandonedAccountCount` | Accounts a Sybil attacker abandoned after the network stopped trusting them. |
| `totalIdentityCost` | What opening every account cost, taken together. |
| `refusedTaskCount`, `refusedTaskCounts` | Tasks the network refused because the account asking had not contributed enough, in total and per kind of worker. |

### The prices

| Field | What it measures |
|---|---|
| `creditsCreatedByPricingError` | Credits created only because the benchmark did not measure the true cost. A negative amount means the network paid its workers less than the work they performed. |
| `pricingArbitrageRatio` | The highest profitability ratio divided by the lowest. A value of 1 means every task type pays exactly the work it costs, and a value above 1 measures how much a worker would gain by picking the task type the benchmark over-measured. |
| `taskTypePricingSummaries` | Per task type: the true cost, the measured cost, the price, the true price, and the ratio between the two prices. |

### The workers and the devices

`workerSummaries` holds, per worker, the balance, the combined trust, the account trust, the device trust, the counts of confirmed and contradicted results, and the tick the worker first became trusted at.

`deviceSummaries` holds, per device, the device trust, the trust of the owning account, the combined trust, and the tick the device joined the network at. This is where the question of section 12.3 becomes readable: a trusted account meets a device that earned nothing.

`taskTypeValidationSummaries` holds, per task type, the comparison strategy used, how many comparisons were made, how many ended in a disagreement, and how many genuine results were rejected anyway.

## Related

- [Reading the report](../tutorial/02_reading_the_report.md)
- [The central hypothesis](../explanation/the_central_hypothesis.md)
