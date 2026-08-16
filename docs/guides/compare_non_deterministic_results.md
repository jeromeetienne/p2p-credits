# Compare Results That Are Not Deterministic

Two correct executions of the same task can return slightly different values. A network that only knows how to compare character for character therefore rejects honest workers, and a network that compares too loosely pays a worker that never performed the computation. Section 12.1 of [the design note](../explanation/design_note.md) asks the question and leaves it open, so each task type says how its results are compared.

## The four strategies

| Strategy | What it does | Use it for |
|---|---|---|
| `exact` | The two values have to be written the same way, character for character. | A result that is genuinely deterministic: an identifier, a decision, a piece of text produced by a fixed procedure. |
| `numerical tolerance` | Every number of the two values has to be close enough to its counterpart. | A vector of numbers produced by an inference, where the differences come from the hardware and not from the worker. |
| `normalized hash` | The two values are rewritten in one canonical form, which is then compared exactly. | A result that has several correct spellings — different spacing, different capitalisation, or numbers with a different count of decimals. |
| `similarity score` | The two values are read as vectors, and the angle between them has to be small enough. | An embedding, where the direction of the vector is the meaning and the length of it is not. |

## Setting one

The comparator takes one default strategy, and one strategy per task type that needs its own.

```ts
import { ResultComparator } from '../../src/index.js';

const resultComparator = new ResultComparator({
	defaultStrategy: {
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.001,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	strategyByTaskTypeName: new Map([
		[
			'task C',
			{
				strategyName: 'similarity score',
				numericalTolerance: 0,
				decimalCount: 6,
				similarityThreshold: 0.99,
			},
		],
	]),
});

resultComparator.compare('task C', resultValueA, resultValueB);
```

Every strategy carries all four values, and each strategy reads only the one it needs: `numericalTolerance` for `numerical tolerance`, `decimalCount` for `normalized hash`, `similarityThreshold` for `similarity score`, and none of them for `exact`. The unused values still have to be written, and they still have to pass the schema.

## Picking the tolerance

The tolerance is a share, not an absolute difference. Two numbers agree when they differ by less than the tolerance multiplied by the larger of the two — and never by less than the tolerance multiplied by 1, so two numbers that both sit very close to zero are not held to an impossible precision.

Start from the non-determinism of the machines themselves. In the simulation that is the `honestNoiseRatio` parameter, which is the largest share by which one number of a genuine result may miss the true number. A tolerance below that noise rejects honest workers, and a tolerance far above it lets a fabricated value through.

## Two things that go wrong

**Too strict.** Run the first simulation. It prints the same scenario a second time with every task type compared character for character. That run does not reject honest workers loudly — it leaves tasks with no majority at all, so nobody is paid and the task simply disappears. A comparison stricter than the machines it runs on fails by producing nothing, not by producing complaints.

**Too loose.** A fabricated value that lands inside the tolerance is confirmed, the worker that produced it gains trust, and the network then verifies that worker less often. The share of the credits paid for wrong results is where this shows up.

## The value that cannot be read from a comparison

A value that cannot be read as a vector of numbers falls back on the exact comparison, whatever strategy was chosen. This applies to `numerical tolerance` and to `similarity score`, and it means a task type returning text gets an exact comparison even when it was configured with a tolerance.

## The exact signatures

- [The reference of the validation](../reference/validation.md).
