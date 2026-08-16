import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { ValidationSampler } from '../src/validation/validation_sampler.js';
import type { RandomNumberFn } from '../src/types/random_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ValidationSamplerTest — how often the work of a worker is done a second time
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds a sampler that verifies a new worker half the time and a trusted worker once in twenty.
 *
 * @param randomNumberFn The source of randomness.
 * @returns The sampler.
 */
function buildSampler(randomNumberFn: RandomNumberFn): ValidationSampler {
	return new ValidationSampler({
		untrustedValidationRate: 0.5,
		trustedValidationRate: 0.1,
		recentErrorValidationRate: 0.9,
		untrustedThreshold: 0,
		trustedThreshold: 10,
		randomNumberFn: randomNumberFn,
	});
}

test('a worker nobody has confirmed yet is verified at the untrusted rate', () => {
	const validationSampler = buildSampler(() => {
		return 0;
	});

	Assert.equal(validationSampler.validationRateFor(0, false), 0.5);
	Assert.equal(validationSampler.validationRateFor(-100, false), 0.5);
});

test('a worker confirmed many times is verified at the trusted rate', () => {
	const validationSampler = buildSampler(() => {
		return 0;
	});

	Assert.equal(validationSampler.validationRateFor(10, false), 0.1);
	Assert.equal(validationSampler.validationRateFor(100, false), 0.1);
});

test('between the two thresholds the rate falls a little at every confirmed result', () => {
	const validationSampler = buildSampler(() => {
		return 0;
	});

	Assert.equal(validationSampler.validationRateFor(5, false), 0.3);
	Assert.equal(validationSampler.validationRateFor(1, false) > validationSampler.validationRateFor(9, false), true);
});

test('a worker caught recently is verified more than anyone else, whatever its trust', () => {
	const validationSampler = buildSampler(() => {
		return 0;
	});

	Assert.equal(validationSampler.validationRateFor(100, true), 0.9);
	Assert.equal(validationSampler.validationRateFor(-100, true), 0.9);
});

test('a task is duplicated exactly when the draw falls under the rate', () => {
	let drawnNumber = 0;
	const validationSampler = buildSampler(() => {
		return drawnNumber;
	});

	drawnNumber = 0.49;
	Assert.equal(validationSampler.mustValidate(0, false), true);

	drawnNumber = 0.5;
	Assert.equal(validationSampler.mustValidate(0, false), false);

	drawnNumber = 0.49;
	Assert.equal(validationSampler.mustValidate(10, false), false);
});
