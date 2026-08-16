# Directory Context: `/src/types`

## Purpose
The shapes shared by every module of the library: the account, the device, the task, the movement of credits, and the source of randomness.

## Key Exports & Entry Points
- `account_types.ts`: the identity of a participant of the network.
- `device_types.ts`: the machine that executes a task on behalf of an account.
- `task_types.ts`: the task, its type, its assignment, its result, and the validation status of that result.
- `benchmark_types.ts`: the environment a price is measured in, and one measured run.
- `ledger_types.ts`: the movements of credits recorded by the ledger.
- `random_types.ts`: `RandomNumberFn`, the source of randomness every policy receives.
- `trust_types.ts`: `WorkerTrustFn`, how a module reads a trust score without importing the trust module.

## Rules
- This folder holds no logic. A file here declares a Zod schema and the type inferred from it, and nothing else.
- Nothing here imports from another folder of the library, so every module can depend on this one without creating a cycle.
- An account holds its identity only. Its balance is reconstructed from the ledger and its trust score is held by the trust module, because those three concerns stay separate.

## Background
- The shapes follow the minimal architecture of section 13 of [the design note](../../docs/explanation/design_note.md), and the fields of a ledger entry follow section 5.
