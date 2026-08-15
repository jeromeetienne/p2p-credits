import type { AccountId } from '../types/account_types.js';
import type { TaskResult } from '../types/task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	DisagreementResolver — finds the majority when two workers return different results
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** What the majority vote decided about a set of results returned for one task. */
export type MajorityOutcome = {
	/** The value returned by the majority, or `undefined` when no value reached a majority. */
	majorityResultValue: string | undefined;
	/** The accounts that returned the value of the majority. */
	agreeingAccountIds: AccountId[];
	/** The accounts that returned another value. */
	disagreeingAccountIds: AccountId[];
};

/**
 * The resolution of a disagreement between workers.
 *
 * When two workers return different results, the network does not yet know which one is wrong, so a third source of
 * truth is needed. This first version compares the values of every copy of the task and keeps the value returned by
 * more than half of them. A comparison against a reference machine, and a preference for a highly trusted worker,
 * will be added later.
 */
export class DisagreementResolver {
	/**
	 * Finds the value returned by more than half of the workers.
	 *
	 * @param taskResults Every result returned for the same task.
	 * @returns The value of the majority, the accounts that agree with it, and the accounts that do not.
	 */
	static resolveByMajority(taskResults: TaskResult[]): MajorityOutcome {
		const accountIdsByResultValue = new Map<string, AccountId[]>();
		for (const taskResult of taskResults) {
			const accountIds = accountIdsByResultValue.get(taskResult.resultValue) ?? [];
			accountIds.push(taskResult.accountId);
			accountIdsByResultValue.set(taskResult.resultValue, accountIds);
		}

		let majorityResultValue: string | undefined = undefined;
		let majorityAccountIds: AccountId[] = [];
		for (const [resultValue, accountIds] of accountIdsByResultValue) {
			if (accountIds.length * 2 > taskResults.length && accountIds.length > majorityAccountIds.length) {
				majorityResultValue = resultValue;
				majorityAccountIds = accountIds;
			}
		}

		if (majorityResultValue === undefined) {
			return {
				majorityResultValue: undefined,
				agreeingAccountIds: [],
				disagreeingAccountIds: taskResults.map((taskResult) => taskResult.accountId),
			};
		}

		const disagreeingAccountIds = taskResults
			.filter((taskResult) => taskResult.resultValue !== majorityResultValue)
			.map((taskResult) => taskResult.accountId);

		return {
			majorityResultValue: majorityResultValue,
			agreeingAccountIds: majorityAccountIds,
			disagreeingAccountIds: disagreeingAccountIds,
		};
	}
}
