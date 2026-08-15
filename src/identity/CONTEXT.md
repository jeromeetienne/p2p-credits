# Directory Context: `/src/identity`

## Purpose
Who is allowed into the network, what an identity costs to create, and how far an account may consume before it has contributed anything.

## Key Exports & Entry Points
- `account_registry.ts`: `AccountRegistry.createAccount(accountId, tick)` opens an account and counts what opening it cost.
- `spending_policy.ts`: `SpendingPolicy.mayConsume(spendableBalance, earnedTotal, price)` says whether an account may have a task executed for it.

## Rules
- Every account is opened through the registry, so that the number of identities and their total cost is always known. An identity that costs nothing is an identity an attacker makes again the moment it is caught.
- The spending policy reads a spendable balance and an amount earned, both plain numbers, and never reads the ledger itself. It therefore decides nothing about what a movement is, and the ledger decides nothing about who is allowed to spend.
- An account that has not contributed enough is allowed a small deficit and no more. That deficit is the whole of what an account abandoned after consuming can ever cost the network.
- Nothing here imports from `pricing/`, `trust/`, `validation/`, or `ledger/`.

## Background
- The cost of an identity answers section 7 of [the design note](../../docs/design_note.md), and contributing before consuming answers section 8. Whether a new account should be allowed a deficit at all is left open by section 12.8, so the deficit is a parameter and not a decision.
