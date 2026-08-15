import type { AccountId } from '../types/account_types.js';
import type { LedgerEntry, LedgerEntryDraft } from '../types/ledger_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Ledger — the append-only list of credit movements, and the balances read from it
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * The append-only ledger of the network.
 *
 * The ledger knows nothing about the price of a task, about the trust of a worker, or about the way a result was
 * validated. It receives an amount and a validation status, and it stores them. Every balance is reconstructed from
 * the stored movements, never held as a separate number that could disagree with them.
 */
export class Ledger {
	/** Every movement ever recorded, in the order of arrival. Entries are never modified and never removed. */
	private _entries: LedgerEntry[] = [];

	/** Number given to the next entry, used to build the identifier of that entry. */
	private _nextEntryNumber = 1;

	/**
	 * Records one movement of credits.
	 *
	 * @param ledgerEntryDraft The movement to record, without its identifier.
	 * @returns The recorded movement, with the identifier given by the ledger.
	 */
	append(ledgerEntryDraft: LedgerEntryDraft): LedgerEntry {
		const ledgerEntry: LedgerEntry = {
			...ledgerEntryDraft,
			entryId: `entry-${this._nextEntryNumber}`,
		};
		this._nextEntryNumber += 1;
		this._entries.push(ledgerEntry);
		return ledgerEntry;
	}

	/**
	 * Returns every movement ever recorded.
	 *
	 * @returns The movements, in the order of arrival.
	 */
	allEntries(): readonly LedgerEntry[] {
		return this._entries;
	}

	/**
	 * Returns every movement of one account.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The movements of that account, in the order of arrival.
	 */
	entriesOf(accountId: AccountId): LedgerEntry[] {
		return this._entries.filter((ledgerEntry) => ledgerEntry.accountId === accountId);
	}

	/**
	 * Returns the balance of an account, including the credits that are still waiting for a validation.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The balance in credits, which can be negative.
	 */
	balanceOf(accountId: AccountId): number {
		return this._sumOf(this.entriesOf(accountId));
	}

	/**
	 * Returns the part of the balance of an account that the account is allowed to spend.
	 *
	 * A credit that waits for a validation is not spendable. A debit always counts, so an account can never hide a
	 * debt behind a pending credit.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The spendable balance in credits, which can be negative.
	 */
	spendableBalanceOf(accountId: AccountId): number {
		const spendableEntries = this.entriesOf(accountId).filter((ledgerEntry) => {
			if (ledgerEntry.entryType === 'credit' && ledgerEntry.validationStatus === 'pending') {
				return false;
			}
			return true;
		});
		return this._sumOf(spendableEntries);
	}

	/**
	 * Returns the total amount of credits created by the network, which is the sum of every credit and of every
	 * positive adjustment.
	 *
	 * @returns The total amount of credits created.
	 */
	totalCreditsCreated(): number {
		let total = 0;
		for (const ledgerEntry of this._entries) {
			if (ledgerEntry.entryType === 'credit') {
				total += ledgerEntry.amount;
			} else if (ledgerEntry.entryType === 'adjustment' && ledgerEntry.amount > 0) {
				total += ledgerEntry.amount;
			}
		}
		return total;
	}

	/**
	 * Returns the total amount of credits consumed by the users of the network, which is the sum of every debit.
	 *
	 * @returns The total amount of credits consumed.
	 */
	totalCreditsConsumed(): number {
		let total = 0;
		for (const ledgerEntry of this._entries) {
			if (ledgerEntry.entryType === 'debit') {
				total += ledgerEntry.amount;
			}
		}
		return total;
	}

	/**
	 * Adds the signed value of every given movement.
	 *
	 * @param ledgerEntries The movements to add.
	 * @returns The sum in credits.
	 */
	private _sumOf(ledgerEntries: LedgerEntry[]): number {
		let balance = 0;
		for (const ledgerEntry of ledgerEntries) {
			if (ledgerEntry.entryType === 'credit') {
				balance += ledgerEntry.amount;
			} else if (ledgerEntry.entryType === 'debit') {
				balance -= ledgerEntry.amount;
			} else {
				balance += ledgerEntry.amount;
			}
		}
		return balance;
	}
}
