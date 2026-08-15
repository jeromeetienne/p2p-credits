import { z as Zod } from 'zod';

import { AccountIdSchema } from './account_types.js';
import { TaskIdSchema, ValidationStatusSchema } from './task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	LedgerTypes — the movements of credits recorded by the ledger
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the type of a ledger entry. */
export const LedgerEntryTypeSchema = Zod.enum([
	'credit',
	'debit',
	'adjustment',
]);

/**
 * The type of a ledger entry.
 *
 * - `credit`: the account is paid for work it performed.
 * - `debit`: the account pays for work the network performed for it.
 * - `adjustment`: a correction, for example the removal of credits awarded for a fraud detected later.
 */
export type LedgerEntryType = Zod.infer<typeof LedgerEntryTypeSchema>;

/** Schema of one movement of credits, before the ledger gives it an identifier. */
export const LedgerEntryDraftSchema = Zod.object({
	/** Tick of the simulation clock at which the movement was recorded. */
	tick: Zod.number().int().nonnegative(),
	/** Identifier of the account the movement belongs to. */
	accountId: AccountIdSchema,
	/** Identifier of the task the movement comes from. */
	taskId: TaskIdSchema,
	/** Type of the movement. */
	entryType: LedgerEntryTypeSchema,
	/**
	 * Amount of credits of the movement. The amount is positive for a credit and for a debit, and the type gives the
	 * direction. The amount of an adjustment is signed, because an adjustment can add or remove credits.
	 */
	amount: Zod.number(),
	/** Short sentence saying why the movement was recorded. */
	reason: Zod.string(),
	/** Validation status of the result the movement pays for. */
	validationStatus: ValidationStatusSchema,
});

/** One movement of credits, before the ledger gives it an identifier. */
export type LedgerEntryDraft = Zod.infer<typeof LedgerEntryDraftSchema>;

/** Schema of one movement of credits recorded in the ledger. */
export const LedgerEntrySchema = LedgerEntryDraftSchema.extend({
	/** Identifier of the entry, given by the ledger in the order of arrival. */
	entryId: Zod.string().min(1),
});

/** One movement of credits recorded in the append-only ledger. */
export type LedgerEntry = Zod.infer<typeof LedgerEntrySchema>;
