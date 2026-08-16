import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { SuspensionBook } from '../src/trust/suspension_book.js';
import { TrustPolicy, type PenaltyPolicyName } from '../src/trust/trust_policy.js';
import { TrustScoreBook } from '../src/trust/trust_score.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	TrustTest — how a score moves, what a penalty costs, and who is set aside
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds a policy with one penalty and the usual amounts.
 *
 * @param penaltyPolicyName The penalty applied to a worker whose result was contradicted.
 * @returns The policy.
 */
function buildPolicy(penaltyPolicyName: PenaltyPolicyName): TrustPolicy {
	return new TrustPolicy({
		initialTrust: 0,
		increaseOnConfirmedResult: 1,
		decreaseOnInvalidResult: 5,
		strongPenaltyFactor: 4,
		penaltyPolicyName: penaltyPolicyName,
		suspensionTickCount: 20,
		minimumTrust: -20,
		maximumTrust: 100,
	});
}

test('a confirmed result raises a score and an invalid one lowers it', () => {
	const trustPolicy = buildPolicy('small reduction');

	Assert.equal(trustPolicy.afterConfirmedResult(10).newTrust, 11);
	Assert.equal(trustPolicy.afterInvalidResult(10).newTrust, 5);
});

test('a score never leaves the range it was given', () => {
	const trustPolicy = buildPolicy('small reduction');

	Assert.equal(trustPolicy.afterConfirmedResult(100).newTrust, 100);
	Assert.equal(trustPolicy.afterInvalidResult(-18).newTrust, -20);
});

test('a strong reduction takes off more than a small one', () => {
	Assert.equal(buildPolicy('small reduction').afterInvalidResult(50).newTrust, 45);
	Assert.equal(buildPolicy('strong reduction').afterInvalidResult(50).newTrust, 30);
});

test('a reset sends a score back to where a brand new account starts', () => {
	Assert.equal(buildPolicy('reset').afterInvalidResult(50).newTrust, 0);
});

test('a suspension lowers the score as usual and sets the worker aside for a while', () => {
	const trustOutcome = buildPolicy('suspension').afterInvalidResult(50);

	Assert.equal(trustOutcome.newTrust, 45);
	Assert.equal(trustOutcome.suspensionTickCount, 20);
	Assert.equal(trustOutcome.confiscatesUnverifiedCredits, false);
});

test('a confiscation lowers the score as usual and asks for the credits back', () => {
	const trustOutcome = buildPolicy('credit confiscation').afterInvalidResult(50);

	Assert.equal(trustOutcome.newTrust, 45);
	Assert.equal(trustOutcome.suspensionTickCount, 0);
	Assert.equal(trustOutcome.confiscatesUnverifiedCredits, true);
});

test('a confirmed result never suspends anybody and never takes credits back', () => {
	const trustOutcome = buildPolicy('suspension').afterConfirmedResult(10);

	Assert.equal(trustOutcome.suspensionTickCount, 0);
	Assert.equal(trustOutcome.confiscatesUnverifiedCredits, false);
});

test('the trust of a worker weighs its account against its device', () => {
	const trustScoreBook = new TrustScoreBook({
		trustPolicy: buildPolicy('small reduction'),
		deviceTrustWeight: 0.5,
	});

	for (let confirmationIndex = 0; confirmationIndex < 10; confirmationIndex += 1) {
		trustScoreBook.afterConfirmedResult('alice', 'the first device');
	}

	Assert.equal(trustScoreBook.accountTrustOf('alice'), 10);
	Assert.equal(trustScoreBook.deviceTrustOf('the first device'), 10);
	Assert.equal(trustScoreBook.trustOf('alice', 'the first device'), 10);
	Assert.equal(trustScoreBook.deviceTrustOf('an unknown device'), 0);
	Assert.equal(trustScoreBook.trustOf('alice', 'an unknown device'), 5);
});

test('a weight of zero hands a new device the whole history of its account', () => {
	const trustScoreBook = new TrustScoreBook({
		trustPolicy: buildPolicy('small reduction'),
		deviceTrustWeight: 0,
	});
	trustScoreBook.afterConfirmedResult('alice', 'the first device');

	Assert.equal(trustScoreBook.trustOf('alice', 'an unknown device'), 1);
});

test('a weight of one makes a new device earn everything alone', () => {
	const trustScoreBook = new TrustScoreBook({
		trustPolicy: buildPolicy('small reduction'),
		deviceTrustWeight: 1,
	});
	trustScoreBook.afterConfirmedResult('alice', 'the first device');

	Assert.equal(trustScoreBook.trustOf('alice', 'an unknown device'), 0);
});

test('the book counts what each account was confirmed and contradicted for', () => {
	const trustScoreBook = new TrustScoreBook({
		trustPolicy: buildPolicy('small reduction'),
		deviceTrustWeight: 0.5,
	});
	trustScoreBook.afterConfirmedResult('alice', 'a device');
	trustScoreBook.afterInvalidResult('alice', 'a device', 7);

	Assert.equal(trustScoreBook.confirmedResultCountOf('alice'), 1);
	Assert.equal(trustScoreBook.invalidResultCountOf('alice'), 1);
	Assert.equal(trustScoreBook.lastInvalidResultTickOf('alice'), 7);
	Assert.equal(trustScoreBook.lastInvalidResultTickOf('bob'), undefined);
});

test('a suspended account receives no task until its tick has come', () => {
	const suspensionBook = new SuspensionBook();
	suspensionBook.suspend('alice', 20);

	Assert.equal(suspensionBook.isSuspended('alice', 19), true);
	Assert.equal(suspensionBook.isSuspended('alice', 20), false);
	Assert.equal(suspensionBook.isSuspended('bob', 0), false);
	Assert.equal(suspensionBook.suspensionCount(), 1);
});

test('a second suspension never shortens the first one', () => {
	const suspensionBook = new SuspensionBook();
	suspensionBook.suspend('alice', 50);
	suspensionBook.suspend('alice', 30);

	Assert.equal(suspensionBook.isSuspended('alice', 40), true);
	Assert.equal(suspensionBook.suspensionCount(), 2);
});
