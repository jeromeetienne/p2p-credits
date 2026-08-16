# Reference: Ledger

The movements of credits. The ledger knows nothing about the price of a task, about the trust of a worker, or about the way a result was validated: it receives an amount and a validation status, and it stores them. Every balance is rebuilt from the stored movements, never held as a separate number that could disagree with them.

Everything here comes from `src/ledger/`.

## `Ledger`

The append-only ledger of the network. Entries are never modified and never removed.

### `append(ledgerEntryDraft: LedgerEntryDraft): LedgerEntry`

Records one movement and gives it an identifier in the order of arrival.

A `LedgerEntryDraft` holds the tick, the account, the task, the entry type, the amount, the tick the amount becomes spendable from, a short sentence saying why, and the validation status of the result the movement pays for. The amount is positive for a credit and for a debit, and the entry type gives the direction; the amount of an adjustment is signed, because an adjustment can add or remove credits.

`LedgerEntryType` is `credit`, `debit`, or `adjustment`.

### `balanceOf(accountId): number`

The balance of an account, including the credits that are still waiting for a validation. It can be negative.

### `spendableBalanceOf(accountId, currentTick): number`

The part of the balance the account may spend right now. A credit that waits for a validation is not spendable, and neither is a credit whose tick has not come yet. A debit always counts, so an account can never hide a debt behind a credit it cannot spend.

### `earnedTotalOf(accountId): number`

Everything the account was ever paid for the work it performed, whether or not it can be spent yet. This is what the rule about contributing before consuming reads.

### `consumedTotalOf(accountId): number`

Everything the account ever had the network execute for it, whether or not it ever paid for it.

### `unverifiedCreditTotalOf(accountId): number`

What the account was paid for results nobody ever verified. These are the credits a confiscation takes back, because a worker caught cheating once makes every result of its that nobody looked at suspect.

### `adjustmentTotalOf(accountId): number`

The sum of the corrections recorded for the account, negative when credits were taken back.

### `totalCreditsCreated(): number`, `totalCreditsConsumed(): number`

Every credit and every positive adjustment, and every debit.

### `allEntries(): readonly LedgerEntry[]`, `entriesOf(accountId): LedgerEntry[]`

Every movement, and every movement of one account. The second returns a copy.

## `SettlementPolicy`

When one payment is recorded, and when the worker may spend it. The policy computes and decides; holding a payment that is not recorded yet is the work of the deferred payment book.

### `new SettlementPolicy(settlementPolicyOptions: SettlementPolicyOptions)`

`SettlementPolicyOptions` holds:

- `policyName: SettlementPolicyName`
- `provisionalTickCount: number` — how many ticks a payment stays unspendable under `provisional credit`.
- `settlementPeriodTickCount: number` — how many ticks between two settlements under `delayed settlement`.

### `SettlementPolicyName`

- `immediate credit` — the worker is paid at once and can spend at once. The experience is smooth, and an attacker can spend what it stole before anybody notices.
- `provisional credit` — the worker is paid at once and can spend only after a delay. The experience is less smooth, and there is a window in which a fraud found late can still be taken back from something.
- `delayed settlement` — the payments are held and recorded together at the end of a period. The accounting is the most robust and the worker waits the longest.

`SettlementPolicyNameSchema` validates the name at run time.

### `decideForPayment(currentTick): SettlementDecision`

`SettlementDecision` holds `recordAtTick`, which can be later than the tick the work was performed at, and `spendableFromTick`.

### `policyName(): SettlementPolicyName`

## `DeferredPaymentBook`

The payments a settlement policy decided to record later. A payment waiting here is not in the ledger, so it appears in no balance and can be dropped before it is ever recorded.

### `hold(ledgerEntryDraft): void`

Holds one payment until the tick it is recorded at.

### `releaseDue(currentTick): LedgerEntryDraft[]`

Takes out every payment whose tick has come, in the order they arrived.

### `dropUnverifiedCreditsOf(accountId): number`

Drops the payments of one account that were owed for results nobody ever verified, and returns what they were worth. A confiscation has to reach these payments too, and since they are not in the ledger nothing can be taken back from them — they are dropped instead, which is exactly the moment a settlement in batches keeps for changing its mind.

### `heldCount(): number`, `heldTotal(): number`

How many payments are still waiting, and what they are worth.

## Related

- [Choose a settlement policy](../guides/choose_a_settlement_policy.md)
- [When a payment becomes spendable](../explanation/when_a_payment_becomes_spendable.md)
- [The context of `/src/ledger`](../../src/ledger/CONTEXT.md)
