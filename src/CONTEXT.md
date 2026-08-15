# Directory Context: `/src`

## Purpose
The credit accounting library. It answers three separate questions — the price of a task, the trust of a worker, and the validity of a result — and it records the movements of credits that follow.

## Key Exports & Entry Points
- `index.ts`: the one public interface of the library.
- `types/`: the shared types and Zod schemas, with no logic — see its own CONTEXT.md.
- `pricing/`: the price of a task — see its own CONTEXT.md.
- `trust/`: the trust of a worker — see its own CONTEXT.md.
- `validation/`: the validity of a result — see its own CONTEXT.md.
- `ledger/`: the append-only movements of credits, and when a payment becomes spendable — see its own CONTEXT.md.
- `identity/`: what an account costs to open, and how far it may consume before contributing — see its own CONTEXT.md.
- `scheduler/`: the assignment of a task and the choice of a validator — see its own CONTEXT.md.
- `simulation/`: the primitives that run a simulated network over the modules above — see its own CONTEXT.md.

## Rules
- `ledger/` imports nothing from `pricing/`, `trust/`, `validation/`, or `identity/`. It receives an amount and a validation status, and it stores them. This boundary is what keeps the accounting simple while the three other questions stay hard.
- `identity/` imports nothing from the other folders either. It reads balances as plain numbers, so the rule about who may spend is never mixed with the record of what was spent.
- `pricing/`, `trust/`, and `validation/` never import from each other. Section 1 of the design note keeps the three dimensions separate, so a change in one of them never forces a change in the other two.
- `simulation/` may import from every other folder, and no other folder imports from `simulation/`.
- No barrel file inside a subfolder. Only `index.ts` is a public interface; inside the library, every file imports the specific file it needs.
- Every import of a file of this library ends with `.js`, because the library is compiled to a Node.js module.

## Background
- The separation of the three questions comes from section 1 of [the design note](../docs/design_note.md).
