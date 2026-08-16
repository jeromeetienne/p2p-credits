# Directory Context: `/docs/tutorial`

## Purpose
Numbered lessons for a reader who has never run this repository, followed in order, from the first command to a report that can be read and then changed.

## Key Exports & Entry Points
- `01_first_simulation.md`: from `npm install` to a printed report.
- `02_reading_the_report.md`: what each measured number means, and which value of it is bad.
- `03_changing_one_parameter.md`: run a parameter sweep, and read where the network stops working.

## Rules
- A lesson gives the reader one path and no choice. A document that offers alternatives belongs in `../guides/`, and a document that explains a decision belongs in `../explanation/`.
- A lesson never states a number a run produces without naming the command that produces it, because the reader has to be able to see the same number on the terminal.
- A new lesson gets the next number and is added to `../README.md`, because the order is the whole point of this folder.

## Background
- The split between a lesson, a guide, a reference document, and an explanation is stated in [the context of `/docs`](../CONTEXT.md).
