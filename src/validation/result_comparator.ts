///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ResultComparator — decides whether two results say the same thing
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The outcome of the comparison of two results. */
export type ComparisonOutcome = 'agreement' | 'disagreement';

/**
 * The comparison of two results returned for the same task.
 *
 * This first version compares the two values exactly. Section 12.1 of the design note explains that two correct
 * executions of the same task can return slightly different values, so a numerical tolerance, a normalized hash, and
 * a similarity score will be added later, next to this exact comparison rather than in place of it.
 */
export class ResultComparator {
	/**
	 * Compares two results returned for the same task.
	 *
	 * @param resultValueA The value returned by the first worker.
	 * @param resultValueB The value returned by the second worker.
	 * @returns `agreement` when the two values are the same, `disagreement` otherwise.
	 */
	static compare(resultValueA: string, resultValueB: string): ComparisonOutcome {
		if (resultValueA === resultValueB) {
			return 'agreement';
		}
		return 'disagreement';
	}
}
