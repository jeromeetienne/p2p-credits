# Directory Context: `/src/trust`

## Purpose
The trust of every account and of every device: the estimated likelihood that a result produced by a worker is correct, what one judged result does to that estimate, and who the network stops sending tasks to.

## Key Exports & Entry Points
- `trust_score.ts`: `TrustScoreBook` holds the score of every account and of every device, and combines the two into the trust of a worker.
- `trust_policy.ts`: `TrustPolicy` decides what one confirmed or contradicted result does to a score, and which penalty follows.
- `suspension_book.ts`: `SuspensionBook` holds the accounts that receive no task for a while.

## Rules
- The trust score is not money. It is never exchanged, never spent, and never mixed with the balance held by the ledger.
- A score only moves when another worker confirms or contradicts a result. A result nobody duplicated changes nothing, because the network learned nothing about it.
- The policy computes and decides; it stores nothing. The book stores and never decides. This is what lets the same policy be applied to the score of an account and to the score of a device.
- An account and a device each carry their own score, and the trust of a worker combines the two with the weight given at construction. A trusted account that adds an unknown device therefore hands over only a part of its history, and how big that part is stays a parameter.
- A score stays between the minimum trust and the maximum trust, so one very long run can never push a score out of reach of any penalty.
- Nothing here imports from `pricing/`, `validation/`, or `ledger/`. A penalty that takes credits back says so, and the caller records the movement.

## Background
- The trust score, its rise, and its fall come from section 3 of [the design note](../../docs/design_note.md). The five penalties come from section 12.5, and the split between the account and the device is the question of section 12.3, which the simulation measures rather than answers.
