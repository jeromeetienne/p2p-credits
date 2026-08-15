# Directory Context: `/src/trust`

## Purpose
The trust score of every account: the estimated likelihood that a result produced by that account is correct.

## Key Exports & Entry Points
- `trust_score.ts`: `TrustScoreBook`, which holds the score of every account and moves it after a confirmed result and after an invalid result.

## Rules
- The trust score is not money. It is never exchanged, never spent, and never mixed with the balance held by the ledger.
- A trust score only moves when another worker confirms or contradicts a result. A result nobody duplicated changes nothing, because the network learned nothing about it.
- A trust score stays between the minimum trust and the maximum trust given at construction, so one very long run can never push a score out of reach of any penalty.
- Nothing here imports from `pricing/`, `validation/`, or `ledger/`.

## Background
- The trust score, its rise, and its fall come from section 3 of [the design note](../../docs/design_note.md). Whether trust belongs to the account, to the device, or to both is left open by section 12.3 and is measured in milestone 3 of [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2). This first version holds one score per account.
