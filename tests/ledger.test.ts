import Assert from 'node:assert/strict';
import { test } from 'node:test';

import { Ledger } from '../src/ledger/ledger.js';
import type { LedgerEntryDraft } from '../src/types/ledger_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	LedgerTest — the balances a ledger reconstructs from its movements
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * Builds one movement, with the fields a test does not care about already filled in.
 *
 * @param ledgerEntryFields The fields the test cares about.
 * @returns The movement to append.
 */
function buildDraft(ledgerEntryFields: Partial<LedgerEntryDraft>): LedgerEntryDraft {
	return {
		tick: 0,
		accountId: 'alice',
		taskId: 'task-1',
		entryType: 'credit',
		amount: 1,
		spendableFromTick: 0,
		reason: 'a test wrote this movement',
		validationStatus: 'accepted',
		...ledgerEntryFields,
	};
}

test('a balance adds credits, takes off debits, and adds a signed adjustment', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		entryType: 'credit',
		amount: 10,
	}));
	ledger.append(buildDraft({
		entryType: 'debit',
		amount: 4,
	}));
	ledger.append(buildDraft({
		entryType: 'adjustment',
		amount: -3,
	}));

	Assert.equal(ledger.balanceOf('alice'), 3);
});

test('a movement of another account never reaches this balance', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		accountId: 'bob',
		amount: 10,
	}));

	Assert.equal(ledger.balanceOf('alice'), 0);
	Assert.equal(ledger.balanceOf('bob'), 10);
});

test('a credit waiting for a validation is not spendable, and a debit always counts', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		entryType: 'credit',
		amount: 10,
		validationStatus: 'pending',
	}));
	ledger.append(buildDraft({
		entryType: 'debit',
		amount: 4,
	}));

	Assert.equal(ledger.balanceOf('alice'), 6);
	Assert.equal(ledger.spendableBalanceOf('alice', 0), -4);
});

test('a credit becomes spendable only once its tick has come', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		tick: 3,
		amount: 10,
		spendableFromTick: 13,
	}));

	Assert.equal(ledger.spendableBalanceOf('alice', 12), 0);
	Assert.equal(ledger.spendableBalanceOf('alice', 13), 10);
});

test('what an account earned, consumed, and had taken back are read apart', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		entryType: 'credit',
		amount: 10,
	}));
	ledger.append(buildDraft({
		entryType: 'debit',
		amount: 4,
	}));
	ledger.append(buildDraft({
		entryType: 'adjustment',
		amount: -6,
	}));

	Assert.equal(ledger.earnedTotalOf('alice'), 10);
	Assert.equal(ledger.consumedTotalOf('alice'), 4);
	Assert.equal(ledger.adjustmentTotalOf('alice'), -6);
});

test('the totals created and consumed count every account together', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		accountId: 'alice',
		entryType: 'credit',
		amount: 10,
	}));
	ledger.append(buildDraft({
		accountId: 'bob',
		entryType: 'credit',
		amount: 5,
	}));
	ledger.append(buildDraft({
		accountId: 'bob',
		entryType: 'debit',
		amount: 7,
	}));

	Assert.equal(ledger.totalCreditsCreated(), 15);
	Assert.equal(ledger.totalCreditsConsumed(), 7);
});

test('every movement keeps its own identifier, in the order it arrived', () => {
	const ledger = new Ledger();
	const firstEntry = ledger.append(buildDraft({}));
	const secondEntry = ledger.append(buildDraft({}));

	Assert.equal(firstEntry.entryId, 'entry-1');
	Assert.equal(secondEntry.entryId, 'entry-2');
	Assert.equal(ledger.allEntries().length, 2);
});

test('the movements of one account never hold the movements of another', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		accountId: 'alice',
		amount: 10,
	}));
	ledger.append(buildDraft({
		accountId: 'bob',
		amount: 4,
	}));

	Assert.equal(ledger.entriesOf('alice').length, 1);
	Assert.equal(ledger.entriesOf('bob').length, 1);
	Assert.equal(ledger.entriesOf('charlie').length, 0);
	Assert.equal(ledger.balanceOf('alice'), 10);
	Assert.equal(ledger.balanceOf('bob'), 4);
});

test('the movements handed out are a copy, so nobody can write into the ledger', () => {
	const ledger = new Ledger();
	ledger.append(buildDraft({
		amount: 10,
	}));

	const handedOutEntries = ledger.entriesOf('alice');
	handedOutEntries.push(...handedOutEntries);

	Assert.equal(ledger.entriesOf('alice').length, 1);
	Assert.equal(ledger.balanceOf('alice'), 10);
});
