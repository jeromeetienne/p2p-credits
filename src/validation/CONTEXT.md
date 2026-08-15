# Directory Context: `/src/validation`

## Purpose
The validity of a result: which tasks are duplicated, whether two results say the same thing, and what happens when they do not.

## Key Exports & Entry Points
- `validation_sampler.ts`: `ValidationSampler.mustValidate()` decides whether the next task is duplicated.
- `result_comparator.ts`: `ResultComparator.compare(resultValueA, resultValueB)` returns `agreement` or `disagreement`.
- `disagreement_resolver.ts`: `DisagreementResolver.resolveByMajority(taskResults)` names the accounts that agree with the majority and those that do not.

## Rules
- Validation is sampled, never complete. Executing every task twice would remove most of the economic advantage of the network.
- Two results that disagree never decide by themselves which one is wrong. A third source of truth is required, and a majority needs strictly more than half of the copies.
- Nothing here imports from `pricing/`, `trust/`, or `ledger/`. The sampler receives a rate, not a trust score, until adaptive validation is measured.

## Background
- Sampled validation, duplication, and the third source of truth come from section 4 of [the design note](../../docs/design_note.md). The exact comparison of this first version is the simplest of the strategies listed in section 12.1; the numerical tolerance, the normalized hash, the similarity score, and the adaptive rate are milestone 4 of [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).
