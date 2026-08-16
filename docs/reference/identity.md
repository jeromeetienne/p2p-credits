# Reference: Identity

What opening an account costs, and how far an account may consume before it has contributed. Neither class imports from the pricing, the trust, the validation, or the ledger: they read balances as plain numbers, so the rule about who may spend is never mixed with the record of what was spent.

Everything here comes from `src/identity/`.

## `AccountRegistry`

Every account of the network, and the cost of having created them.

### `new AccountRegistry(accountRegistryOptions: AccountRegistryOptions)`

`AccountRegistryOptions` holds:

- `identityCost: number` — what creating one account costs whoever creates it, written in credits so that it can be compared with what an account can earn or steal. It stands for the friction of a verified electronic mail address, of a telephone number, or of any other proof the network asks for.
- `identityProofName: string` — the name of the proof asked for.

### `createAccount(accountId, tick): Account`

Creates one account and records the tick it was created at. Throws when an account with that identifier already exists.

### `accountOf(accountId): Account | undefined`, `allAccounts(): Account[]`

One account, and every account ever created in the order they were created.

### `createdAccountCount(): number`

How many accounts were ever created, including the ones a Sybil attacker opened after abandoning another.

### `identityCost(): number`, `totalIdentityCost(): number`

What creating one account costs, and what creating every account so far cost taken together.

## `SpendingPolicy`

The rule that stops an account from consuming what it never contributed.

### `new SpendingPolicy(spendingPolicyOptions: SpendingPolicyOptions)`

`SpendingPolicyOptions` holds:

- `allowedInitialDeficit: number` — how far below zero an account that has not contributed enough yet may go. This is the small debt a brand new user is allowed, so that the service can be tried before anything is earned, and it is the whole of what an abandoned account can ever cost the network.
- `allowedDeficitAfterContribution: number` — how far below zero an account that has contributed enough may go.
- `requiredContribution: number` — what an account has to have earned before the larger deficit is opened to it.

### `decide(spendableBalance, earnedTotal, price): SpendingDecision`

`SpendingDecision` holds `mayConsume`, and `deficitLimit`, which is how far below zero the account is allowed to go right now. The account may consume when its spendable balance less the price stays at or above the negative of that limit.

### `mayConsume(spendableBalance, earnedTotal, price): boolean`

The same answer without the limit.

## Related

- [Set the cost of an identity](../guides/set_the_cost_of_an_identity.md)
- [The context of `/src/identity`](../../src/identity/CONTEXT.md)
