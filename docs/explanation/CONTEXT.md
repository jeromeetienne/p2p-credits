# Directory Context: `/docs/explanation`

## Purpose
Why the design is the way it is: the design note the whole repository implements, and one document per decision the design note left open.

## Key Exports & Entry Points
- `README.md`: the entry point of this folder, which lists one line per explanation document.
- `design_note.md`: a copy of [issue #1](https://github.com/jeromeetienne/p2p-credits/issues/1), which stays the authoritative version.
- `three_separate_questions.md`: why the price, the trust, and the validity never import each other.
- `when_a_payment_becomes_spendable.md`: the balance against the spendable balance.
- `account_or_device.md`: the open question of section 12.3, and what the simulation measured.
- `the_central_hypothesis.md`: the hypothesis of section 15, and the verdict of the sweeps.
- `prior_art.md`: what BOINC and Folding@home already solved.

## Rules
- `design_note.md` is changed only by copying the issue again. A change of the design is written in the issue first.
- A document here explains and never instructs. The way to perform a task lives in `../guides/`, and the signature of a name lives in `../reference/`.
- A document that states what a run measured names the example and the command that produced the numbers, because a measured claim with no run behind it cannot be checked when the code moves.

## Background
- The split between a lesson, a guide, a reference document, and an explanation is stated in [the context of `/docs`](../CONTEXT.md).
