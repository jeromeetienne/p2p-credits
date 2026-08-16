import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { AccountRegistry } from '../src/identity/account_registry.js';
import { SpendingPolicy } from '../src/identity/spending_policy.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	IdentityTest — what an account costs to open and how far it may consume
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds a spending policy with the usual deficits.
 *
 * @returns The policy.
 */
function buildSpendingPolicy(): SpendingPolicy {
	return new SpendingPolicy({
		allowedInitialDeficit: 1,
		allowedDeficitAfterContribution: 5,
		requiredContribution: 10,
	});
}

test('an account that has earned nothing may go one credit into debt and no further', () => {
	const spendingPolicy = buildSpendingPolicy();

	Assert.equal(spendingPolicy.mayConsume(0, 0, 1), true);
	Assert.equal(spendingPolicy.mayConsume(0, 0, 1.5), false);
});

test('an account that has contributed enough is given the larger deficit', () => {
	const spendingPolicy = buildSpendingPolicy();

	Assert.equal(spendingPolicy.mayConsume(0, 10, 5), true);
	Assert.equal(spendingPolicy.mayConsume(0, 10, 5.5), false);
	Assert.equal(spendingPolicy.decide(0, 10, 1).deficitLimit, 5);
	Assert.equal(spendingPolicy.decide(0, 9.99, 1).deficitLimit, 1);
});

test('an account with credits may spend them, whatever it contributed', () => {
	const spendingPolicy = buildSpendingPolicy();

	Assert.equal(spendingPolicy.mayConsume(100, 0, 100), true);
	Assert.equal(spendingPolicy.mayConsume(100, 0, 101.5), false);
});

test('an account already in debt is refused everything it cannot cover', () => {
	const spendingPolicy = buildSpendingPolicy();

	Assert.equal(spendingPolicy.mayConsume(-1, 0, 0.01), false);
	Assert.equal(spendingPolicy.mayConsume(-4, 20, 1), true);
	Assert.equal(spendingPolicy.mayConsume(-4.5, 20, 1), false);
});

test('every account is opened once, and the cost of opening them is counted', () => {
	const accountRegistry = new AccountRegistry({
		identityCost: 5,
		identityProofName: 'verified electronic mail address',
	});

	const account = accountRegistry.createAccount('alice', 3);

	Assert.equal(account.accountId, 'alice');
	Assert.equal(account.createdAtTick, 3);
	Assert.equal(account.identityProofName, 'verified electronic mail address');
	Assert.equal(accountRegistry.createdAccountCount(), 1);
	Assert.equal(accountRegistry.totalIdentityCost(), 5);

	accountRegistry.createAccount('bob', 4);

	Assert.equal(accountRegistry.createdAccountCount(), 2);
	Assert.equal(accountRegistry.totalIdentityCost(), 10);
	Assert.equal(accountRegistry.allAccounts().length, 2);
});

test('the same identifier can never be opened twice', () => {
	const accountRegistry = new AccountRegistry({
		identityCost: 5,
		identityProofName: 'verified electronic mail address',
	});
	accountRegistry.createAccount('alice', 0);

	Assert.throws(() => {
		accountRegistry.createAccount('alice', 1);
	}, /already exists/);
	Assert.equal(accountRegistry.createdAccountCount(), 1);
});

test('an account nobody opened is not found', () => {
	const accountRegistry = new AccountRegistry({
		identityCost: 5,
		identityProofName: 'verified electronic mail address',
	});

	Assert.equal(accountRegistry.accountOf('alice'), undefined);
});
