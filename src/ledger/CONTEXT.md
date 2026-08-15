# Directory Context: `/src/ledger`

## Purpose
The append-only list of the movements of credits, and the balances reconstructed from it.

## Key Exports & Entry Points
- `ledger.ts`: `Ledger.append(...)`, `Ledger.balanceOf(...)`, `Ledger.spendableBalanceOf(...)`, and the totals of the credits created and consumed.

## Rules
- The ledger is append-only. A recorded movement is never modified and never removed; a correction is a new movement of the type `adjustment`.
- No balance is ever stored as a separate number. Every balance is added from the movements, so no stored total can ever disagree with them.
- The ledger imports nothing from `pricing/`, `trust/`, or `validation/`. It receives an amount and a validation status, and it stores them. This is what lets the accounting stay simple while the three other questions stay hard.
- A credit that waits for a validation is not spendable, and a debit always counts, so an account can never hide a debt behind a pending credit.

## Background
- The fields of a movement and the reconstruction of the balance come from section 5 of [the design note](../../docs/design_note.md). Which movements are final, provisional, or settled in batches is left open by section 12.4 and is milestone 5 of [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).
