# Directory Context: `/src/ledger`

## Purpose
The append-only list of the movements of credits, the balances reconstructed from it, and the moment a payment is recorded and becomes spendable.

## Key Exports & Entry Points
- `ledger.ts`: `Ledger.append(...)`, `Ledger.balanceOf(...)`, `Ledger.spendableBalanceOf(accountId, currentTick)`, `Ledger.earnedTotalOf(...)`, and the totals of the credits created and consumed.
- `settlement_policy.ts`: `SettlementPolicy.decideForPayment(currentTick)` says when a payment is recorded and when it can be spent.
- `deferred_payment_book.ts`: `DeferredPaymentBook` holds the payments a settlement policy decided to record later.

## Rules
- The ledger is append-only. A recorded movement is never modified and never removed; a correction is a new movement of the type `adjustment`.
- No balance is ever stored as a separate number. Every balance is added from the movements, so no stored total can ever disagree with them.
- The ledger imports nothing from `pricing/`, `trust/`, `validation/`, or `identity/`. It receives an amount and a validation status, and it stores them. This is what lets the accounting stay simple while the three other questions stay hard.
- A credit that waits for a validation is not spendable, a credit whose tick has not come is not spendable either, and a debit always counts, so an account can never hide a debt behind a credit it cannot spend.
- A payment held in the deferred payment book is in no balance at all, because it is not recorded yet. That is the point of settling in batches: the network keeps a moment where it can still change its mind about work it has not paid for.
- The ledger answers what an account was paid for results nobody verified, and what was already taken back from it, but it never decides to take anything back. The penalty is decided in `trust/` and the movement is recorded here.

## Background
- The fields of a movement and the reconstruction of the balance come from section 5 of [the design note](../../docs/design_note.md). The three settlement policies come from section 6, and which one to keep is left open by section 12.4, so the choice is a parameter and the simulation measures what each one costs.
