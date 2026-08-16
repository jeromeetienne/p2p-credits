import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { ResultComparator, type ComparisonStrategy } from '../src/validation/result_comparator.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ResultComparatorTest — the four ways two results are said to agree or not
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds a comparator that uses one strategy for every task type.
 *
 * @param comparisonStrategy The strategy to use.
 * @returns The comparator.
 */
function buildComparator(comparisonStrategy: Partial<ComparisonStrategy>): ResultComparator {
	return new ResultComparator({
		defaultStrategy: {
			strategyName: 'exact',
			numericalTolerance: 0,
			decimalCount: 6,
			similarityThreshold: 1,
			...comparisonStrategy,
		},
		strategyByTaskTypeName: new Map(),
	});
}

test('the exact comparison refuses two correct executions that differ by a rounding', () => {
	const resultComparator = buildComparator({
		strategyName: 'exact',
	});

	Assert.equal(resultComparator.compare('a task', '1.000000', '1.000000'), 'agreement');
	Assert.equal(resultComparator.compare('a task', '1.000000', '1.000001'), 'disagreement');
});

test('a numerical tolerance accepts a difference below it and refuses one above it', () => {
	const resultComparator = buildComparator({
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.01,
	});

	Assert.equal(resultComparator.compare('a task', '100,200', '100.5,200'), 'agreement');
	Assert.equal(resultComparator.compare('a task', '100,200', '103,200'), 'disagreement');
});

test('a numerical tolerance holds two numbers near zero to the tolerance itself', () => {
	const resultComparator = buildComparator({
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.01,
	});

	Assert.equal(resultComparator.compare('a task', '0.001', '0.006'), 'agreement');
	Assert.equal(resultComparator.compare('a task', '0.001', '0.5'), 'disagreement');
});

test('a numerical tolerance refuses two vectors of different lengths', () => {
	const resultComparator = buildComparator({
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.5,
	});

	Assert.equal(resultComparator.compare('a task', '1,2', '1,2,3'), 'disagreement');
});

test('a canonical form accepts what it rounds to the same thing', () => {
	const resultComparator = buildComparator({
		strategyName: 'normalized hash',
		decimalCount: 2,
	});

	Assert.equal(resultComparator.compare('a task', '1.2301', '1.2349'), 'agreement');
	Assert.equal(resultComparator.compare('a task', '1.230', '1.240'), 'disagreement');
});

test('a canonical form refuses two values a hair apart on either side of a rounding', () => {
	const resultComparator = buildComparator({
		strategyName: 'normalized hash',
		decimalCount: 2,
	});

	Assert.equal(resultComparator.compare('a task', '1.2349', '1.2350'), 'disagreement');
});

test('a canonical form of text trims it, lowers it, and reduces its runs of spaces', () => {
	const resultComparator = buildComparator({
		strategyName: 'normalized hash',
		decimalCount: 2,
	});

	Assert.equal(resultComparator.compare('a task', '  Hello   World ', 'hello world'), 'agreement');
});

test('a similarity score reads the direction of a vector rather than its size', () => {
	const resultComparator = buildComparator({
		strategyName: 'similarity score',
		similarityThreshold: 0.999,
	});

	Assert.equal(resultComparator.compare('a task', '1,2,3', '2,4,6'), 'agreement');
	Assert.equal(resultComparator.compare('a task', '1,0,0', '0,1,0'), 'disagreement');
});

test('a value a strategy cannot read is compared character for character', () => {
	const resultComparator = buildComparator({
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.5,
	});

	Assert.equal(resultComparator.compare('a task', 'not a number', 'not a number'), 'agreement');
	Assert.equal(resultComparator.compare('a task', 'not a number', 'another one'), 'disagreement');
	Assert.equal(resultComparator.compare('a task', '1.0', 'not a number'), 'disagreement');
});

test('a task type with a strategy of its own is compared with that one', () => {
	const resultComparator = new ResultComparator({
		defaultStrategy: {
			strategyName: 'exact',
			numericalTolerance: 0,
			decimalCount: 6,
			similarityThreshold: 1,
		},
		strategyByTaskTypeName: new Map([
			[
				'a tolerant task',
				{
					strategyName: 'numerical tolerance' as const,
					numericalTolerance: 0.1,
					decimalCount: 6,
					similarityThreshold: 1,
				},
			],
		]),
	});

	Assert.equal(resultComparator.compare('a tolerant task', '1.00', '1.05'), 'agreement');
	Assert.equal(resultComparator.compare('another task', '1.00', '1.05'), 'disagreement');
	Assert.equal(resultComparator.strategyFor('another task').strategyName, 'exact');
});
