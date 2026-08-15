import type { Account, AccountId } from '../types/account_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	AccountRegistry — creates the accounts, and counts what creating one costs
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values the account registry needs. */
export type AccountRegistryOptions = {
	/**
	 * What creating one account costs whoever creates it, written in credits so that it can be compared with what an
	 * account can earn or steal. The cost stands for the friction of a verified electronic mail address, of a
	 * telephone number, or of any other proof the network asks for.
	 */
	identityCost: number;
	/** Name of the proof the network asks for, for example "electronic mail address" or "telephone number". */
	identityProofName: string;
};

/**
 * Every account of the network, and the cost of having created them.
 *
 * An identity made only of a cryptographic key costs nothing, and an attacker caught once simply makes another one.
 * The registry therefore attaches a price to every account it opens, so that the question of section 7 of the design
 * note can be answered with numbers: creating disposable accounts has to be worth less than behaving honestly.
 */
export class AccountRegistry {
	/** The values the registry needs. */
	private _options: AccountRegistryOptions;

	/** Every account ever created, indexed by its identifier. */
	private _accountById = new Map<AccountId, Account>();

	/** The number of accounts ever created. */
	private _createdAccountCount = 0;

	/**
	 * @param accountRegistryOptions The cost of creating an account and the name of the proof asked for.
	 */
	constructor(accountRegistryOptions: AccountRegistryOptions) {
		this._options = accountRegistryOptions;
	}

	/**
	 * Creates one account.
	 *
	 * @param accountId Identifier of the account to create.
	 * @param tick The current tick.
	 * @returns The created account.
	 * @throws When an account with that identifier already exists.
	 */
	createAccount(accountId: AccountId, tick: number): Account {
		if (this._accountById.has(accountId) === true) {
			throw new Error(`the account "${accountId}" already exists`);
		}
		const account: Account = {
			accountId: accountId,
			createdAtTick: tick,
			identityProofName: this._options.identityProofName,
		};
		this._accountById.set(accountId, account);
		this._createdAccountCount += 1;
		return account;
	}

	/**
	 * Returns one account.
	 *
	 * @param accountId Identifier of the account.
	 * @returns The account, or `undefined` when no account carries that identifier.
	 */
	accountOf(accountId: AccountId): Account | undefined {
		return this._accountById.get(accountId);
	}

	/**
	 * Returns every account ever created.
	 *
	 * @returns The accounts, in the order they were created.
	 */
	allAccounts(): Account[] {
		return Array.from(this._accountById.values());
	}

	/**
	 * Returns the number of accounts ever created.
	 *
	 * @returns The number of accounts.
	 */
	createdAccountCount(): number {
		return this._createdAccountCount;
	}

	/**
	 * Returns what creating one account costs.
	 *
	 * @returns The cost of one identity, in credits.
	 */
	identityCost(): number {
		return this._options.identityCost;
	}

	/**
	 * Returns what creating every account so far cost, taken together.
	 *
	 * @returns The cost of every identity, in credits.
	 */
	totalIdentityCost(): number {
		return this._createdAccountCount * this._options.identityCost;
	}
}
