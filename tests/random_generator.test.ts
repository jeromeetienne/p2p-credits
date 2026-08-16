import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { RandomGenerator } from '../src/simulation/random_generator.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	RandomGeneratorTest — the seed a whole run can be reproduced from
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Draws a number of values from a freshly seeded generator.
 *
 * @param seed The seed of the generator.
 * @param drawCount Number of values drawn.
 * @returns The values, in the order they were drawn.
 */
function drawNumbers(seed: number, drawCount: number): number[] {
	const randomGenerator = new RandomGenerator(seed);
	const drawnNumbers: number[] = [];
	for (let drawIndex = 0; drawIndex < drawCount; drawIndex += 1) {
		drawnNumbers.push(randomGenerator.nextNumber());
	}
	return drawnNumbers;
}

test('the same seed always draws the same numbers', () => {
	Assert.deepEqual(drawNumbers(20260815, 50), drawNumbers(20260815, 50));
});

test('two different seeds draw different numbers', () => {
	Assert.notDeepEqual(drawNumbers(1, 50), drawNumbers(2, 50));
});

test('every drawn number is at least zero and below one', () => {
	for (const drawnNumber of drawNumbers(7, 500)) {
		Assert.equal(drawnNumber >= 0, true);
		Assert.equal(drawnNumber < 1, true);
	}
});

test('the draw handed out as a plain function advances the same generator', () => {
	const randomGenerator = new RandomGenerator(7);
	const randomNumberFn = randomGenerator.asRandomNumberFn();
	const firstNumber = randomNumberFn();
	const secondNumber = randomGenerator.nextNumber();

	Assert.deepEqual([firstNumber, secondNumber], drawNumbers(7, 2));
});

test('picking an item returns an item of the list, and refuses an empty list', () => {
	const randomGenerator = new RandomGenerator(7);
	const items = ['alice', 'bob', 'charlie'];

	for (let pickIndex = 0; pickIndex < 100; pickIndex += 1) {
		Assert.equal(items.includes(randomGenerator.pick(items)), true);
	}

	Assert.throws(() => {
		randomGenerator.pick([]);
	}, /empty list/);
});
