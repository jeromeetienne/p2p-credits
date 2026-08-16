# Directory Context: `/docs`

## Purpose
Everything written about this repository that is neither a `CONTEXT.md` nor the `README.md` of a folder of source code. The documents are split by the question the reader is asking, not by the part of the code the answer is about.

## Key Exports & Entry Points
- `README.md`: the index, which says what each document answers and in which order to read them.
- `tutorial/`: numbered lessons for a reader who has never run the repository — see its own CONTEXT.md.
- `guides/`: one document per task, for a reader who already knows the vocabulary — see its own CONTEXT.md.
- `reference/`: the exact parameters of every exported name — see its own CONTEXT.md.
- `explanation/`: the design note, and why the design is the way it is — see its own CONTEXT.md.

## Rules
- `explanation/design_note.md` is a copy of [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1), which stays the authoritative version. A change of the design is written in the issue first, and copied here afterwards.
- A fact that already lives in a `CONTEXT.md`, in a `README.md`, or in another document of `docs/` is linked to, never copied, because a copy becomes a second version that disagrees with the first.
- Every code sample in `docs/` imports from `src/index.js` only, and uses names that `src/index.ts` exports, because a sample that reaches inside `src/` teaches a reader to break the one rule the examples exist to prove.
- Every number a document states about what a run measured names the example that produced it, because a number with no run behind it cannot be checked when the code moves.

## Background
- The four folders and the reader each one is written for come from the proposal accepted in this repository, and follow the split between learning, performing a task, looking a name up, and understanding a decision.
- The design note is [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1) and the implementation plan is [issue #2](https://github.com/jeromeetienne/p2p-credits/issues/2).
