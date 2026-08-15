import { z as Zod } from 'zod';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AccountTypes — the identity of a participant of the network
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the unique identifier of an account. */
export const AccountIdSchema = Zod.string().min(1);

/** Unique identifier of an account. */
export type AccountId = Zod.infer<typeof AccountIdSchema>;

/** Schema of an account of the network. */
export const AccountSchema = Zod.object({
	/** Unique identifier of the account. */
	accountId: AccountIdSchema,
	/** Tick of the simulation clock at which the account was created. */
	createdAtTick: Zod.number().int().nonnegative(),
	/** Name of the identity proof used to create the account, for example "email" or "phone number". */
	identityProofName: Zod.string(),
});

/**
 * An account of the network.
 *
 * The account holds the identity only. The balance is reconstructed from the ledger and the trust score is held by
 * the trust module, because the design note keeps those three concerns separate.
 */
export type Account = Zod.infer<typeof AccountSchema>;
