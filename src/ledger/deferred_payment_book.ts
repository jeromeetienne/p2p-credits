import type { LedgerEntryDraft } from '../types/ledger_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	DeferredPaymentBook — holds the payments that are not recorded yet
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * The payments a settlement policy decided to record later.
 *
 * A payment waiting here is not in the ledger, so it appears in no balance and can be dropped before it is ever
 * recorded, which is the whole point of settling in batches: the network keeps a moment where it can still change
 * its mind about work it has not paid for yet.
 */
export class DeferredPaymentBook {
	/** The payments waiting to be recorded, in the order they arrived. */
	private _heldDrafts: LedgerEntryDraft[] = [];

	/**
	 * Holds one payment until the tick it is recorded at.
	 *
	 * @param ledgerEntryDraft The payment, carrying the tick it is recorded at.
	 * @returns Nothing.
	 */
	hold(ledgerEntryDraft: LedgerEntryDraft): void {
		this._heldDrafts.push(ledgerEntryDraft);
	}

	/**
	 * Takes out every payment whose tick has come.
	 *
	 * @param currentTick The current tick.
	 * @returns The payments to record now, in the order they arrived.
	 */
	releaseDue(currentTick: number): LedgerEntryDraft[] {
		const dueDrafts = this._heldDrafts.filter((ledgerEntryDraft) => {
			return ledgerEntryDraft.tick <= currentTick;
		});
		this._heldDrafts = this._heldDrafts.filter((ledgerEntryDraft) => {
			return ledgerEntryDraft.tick > currentTick;
		});
		return dueDrafts;
	}

	/**
	 * Returns the number of payments still waiting.
	 *
	 * @returns The number of payments waiting to be recorded.
	 */
	heldCount(): number {
		return this._heldDrafts.length;
	}

	/**
	 * Returns the total amount of the payments still waiting.
	 *
	 * @returns The amount waiting to be recorded, in credits.
	 */
	heldTotal(): number {
		let total = 0;
		for (const ledgerEntryDraft of this._heldDrafts) {
			total += ledgerEntryDraft.amount;
		}
		return total;
	}
}
