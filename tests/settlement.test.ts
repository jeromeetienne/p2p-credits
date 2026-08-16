import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { DeferredPaymentBook } from '../src/ledger/deferred_payment_book.js';
import { SettlementPolicy, type SettlementPolicyName } from '../src/ledger/settlement_policy.js';
import type { LedgerEntryDraft } from '../src/types/ledger_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SettlementTest — when a payment is recorded and when it can be spent
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds a settlement policy with the usual delays.
 *
 * @param policyName The policy applied to every payment.
 * @returns The policy.
 */
function buildPolicy(policyName: SettlementPolicyName): SettlementPolicy {
	return new SettlementPolicy({
		policyName: policyName,
		provisionalTickCount: 10,
		settlementPeriodTickCount: 20,
	});
}

/**
 * Builds one payment waiting to be recorded at the given tick.
 *
 * @param tick The tick the payment is recorded at.
 * @param amount The amount of the payment, in credits.
 * @returns The payment.
 */
function buildDraft(tick: number, amount: number): LedgerEntryDraft {
	return {
		tick: tick,
		accountId: 'alice',
		taskId: 'task-1',
		entryType: 'credit',
		amount: amount,
		spendableFromTick: tick,
		reason: 'a test wrote this movement',
		validationStatus: 'accepted',
	};
}

test('an immediate credit is recorded and spendable at once', () => {
	const settlementDecision = buildPolicy('immediate credit').decideForPayment(7);

	Assert.deepEqual(settlementDecision, {
		recordAtTick: 7,
		spendableFromTick: 7,
	});
});

test('a provisional credit is recorded at once and spendable after the delay', () => {
	const settlementDecision = buildPolicy('provisional credit').decideForPayment(7);

	Assert.deepEqual(settlementDecision, {
		recordAtTick: 7,
		spendableFromTick: 17,
	});
});

test('a delayed settlement waits for the end of the period the work was performed in', () => {
	const settlementPolicy = buildPolicy('delayed settlement');

	Assert.deepEqual(settlementPolicy.decideForPayment(0), {
		recordAtTick: 20,
		spendableFromTick: 20,
	});
	Assert.deepEqual(settlementPolicy.decideForPayment(19), {
		recordAtTick: 20,
		spendableFromTick: 20,
	});
	Assert.deepEqual(settlementPolicy.decideForPayment(20), {
		recordAtTick: 40,
		spendableFromTick: 40,
	});
});

test('the policy says its own name', () => {
	Assert.equal(buildPolicy('delayed settlement').policyName(), 'delayed settlement');
});

test('a payment waiting to be recorded is held until its tick has come', () => {
	const deferredPaymentBook = new DeferredPaymentBook();
	deferredPaymentBook.hold(buildDraft(20, 3));
	deferredPaymentBook.hold(buildDraft(40, 5));

	Assert.equal(deferredPaymentBook.heldCount(), 2);
	Assert.equal(deferredPaymentBook.heldTotal(), 8);
	Assert.deepEqual(deferredPaymentBook.releaseDue(19), []);

	const releasedAtTwenty = deferredPaymentBook.releaseDue(20);

	Assert.equal(releasedAtTwenty.length, 1);
	Assert.equal(releasedAtTwenty[0]?.amount, 3);
	Assert.equal(deferredPaymentBook.heldCount(), 1);
	Assert.equal(deferredPaymentBook.heldTotal(), 5);
});

test('a payment is released once and never again', () => {
	const deferredPaymentBook = new DeferredPaymentBook();
	deferredPaymentBook.hold(buildDraft(10, 3));

	Assert.equal(deferredPaymentBook.releaseDue(10).length, 1);
	Assert.deepEqual(deferredPaymentBook.releaseDue(10), []);
	Assert.equal(deferredPaymentBook.heldCount(), 0);
	Assert.equal(deferredPaymentBook.heldTotal(), 0);
});

test('a payment held for an unverified result is dropped when the worker is caught', () => {
	const deferredPaymentBook = new DeferredPaymentBook();
	deferredPaymentBook.hold({
		...buildDraft(20, 5),
		validationStatus: 'unverified',
	});
	deferredPaymentBook.hold({
		...buildDraft(20, 3),
		validationStatus: 'accepted',
	});
	deferredPaymentBook.hold({
		...buildDraft(20, 7),
		accountId: 'bob',
		validationStatus: 'unverified',
	});

	Assert.equal(deferredPaymentBook.dropUnverifiedCreditsOf('alice'), 5);
	Assert.equal(deferredPaymentBook.heldCount(), 2);
	Assert.equal(deferredPaymentBook.heldTotal(), 10);
	Assert.equal(deferredPaymentBook.dropUnverifiedCreditsOf('alice'), 0);
});
