# Directory Context: `/src/validation`

## Purpose
The validity of a result: which tasks are duplicated, whether two results say the same thing, and what happens when they do not.

## Key Exports & Entry Points
- `validation_sampler.ts`: `ValidationSampler.mustValidate(trustScore, hasRecentError)` decides whether the next task is duplicated.
- `result_comparator.ts`: `ResultComparator.compare(taskTypeName, resultValueA, resultValueB)` returns `agreement` or `disagreement`, using the strategy of that task type.
- `disagreement_resolver.ts`: `DisagreementResolver.resolveByMajority(...)` and `DisagreementResolver.resolveByTrustWeight(...)` name the accounts that agree with the value that won and those that do not.

## Rules
- Validation is sampled, never complete. Executing every task twice would remove most of the economic advantage of the network.
- How often a worker is verified follows its trust: often when it is new, rarely once it has been confirmed many times, and more than anyone else right after it was caught. Between the two thresholds the rate falls in a straight line, so verification becomes rarer with every confirmed result rather than at one single moment.
- Two correct executions of the same task do not return the same value, so each task type says how its results are compared. A comparison that only knows how to read characters is one choice among four, never the assumption.
- A value the strategy cannot read is compared character for character, so a worker cannot escape a comparison by returning something unreadable.
- Two results that disagree never decide by themselves which one is wrong. A third source of truth is required, and the winning group needs strictly more than half of the votes.
- Results are gathered into groups through the comparison strategy of their task type, never through a plain string equality, otherwise two correct executions that differ by a rounding would each open a group of their own and no group would ever win.
- Nothing here imports from `pricing/`, `trust/`, or `ledger/`. A trust score arrives as a plain number or as a `WorkerTrustFn`, and the folder never asks where it came from.

## Background
- Sampled validation, duplication, and the third source of truth come from section 4 of [the design note](../../docs/design_note.md). The four comparison strategies answer section 12.1, and weighing a vote by trust is the "compare against a highly trusted worker" of section 4.
