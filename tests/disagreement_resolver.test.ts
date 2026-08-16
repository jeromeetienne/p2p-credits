import Assert from 'node:assert/strict';
import { test } from 'node:test';

import type { TaskResult } from '../src/types/task_types.js';
import { DisagreementResolver } from '../src/validation/disagreement_resolver.js';
import { ResultComparator } from '../src/validation/result_comparator.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	DisagreementResolverTest — who wins when workers return different results
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** A comparator that compares character for character. */
const exactComparator = new ResultComparator({
	defaultStrategy: {
		strategyName: 'exact',
		numericalTolerance: 0,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	strategyByTaskTypeName: new Map(),
});

/** A comparator that accepts a difference of up to one part in a hundred. */
const tolerantComparator = new ResultComparator({
	defaultStrategy: {
		strategyName: 'numerical tolerance',
		numericalTolerance: 0.01,
		decimalCount: 6,
		similarityThreshold: 1,
	},
	strategyByTaskTypeName: new Map(),
});

/**
 * Builds one result returned by one account.
 *
 * @param accountId Identifier of the account that returned it.
 * @param resultValue The value it returned.
 * @returns The result.
 */
function buildResult(accountId: string, resultValue: string): TaskResult {
	return {
		taskId: 'task-1',
		accountId: accountId,
		deviceId: `${accountId}-device`,
		resultValue: resultValue,
		completedAtTick: 0,
	};
}

test('two workers out of three carry the value they agree on', () => {
	const majorityOutcome = DisagreementResolver.resolveByMajority(
		[
			buildResult('alice', '1.0'),
			buildResult('bob', '9.9'),
			buildResult('charlie', '1.0'),
		],
		exactComparator,
		'a task',
	);

	Assert.equal(majorityOutcome.majorityResultValue, '1.0');
	Assert.deepEqual(majorityOutcome.agreeingAccountIds, ['alice', 'charlie']);
	Assert.deepEqual(majorityOutcome.disagreeingAccountIds, ['bob']);
});

test('two workers that disagree settle nothing between themselves', () => {
	const majorityOutcome = DisagreementResolver.resolveByMajority(
		[
			buildResult('alice', '1.0'),
			buildResult('bob', '9.9'),
		],
		exactComparator,
		'a task',
	);

	Assert.equal(majorityOutcome.majorityResultValue, undefined);
	Assert.deepEqual(majorityOutcome.agreeingAccountIds, []);
	Assert.deepEqual(majorityOutcome.disagreeingAccountIds, ['alice', 'bob']);
});

test('three workers that all say something different settle nothing either', () => {
	const majorityOutcome = DisagreementResolver.resolveByMajority(
		[
			buildResult('alice', '1.0'),
			buildResult('bob', '2.0'),
			buildResult('charlie', '3.0'),
		],
		exactComparator,
		'a task',
	);

	Assert.equal(majorityOutcome.majorityResultValue, undefined);
});

test('results are gathered through the comparison of their task type, not through their spelling', () => {
	const taskResults = [
		buildResult('alice', '1.000'),
		buildResult('bob', '1.004'),
		buildResult('charlie', '9.900'),
	];

	const withoutTolerance = DisagreementResolver.resolveByMajority(taskResults, exactComparator, 'a task');
	const withTolerance = DisagreementResolver.resolveByMajority(taskResults, tolerantComparator, 'a task');

	Assert.equal(withoutTolerance.majorityResultValue, undefined);
	Assert.equal(withTolerance.majorityResultValue, '1.000');
	Assert.deepEqual(withTolerance.agreeingAccountIds, ['alice', 'bob']);
});

test('a trusted worker outweighs two workers nobody has confirmed yet', () => {
	const trustByAccountId = new Map([
		['alice', 100],
		['bob', 0],
		['charlie', 0],
	]);

	const majorityOutcome = DisagreementResolver.resolveByTrustWeight(
		[
			buildResult('alice', '1.0'),
			buildResult('bob', '9.9'),
			buildResult('charlie', '9.9'),
		],
		exactComparator,
		'a task',
		(accountId) => {
			return trustByAccountId.get(accountId) ?? 0;
		},
		1,
	);

	Assert.equal(majorityOutcome.majorityResultValue, '1.0');
	Assert.deepEqual(majorityOutcome.disagreeingAccountIds, ['bob', 'charlie']);
});

test('a worker at the bottom of the scale still carries the minimum vote', () => {
	const majorityOutcome = DisagreementResolver.resolveByTrustWeight(
		[
			buildResult('alice', '1.0'),
			buildResult('bob', '9.9'),
			buildResult('charlie', '9.9'),
		],
		exactComparator,
		'a task',
		() => {
			return -100;
		},
		1,
	);

	Assert.equal(majorityOutcome.majorityResultValue, '9.9');
	Assert.deepEqual(majorityOutcome.agreeingAccountIds, ['bob', 'charlie']);
});

test('one worker alone carries its own result', () => {
	const majorityOutcome = DisagreementResolver.resolveByMajority(
		[buildResult('alice', '1.0')],
		exactComparator,
		'a task',
	);

	Assert.equal(majorityOutcome.majorityResultValue, '1.0');
});

test('no result at all settles nothing', () => {
	const majorityOutcome = DisagreementResolver.resolveByMajority([], exactComparator, 'a task');

	Assert.equal(majorityOutcome.majorityResultValue, undefined);
	Assert.deepEqual(majorityOutcome.disagreeingAccountIds, []);
});

test('two results that agree land in the same group whatever order they arrived in', () => {
	const nearestResult = buildResult('alice', '1.000');
	const middleResult = buildResult('bob', '1.008');
	const farthestResult = buildResult('charlie', '1.016');

	const firstOrder = DisagreementResolver.resolveByMajority(
		[nearestResult, middleResult, farthestResult],
		tolerantComparator,
		'a task',
	);
	const secondOrder = DisagreementResolver.resolveByMajority(
		[middleResult, nearestResult, farthestResult],
		tolerantComparator,
		'a task',
	);

	Assert.deepEqual(firstOrder.disagreeingAccountIds, []);
	Assert.deepEqual(secondOrder.disagreeingAccountIds, []);
	Assert.equal(firstOrder.agreeingAccountIds.length, 3);
	Assert.equal(secondOrder.agreeingAccountIds.length, 3);
});

test('a value nothing connects to the others still loses, whatever order it arrived in', () => {
	const firstResult = buildResult('alice', '1.000');
	const secondResult = buildResult('bob', '1.005');
	const distantResult = buildResult('charlie', '9.000');

	for (const taskResults of [
		[firstResult, secondResult, distantResult],
		[distantResult, firstResult, secondResult],
	]) {
		const majorityOutcome = DisagreementResolver.resolveByMajority(
			taskResults,
			tolerantComparator,
			'a task',
		);

		Assert.deepEqual(majorityOutcome.disagreeingAccountIds, ['charlie']);
		Assert.equal(majorityOutcome.agreeingAccountIds.length, 2);
	}
});
