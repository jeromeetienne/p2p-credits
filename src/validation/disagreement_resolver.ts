import { z as Zod } from 'zod';

import type { AccountId } from '../types/account_types.js';
import type { TaskResult, TaskTypeName } from '../types/task_types.js';
import type { WorkerTrustFn } from '../types/trust_types.js';
import type { ResultComparator } from './result_comparator.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	DisagreementResolver — finds the winning result when workers return different ones
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the name of a resolution method. */
export const ResolutionMethodNameSchema = Zod.enum([
	'majority',
	'trust weighted',
]);

/**
 * The name of a resolution method.
 *
 * - `majority`: every worker carries one vote, and a value wins when more than half of the copies returned it.
 * - `trust weighted`: a worker carries a vote as heavy as its trust, so a value returned by one highly trusted
 *   worker can outweigh a value returned by several workers nobody has confirmed yet.
 */
export type ResolutionMethodName = Zod.infer<typeof ResolutionMethodNameSchema>;

/** What the resolution decided about a set of results returned for one task. */
export type MajorityOutcome = {
	/** The value that won, or `undefined` when no value gathered more than half of the votes. */
	majorityResultValue: string | undefined;
	/** The accounts that returned a value agreeing with the one that won. */
	agreeingAccountIds: AccountId[];
	/** The accounts that returned another value. */
	disagreeingAccountIds: AccountId[];
};

/** One value returned for a task, and every account that returned a value agreeing with it. */
type ResultCluster = {
	/** The value the cluster was opened with. */
	resultValue: string;
	/** The accounts whose value agrees with the value of the cluster. */
	accountIds: AccountId[];
	/** The sum of the votes of those accounts. */
	voteWeight: number;
};

/**
 * The resolution of a disagreement between workers.
 *
 * When two workers return different results, the network does not yet know which one is wrong, so a third source of
 * truth is needed. The results are then gathered into groups that say the same thing, and the heaviest group wins.
 *
 * Two results are gathered together through the comparison strategy of their task type, never through a plain string
 * equality, otherwise two correct executions that differ by a rounding would each open a group of their own and no
 * group would ever win.
 */
export class DisagreementResolver {
	/**
	 * Finds the value more than half of the workers returned.
	 *
	 * @param taskResults Every result returned for the same task.
	 * @param resultComparator The comparison that says whether two values agree.
	 * @param taskTypeName Name of the type of the task, which decides how the values are compared.
	 * @returns The value that won, the accounts that agree with it, and the accounts that do not.
	 */
	static resolveByMajority(
		taskResults: TaskResult[],
		resultComparator: ResultComparator,
		taskTypeName: TaskTypeName,
	): MajorityOutcome {
		return DisagreementResolver._resolveWithVotes(taskResults, resultComparator, taskTypeName, () => {
			return 1;
		});
	}

	/**
	 * Finds the value the most trusted workers returned, where a worker votes as heavily as it is trusted.
	 *
	 * Every worker keeps a vote of at least the minimum weight, so a worker at the bottom of the scale still counts
	 * for something and a single trusted worker cannot decide alone against everybody else.
	 *
	 * @param taskResults Every result returned for the same task.
	 * @param resultComparator The comparison that says whether two values agree.
	 * @param taskTypeName Name of the type of the task, which decides how the values are compared.
	 * @param workerTrustFn The trust of a worker.
	 * @param minimumVoteWeight The weight of a vote carried by a worker with no trust at all.
	 * @returns The value that won, the accounts that agree with it, and the accounts that do not.
	 */
	static resolveByTrustWeight(
		taskResults: TaskResult[],
		resultComparator: ResultComparator,
		taskTypeName: TaskTypeName,
		workerTrustFn: WorkerTrustFn,
		minimumVoteWeight: number,
	): MajorityOutcome {
		return DisagreementResolver._resolveWithVotes(taskResults, resultComparator, taskTypeName, (taskResult) => {
			const workerTrust = workerTrustFn(taskResult.accountId, taskResult.deviceId);
			return Math.max(workerTrust, 0) + minimumVoteWeight;
		});
	}

	/**
	 * Gathers the results into groups that say the same thing and returns the heaviest group, when that group holds
	 * more than half of the total weight.
	 *
	 * @param taskResults Every result returned for the same task.
	 * @param resultComparator The comparison that says whether two values agree.
	 * @param taskTypeName Name of the type of the task, which decides how the values are compared.
	 * @param voteWeightFn The weight of the vote of one result.
	 * @returns The value that won, the accounts that agree with it, and the accounts that do not.
	 */
	private static _resolveWithVotes(
		taskResults: TaskResult[],
		resultComparator: ResultComparator,
		taskTypeName: TaskTypeName,
		voteWeightFn: (taskResult: TaskResult) => number,
	): MajorityOutcome {
		const resultClusters: ResultCluster[] = [];
		let totalWeight = 0;

		for (const taskResult of taskResults) {
			const voteWeight = voteWeightFn(taskResult);
			totalWeight += voteWeight;

			const matchingCluster = resultClusters.find((resultCluster) => {
				const comparisonOutcome = resultComparator.compare(
					taskTypeName,
					resultCluster.resultValue,
					taskResult.resultValue,
				);
				return comparisonOutcome === 'agreement';
			});
			if (matchingCluster === undefined) {
				resultClusters.push({
					resultValue: taskResult.resultValue,
					accountIds: [taskResult.accountId],
					voteWeight: voteWeight,
				});
				continue;
			}
			matchingCluster.accountIds.push(taskResult.accountId);
			matchingCluster.voteWeight += voteWeight;
		}

		let winningCluster: ResultCluster | undefined = undefined;
		for (const resultCluster of resultClusters) {
			if (resultCluster.voteWeight * 2 <= totalWeight) {
				continue;
			}
			if (winningCluster === undefined || resultCluster.voteWeight > winningCluster.voteWeight) {
				winningCluster = resultCluster;
			}
		}

		if (winningCluster === undefined) {
			return {
				majorityResultValue: undefined,
				agreeingAccountIds: [],
				disagreeingAccountIds: taskResults.map((taskResult) => {
					return taskResult.accountId;
				}),
			};
		}

		const agreeingAccountIds = winningCluster.accountIds;
		const disagreeingAccountIds = taskResults
			.filter((taskResult) => {
				return agreeingAccountIds.includes(taskResult.accountId) === false;
			})
			.map((taskResult) => {
				return taskResult.accountId;
			});

		return {
			majorityResultValue: winningCluster.resultValue,
			agreeingAccountIds: agreeingAccountIds,
			disagreeingAccountIds: disagreeingAccountIds,
		};
	}
}
