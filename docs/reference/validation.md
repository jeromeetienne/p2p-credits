# Reference: Validation

Whether a result is correct. Validating every result would cost the network most of its economic advantage, so only a share of the tasks is executed a second time, and that share depends on the worker.

Everything here comes from `src/validation/`.

## `ValidationSampler`

The choice of the tasks that are duplicated.

### `new ValidationSampler(validationSamplerOptions: ValidationSamplerOptions)`

`ValidationSamplerOptions` holds:

- `untrustedValidationRate: number` — the share duplicated for a worker at or below the untrusted threshold.
- `trustedValidationRate: number` — the share duplicated for a worker at or above the trusted threshold.
- `recentErrorValidationRate: number` — the share duplicated for a worker that returned an invalid result recently.
- `untrustedThreshold: number`, `trustedThreshold: number` — the two scores those rates belong to.
- `randomNumberFn: RandomNumberFn` — the source of randomness, so a run can be reproduced from its seed.

### `validationRateFor(trustScore, hasRecentError): number`

The share of the tasks duplicated for one worker. A recent error wins over everything else. Between the two thresholds the rate falls in a straight line, so a worker sees its verification become rarer with every result it gets confirmed, rather than at one single moment.

### `mustValidate(trustScore, hasRecentError): boolean`

Draws one number and answers whether this task is duplicated.

## `ResultComparator`

Whether two results say the same thing.

### `new ResultComparator(resultComparatorOptions: ResultComparatorOptions)`

`ResultComparatorOptions` holds:

- `defaultStrategy: ComparisonStrategy` — used by every task type that has none of its own.
- `strategyByTaskTypeName: Map<TaskTypeName, ComparisonStrategy>` — the strategy of each task type that needs one.

### `ComparisonStrategy`

Validated by `ComparisonStrategySchema`, and holding all four values whichever strategy is named:

- `strategyName: ComparisonStrategyName`
- `numericalTolerance: number` — the largest share by which two numbers may differ and still agree.
- `decimalCount: number` — the number of decimals kept in a canonical form.
- `similarityThreshold: number` — the lowest similarity that still counts as an agreement, between 0 and 1.

### `ComparisonStrategyName`

- `exact` — the two values have to be written the same way, character for character.
- `numerical tolerance` — every number of the two values has to be close enough to its counterpart. The tolerance is a share of the larger of the two numbers, and never of less than 1, so two numbers close to zero are not held to an impossible precision.
- `normalized hash` — the two values are rewritten in one canonical form, which is then compared exactly.
- `similarity score` — the two values are read as vectors, and the angle between them has to be small enough.

`ComparisonStrategyNameSchema` validates the name at run time.

### `compare(taskTypeName, resultValueA, resultValueB): ComparisonOutcome`

`agreement` or `disagreement`. A value that cannot be read as numbers separated by commas falls back on the exact comparison, whatever strategy was named.

### `strategyFor(taskTypeName): ComparisonStrategy`

The strategy of that task type, or the default strategy.

### `ResultComparator.similarityOf(resultValueA, resultValueB): number | undefined`

The cosine of the angle between the two values read as vectors, or `undefined` when a value cannot be read as a vector or the two have different lengths.

## `DisagreementResolver`

The winning result when workers return different ones. Every method is static and nothing is stored.

### `DisagreementResolver.resolveByMajority(taskResults, resultComparator, taskTypeName): MajorityOutcome`

Every worker carries one vote, and a value wins when more than half of the copies returned it.

### `DisagreementResolver.resolveByTrustWeight(taskResults, resultComparator, taskTypeName, workerTrustFn, minimumVoteWeight): MajorityOutcome`

A worker carries a vote as heavy as its trust, so a value returned by one highly trusted worker can outweigh a value returned by several workers nobody has confirmed yet. Every worker keeps a vote of at least `minimumVoteWeight`, so a worker at the bottom of the scale still counts for something and a single trusted worker cannot decide alone against everybody else.

### `MajorityOutcome`

- `majorityResultValue: string | undefined` — the value that won, or `undefined` when no value gathered more than half of the votes.
- `agreeingAccountIds: AccountId[]`, `disagreeingAccountIds: AccountId[]`.

`ResolutionMethodName` is `majority` or `trust weighted`, and `ResolutionMethodNameSchema` validates it.

### How the results are grouped

Results are gathered into groups that say the same thing, through the comparison strategy of their task type and never through a plain string equality — otherwise two correct executions differing by a rounding would each open a group of their own and no group would ever win.

Every pair is compared, and the groups are the parts the agreements connect: two results sit in the same group when they agree, or when a chain of agreements leads from one to the other. A tolerant comparison does not carry over from one pair to the next, so gathering each result into the first group it happened to agree with would make the verdict depend on the order of the draw, and would reject an honest worker in one order and confirm it in another.

## Related

- [Compare results that are not deterministic](../guides/compare_non_deterministic_results.md)
- [The context of `/src/validation`](../../src/validation/CONTEXT.md)
