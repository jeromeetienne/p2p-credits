import type { SimulationReport, WorkerBehaviorName, WorkerSummary } from '../../src/index.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ReportPrinter — writes the measured metrics of one run on the terminal
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The metrics of one group of workers that share the same behaviour. */
type BehaviorSummary = {
	/** The behaviour shared by the workers of the group. */
	behaviorName: WorkerBehaviorName;
	/** Number of workers in the group. */
	workerCount: number;
	/** Sum of the balances of the workers of the group, in credits. */
	totalBalance: number;
	/** Average trust score of the workers of the group. */
	averageTrust: number;
	/** Number of results of the group that other workers contradicted. */
	invalidResultCount: number;
	/** Average tick at which a worker of the group first reached the trusted threshold. */
	averageFirstTrustedTick: number | undefined;
};

/** The printed form of the report of one run. */
export class ReportPrinter {
	/**
	 * Writes the report of one run on the terminal.
	 *
	 * @param simulationReport The report of the run.
	 * @returns Nothing.
	 */
	static print(simulationReport: SimulationReport): void {
		console.log('');
		console.log('=== first simulation ===');
		console.log('');

		console.log('--- cost ---');
		console.log(`ticks                            ${simulationReport.tickCount}`);
		console.log(`tasks submitted                  ${simulationReport.taskCount}`);
		console.log(`executions performed             ${simulationReport.executionCount}`);
		console.log(`executions spent on validation   ${simulationReport.validationCopyExecutionCount}`);
		console.log(
			`share of the compute validating  ${ReportPrinter._formatPercentage(simulationReport.validationOverheadRatio)}`,
		);
		console.log('');

		console.log('--- security ---');
		console.log(`wrong results returned           ${simulationReport.wrongResultCount}`);
		console.log(`wrong results rejected           ${simulationReport.wrongResultDetectedCount}`);
		console.log(`wrong results paid for           ${simulationReport.wrongResultUndetectedCount}`);
		console.log(
			`credits paid for wrong results   ${ReportPrinter._formatCredits(simulationReport.creditsAwardedForWrongResults)}`,
		);
		console.log(`correct results rejected         ${simulationReport.correctResultRejectedCount}`);
		console.log(`tasks with no majority           ${simulationReport.unresolvedTaskCount}`);
		console.log('');

		console.log('--- economics ---');
		console.log(`credits created                  ${ReportPrinter._formatCredits(simulationReport.totalCreditsCreated)}`);
		const creditsConsumed = ReportPrinter._formatCredits(simulationReport.totalCreditsConsumed);
		console.log(`credits consumed                 ${creditsConsumed}`);
		console.log('');

		console.log('--- price ---');
		const creditsFromPricingError = ReportPrinter._formatCredits(simulationReport.creditsCreatedByPricingError);
		console.log(`credits created by the pricing error   ${creditsFromPricingError}`);
		console.log(
			`arbitrage between the task types       ${ReportPrinter._formatNumber(simulationReport.pricingArbitrageRatio)}`,
		);
		console.log(
			ReportPrinter._formatPricingRow([
				'task type',
				'true cost',
				'measured cost',
				'price',
				'true price',
				'profitability',
			]),
		);
		for (const taskTypePricingSummary of simulationReport.taskTypePricingSummaries) {
			console.log(
				ReportPrinter._formatPricingRow([
					taskTypePricingSummary.taskTypeName,
					`${taskTypePricingSummary.trueCostSeconds.toFixed(2)} s`,
					`${taskTypePricingSummary.measuredCostSeconds.toFixed(2)} s`,
					taskTypePricingSummary.price.toFixed(3),
					taskTypePricingSummary.truePrice.toFixed(3),
					taskTypePricingSummary.profitabilityRatio.toFixed(3),
				]),
			);
		}
		console.log('');

		console.log('--- workers ---');
		console.log('behaviour    workers  total balance  average trust  invalid results  trusted at tick');
		for (const behaviorSummary of ReportPrinter._summarizeByBehavior(simulationReport.workerSummaries)) {
			const behaviorName = behaviorSummary.behaviorName.padEnd(12, ' ');
			const workerCount = String(behaviorSummary.workerCount).padStart(7, ' ');
			const totalBalance = ReportPrinter._formatCredits(behaviorSummary.totalBalance).padStart(15, ' ');
			const averageTrust = ReportPrinter._formatNumber(behaviorSummary.averageTrust).padStart(15, ' ');
			const invalidResultCount = String(behaviorSummary.invalidResultCount).padStart(17, ' ');
			let trustedTickText = 'never';
			if (behaviorSummary.averageFirstTrustedTick !== undefined) {
				trustedTickText = ReportPrinter._formatNumber(behaviorSummary.averageFirstTrustedTick);
			}
			const firstTrustedTick = trustedTickText.padStart(17, ' ');
			console.log(
				`${behaviorName}${workerCount}${totalBalance}${averageTrust}${invalidResultCount}${firstTrustedTick}`,
			);
		}
		console.log('');
	}

	/**
	 * Groups the workers by behaviour and adds their numbers.
	 *
	 * @param workerSummaries What each worker earned, and how the network judged it.
	 * @returns One line of metrics per behaviour.
	 */
	private static _summarizeByBehavior(workerSummaries: WorkerSummary[]): BehaviorSummary[] {
		const behaviorSummaries: BehaviorSummary[] = [];
		const behaviorNames: WorkerBehaviorName[] = ['honest', 'unstable', 'malicious'];

		for (const behaviorName of behaviorNames) {
			const groupSummaries = workerSummaries.filter((workerSummary) => {
				return workerSummary.behaviorName === behaviorName;
			});
			if (groupSummaries.length === 0) {
				continue;
			}

			let totalBalance = 0;
			let totalTrust = 0;
			let invalidResultCount = 0;
			let totalFirstTrustedTick = 0;
			let trustedWorkerCount = 0;
			for (const workerSummary of groupSummaries) {
				totalBalance += workerSummary.balance;
				totalTrust += workerSummary.trust;
				invalidResultCount += workerSummary.invalidResultCount;
				if (workerSummary.firstTrustedTick !== undefined) {
					totalFirstTrustedTick += workerSummary.firstTrustedTick;
					trustedWorkerCount += 1;
				}
			}

			let averageFirstTrustedTick: number | undefined = undefined;
			if (trustedWorkerCount > 0) {
				averageFirstTrustedTick = totalFirstTrustedTick / trustedWorkerCount;
			}

			behaviorSummaries.push({
				behaviorName: behaviorName,
				workerCount: groupSummaries.length,
				totalBalance: totalBalance,
				averageTrust: totalTrust / groupSummaries.length,
				invalidResultCount: invalidResultCount,
				averageFirstTrustedTick: averageFirstTrustedTick,
			});
		}

		return behaviorSummaries;
	}

	/**
	 * Writes one line of the table of prices, so that the heading and the lines below it always line up.
	 *
	 * @param cells The six cells of the line, from the name of the task type to the profitability.
	 * @returns The written line.
	 */
	private static _formatPricingRow(cells: string[]): string {
		const cellWidths = [17, 11, 15, 11, 12, 15];
		const writtenCells = cells.map((cell, cellIndex) => {
			const cellWidth = cellWidths[cellIndex] ?? 12;
			if (cellIndex === 0) {
				return cell.padEnd(cellWidth, ' ');
			}
			return cell.padStart(cellWidth, ' ');
		});
		return writtenCells.join('');
	}

	/**
	 * Writes an amount of credits with two decimals.
	 *
	 * @param amount The amount in credits.
	 * @returns The written amount.
	 */
	private static _formatCredits(amount: number): string {
		return `${amount.toFixed(2)} credits`;
	}

	/**
	 * Writes a number with two decimals.
	 *
	 * @param value The number.
	 * @returns The written number.
	 */
	private static _formatNumber(value: number): string {
		return value.toFixed(2);
	}

	/**
	 * Writes a share as a percentage with one decimal.
	 *
	 * @param ratio The share, between 0 and 1.
	 * @returns The written percentage.
	 */
	private static _formatPercentage(ratio: number): string {
		return `${(ratio * 100).toFixed(1)} percent`;
	}
}
