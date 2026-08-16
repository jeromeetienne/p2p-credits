# Directory Context: `/docs/reference`

## Purpose
The exact parameters of every name the library exports, for a reader who already knows what they want and has come to look it up.

## Key Exports & Entry Points
- `README.md`: the entry point of this folder, which lists one line per reference document.
- `public_interface.md`: every name `src/index.ts` exports, in one list, with the document that describes each one.
- `pricing.md`, `trust.md`, `validation.md`, `ledger.md`, `identity.md`, `scheduler.md`, `simulation.md`: one document per folder of `src/`, in the same shape as that folder.
- `metrics.md`: one entry per measured number of a run.

## Rules
- This folder holds only what `src/index.ts` exports. A name that is not exported is never documented here, because a reader who finds it here will try to import it and cannot.
- A document here describes and never explains. The reason behind a signature lives in `../explanation/`, and the way to use it lives in `../guides/`.
- The documents are organised like `src/`, one for one, so that a new folder in `src/` gets a new document here and the gap is visible.

## Background
- The rule that nothing outside the library imports a file inside a subfolder of `src/` is stated in [the context of `/src`](../../src/CONTEXT.md).
