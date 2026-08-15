import { z as Zod } from 'zod';

import type { TaskTypeName } from '../types/task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ResultComparator — decides whether two results say the same thing
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the name of a comparison strategy. */
export const ComparisonStrategyNameSchema = Zod.enum([
	'exact',
	'numerical tolerance',
	'normalized hash',
	'similarity score',
]);

/**
 * The name of a comparison strategy.
 *
 * - `exact`: the two values have to be written the same way, character for character.
 * - `numerical tolerance`: every number of the two values has to be close enough to its counterpart.
 * - `normalized hash`: the two values are rewritten in one canonical form, which is then compared exactly.
 * - `similarity score`: the two values are read as vectors, and the angle between them has to be small enough.
 */
export type ComparisonStrategyName = Zod.infer<typeof ComparisonStrategyNameSchema>;

/** Schema of a comparison strategy and of the values it needs. */
export const ComparisonStrategySchema = Zod.object({
	/** The name of the strategy. */
	strategyName: ComparisonStrategyNameSchema,
	/** Largest share by which two numbers may differ and still agree, used by `numerical tolerance`. */
	numericalTolerance: Zod.number().min(0),
	/** Number of decimals kept when a value is rewritten in its canonical form, used by `normalized hash`. */
	decimalCount: Zod.number().int().min(0),
	/** Lowest similarity that still counts as an agreement, between 0 and 1, used by `similarity score`. */
	similarityThreshold: Zod.number().min(0).max(1),
});

/**
 * A comparison strategy and the values it needs.
 *
 * Two correct executions of the same task can return slightly different values, so a network that only knows how to
 * compare exactly rejects honest workers. Each task type therefore says how its results are compared.
 */
export type ComparisonStrategy = Zod.infer<typeof ComparisonStrategySchema>;

/** The outcome of the comparison of two results. */
export type ComparisonOutcome = 'agreement' | 'disagreement';

/** The values the result comparator needs. */
export type ResultComparatorOptions = {
	/** The strategy used by every task type that has no strategy of its own. */
	defaultStrategy: ComparisonStrategy;
	/** The strategy of each task type that needs one of its own. */
	strategyByTaskTypeName: Map<TaskTypeName, ComparisonStrategy>;
};

/**
 * The comparison of two results returned for the same task.
 *
 * Section 12.1 of the design note asks how a network compares two results that are both correct and not identical.
 * The answer is not one comparison but several, chosen by task type, because the right answer for a hash is not the
 * right answer for a vector of numbers produced by an inference.
 */
export class ResultComparator {
	/** The strategy used by every task type that has no strategy of its own. */
	private _defaultStrategy: ComparisonStrategy;

	/** The strategy of each task type that needs one of its own. */
	private _strategyByTaskTypeName: Map<TaskTypeName, ComparisonStrategy>;

	/**
	 * @param resultComparatorOptions The default strategy and the strategy of each task type that needs one.
	 */
	constructor(resultComparatorOptions: ResultComparatorOptions) {
		this._defaultStrategy = resultComparatorOptions.defaultStrategy;
		this._strategyByTaskTypeName = resultComparatorOptions.strategyByTaskTypeName;
	}

	/**
	 * Returns the strategy that compares the results of one task type.
	 *
	 * @param taskTypeName Name of the task type.
	 * @returns The strategy of that task type, or the default strategy.
	 */
	strategyFor(taskTypeName: TaskTypeName): ComparisonStrategy {
		return this._strategyByTaskTypeName.get(taskTypeName) ?? this._defaultStrategy;
	}

	/**
	 * Compares two results returned for the same task.
	 *
	 * @param taskTypeName Name of the type of the task, which decides how the two values are compared.
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @returns `agreement` when the two values say the same thing, `disagreement` otherwise.
	 */
	compare(taskTypeName: TaskTypeName, resultValueA: string, resultValueB: string): ComparisonOutcome {
		const comparisonStrategy = this.strategyFor(taskTypeName);

		if (comparisonStrategy.strategyName === 'numerical tolerance') {
			return ResultComparator._compareWithNumericalTolerance(
				resultValueA,
				resultValueB,
				comparisonStrategy.numericalTolerance,
			);
		}
		if (comparisonStrategy.strategyName === 'normalized hash') {
			return ResultComparator._compareNormalizedForms(
				resultValueA,
				resultValueB,
				comparisonStrategy.decimalCount,
			);
		}
		if (comparisonStrategy.strategyName === 'similarity score') {
			return ResultComparator._compareSimilarity(
				resultValueA,
				resultValueB,
				comparisonStrategy.similarityThreshold,
			);
		}
		return ResultComparator._compareExactly(resultValueA, resultValueB);
	}

	/**
	 * Returns the similarity between two values read as vectors, which is the cosine of the angle between them.
	 *
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @returns The similarity between 0 and 1, or `undefined` when a value cannot be read as a vector.
	 */
	static similarityOf(resultValueA: string, resultValueB: string): number | undefined {
		const vectorA = ResultComparator._readVector(resultValueA);
		const vectorB = ResultComparator._readVector(resultValueB);
		if (vectorA === undefined || vectorB === undefined || vectorA.length !== vectorB.length) {
			return undefined;
		}

		let dotProduct = 0;
		let squaredLengthA = 0;
		let squaredLengthB = 0;
		for (let index = 0; index < vectorA.length; index += 1) {
			const numberA = vectorA[index] ?? 0;
			const numberB = vectorB[index] ?? 0;
			dotProduct += numberA * numberB;
			squaredLengthA += numberA * numberA;
			squaredLengthB += numberB * numberB;
		}
		if (squaredLengthA === 0 || squaredLengthB === 0) {
			return undefined;
		}
		return dotProduct / (Math.sqrt(squaredLengthA) * Math.sqrt(squaredLengthB));
	}

	/**
	 * Compares two values written the same way, character for character.
	 *
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @returns `agreement` when the two values are written the same way.
	 */
	private static _compareExactly(resultValueA: string, resultValueB: string): ComparisonOutcome {
		if (resultValueA === resultValueB) {
			return 'agreement';
		}
		return 'disagreement';
	}

	/**
	 * Compares every number of two values, and accepts a difference small enough to come from the machine rather
	 * than from the worker.
	 *
	 * The tolerance is a share of the larger of the two numbers, and never falls below a share of 1, so two numbers
	 * that both sit very close to zero are not held to an impossible precision.
	 *
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @param numericalTolerance Largest share by which two numbers may differ and still agree.
	 * @returns `agreement` when every number is close enough to its counterpart.
	 */
	private static _compareWithNumericalTolerance(
		resultValueA: string,
		resultValueB: string,
		numericalTolerance: number,
	): ComparisonOutcome {
		const vectorA = ResultComparator._readVector(resultValueA);
		const vectorB = ResultComparator._readVector(resultValueB);
		if (vectorA === undefined || vectorB === undefined) {
			return ResultComparator._compareExactly(resultValueA, resultValueB);
		}
		if (vectorA.length !== vectorB.length) {
			return 'disagreement';
		}

		for (let index = 0; index < vectorA.length; index += 1) {
			const numberA = vectorA[index] ?? 0;
			const numberB = vectorB[index] ?? 0;
			const largestSize = Math.max(Math.abs(numberA), Math.abs(numberB), 1);
			if (Math.abs(numberA - numberB) > numericalTolerance * largestSize) {
				return 'disagreement';
			}
		}
		return 'agreement';
	}

	/**
	 * Rewrites two values in one canonical form and compares the two forms exactly.
	 *
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @param decimalCount Number of decimals kept for every number of the value.
	 * @returns `agreement` when the two canonical forms are the same.
	 */
	private static _compareNormalizedForms(
		resultValueA: string,
		resultValueB: string,
		decimalCount: number,
	): ComparisonOutcome {
		return ResultComparator._compareExactly(
			ResultComparator._normalizedFormOf(resultValueA, decimalCount),
			ResultComparator._normalizedFormOf(resultValueB, decimalCount),
		);
	}

	/**
	 * Compares the direction of two values read as vectors.
	 *
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @param similarityThreshold Lowest similarity that still counts as an agreement.
	 * @returns `agreement` when the two vectors point closely enough in the same direction.
	 */
	private static _compareSimilarity(
		resultValueA: string,
		resultValueB: string,
		similarityThreshold: number,
	): ComparisonOutcome {
		const similarity = ResultComparator.similarityOf(resultValueA, resultValueB);
		if (similarity === undefined) {
			return ResultComparator._compareExactly(resultValueA, resultValueB);
		}
		if (similarity >= similarityThreshold) {
			return 'agreement';
		}
		return 'disagreement';
	}

	/**
	 * Rewrites one value in its canonical form: every number kept to a fixed number of decimals, and any other text
	 * trimmed, written in lower case, and with its runs of spaces reduced to one.
	 *
	 * @param resultValue The value to rewrite.
	 * @param decimalCount Number of decimals kept for every number of the value.
	 * @returns The canonical form of the value.
	 */
	private static _normalizedFormOf(resultValue: string, decimalCount: number): string {
		const vector = ResultComparator._readVector(resultValue);
		if (vector === undefined) {
			return resultValue.trim().toLowerCase().replace(/\s+/g, ' ');
		}
		return vector.map((numberOfVector) => {
			return numberOfVector.toFixed(decimalCount);
		}).join(',');
	}

	/**
	 * Reads a value as a vector of numbers written one after the other and separated by commas.
	 *
	 * @param resultValue The value to read.
	 * @returns The numbers of the value, or `undefined` when the value is not a vector of numbers.
	 */
	private static _readVector(resultValue: string): number[] | undefined {
		const writtenNumbers = resultValue.split(',');
		const vector: number[] = [];
		for (const writtenNumber of writtenNumbers) {
			const trimmedNumber = writtenNumber.trim();
			if (trimmedNumber.length === 0) {
				return undefined;
			}
			const readNumber = Number(trimmedNumber);
			if (Number.isFinite(readNumber) === false) {
				return undefined;
			}
			vector.push(readNumber);
		}
		if (vector.length === 0) {
			return undefined;
		}
		return vector;
	}
}
