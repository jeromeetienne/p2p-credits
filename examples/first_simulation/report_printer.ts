import type { DeviceSummary, SimulationReport, WorkerBehaviorName, WorkerSummary } from '../../src/index.js';

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
	/** Average trust of the accounts of the group. */
	averageAccountTrust: number;
	/** Average trust of the devices of the group. */
	averageDeviceTrust: number;
	/** Number of results of the group that other workers contradicted. */
	invalidResultCount: number;
	/** Average tick at which a worker of the group first reached the trusted threshold. */
	averageFirstTrustedTick: number | undefined;
};

/** The metrics of one group of devices that share the same behaviour and joined at the same tick. */
type DeviceGroupSummary = {
	/** The behaviour shared by the owners of the devices of the group. */
	behaviorName: WorkerBehaviorName;
	/** Tick at which the devices of the group joined the network. */
	addedAtTick: number;
	/** Number of devices in the group. */
	deviceCount: number;
	/** Average trust of the devices of the group. */
	averageDeviceTrust: number;
	/** Average trust of the accounts that own the devices of the group. */
	averageAccountTrust: number;
	/** Average trust a worker of the group is judged with when it uses one of these devices. */
	averageCombinedTrust: number;
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
		console.log(`tasks nobody could execute       ${simulationReport.unassignedTaskCount}`);
		console.log(`suspensions pronounced           ${simulationReport.suspensionCount}`);
		console.log(
			`credits taken back               ${ReportPrinter._formatCredits(simulationReport.confiscatedCredits)}`,
		);
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

		ReportPrinter.printValidity(simulationReport, 'validity');

		console.log('--- workers ---');
		console.log(
			ReportPrinter._formatWorkerRow([
				'behaviour',
				'workers',
				'total balance',
				'account trust',
				'device trust',
				'invalid results',
				'trusted at tick',
			]),
		);
		for (const behaviorSummary of ReportPrinter._summarizeByBehavior(simulationReport.workerSummaries)) {
			let trustedTickText = 'never';
			if (behaviorSummary.averageFirstTrustedTick !== undefined) {
				trustedTickText = ReportPrinter._formatNumber(behaviorSummary.averageFirstTrustedTick);
			}
			console.log(
				ReportPrinter._formatWorkerRow([
					behaviorSummary.behaviorName,
					String(behaviorSummary.workerCount),
					ReportPrinter._formatCredits(behaviorSummary.totalBalance),
					ReportPrinter._formatNumber(behaviorSummary.averageAccountTrust),
					ReportPrinter._formatNumber(behaviorSummary.averageDeviceTrust),
					String(behaviorSummary.invalidResultCount),
					trustedTickText,
				]),
			);
		}
		console.log('');

		console.log('--- devices ---');
		console.log(
			ReportPrinter._formatDeviceRow([
				'behaviour',
				'devices',
				'joined at tick',
				'device trust',
				'account trust',
				'combined trust',
			]),
		);
		for (const deviceGroupSummary of ReportPrinter._summarizeDevices(simulationReport.deviceSummaries)) {
			console.log(
				ReportPrinter._formatDeviceRow([
					deviceGroupSummary.behaviorName,
					String(deviceGroupSummary.deviceCount),
					String(deviceGroupSummary.addedAtTick),
					ReportPrinter._formatNumber(deviceGroupSummary.averageDeviceTrust),
					ReportPrinter._formatNumber(deviceGroupSummary.averageAccountTrust),
					ReportPrinter._formatNumber(deviceGroupSummary.averageCombinedTrust),
				]),
			);
		}
		console.log('');
	}

	/**
	 * Writes how the comparison of each task type behaved, under the given heading.
	 *
	 * @param simulationReport The report of the run.
	 * @param headingName The heading written above the table.
	 * @returns Nothing.
	 */
	static printValidity(simulationReport: SimulationReport, headingName: string): void {
		console.log(`--- ${headingName} ---`);
		console.log(
			ReportPrinter._formatValidationRow([
				'task type',
				'comparison',
				'comparisons',
				'disagreements',
				'genuine rejected',
			]),
		);
		for (const taskTypeValidationSummary of simulationReport.taskTypeValidationSummaries) {
			console.log(
				ReportPrinter._formatValidationRow([
					taskTypeValidationSummary.taskTypeName,
					taskTypeValidationSummary.comparisonStrategyName,
					String(taskTypeValidationSummary.comparisonCount),
					String(taskTypeValidationSummary.disagreementCount),
					String(taskTypeValidationSummary.genuineResultRejectedCount),
				]),
			);
		}
		console.log(`correct results rejected in total  ${simulationReport.correctResultRejectedCount}`);
		console.log(`tasks left with no majority       ${simulationReport.unresolvedTaskCount}`);
		const creditsCreated = ReportPrinter._formatCredits(simulationReport.totalCreditsCreated);
		console.log(`credits created                   ${creditsCreated}`);
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
			let totalAccountTrust = 0;
			let totalDeviceTrust = 0;
			let invalidResultCount = 0;
			let totalFirstTrustedTick = 0;
			let trustedWorkerCount = 0;
			for (const workerSummary of groupSummaries) {
				totalBalance += workerSummary.balance;
				totalAccountTrust += workerSummary.accountTrust;
				totalDeviceTrust += workerSummary.deviceTrust;
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
				averageAccountTrust: totalAccountTrust / groupSummaries.length,
				averageDeviceTrust: totalDeviceTrust / groupSummaries.length,
				invalidResultCount: invalidResultCount,
				averageFirstTrustedTick: averageFirstTrustedTick,
			});
		}

		return behaviorSummaries;
	}

	/**
	 * Groups the devices by the behaviour of their owner and by the tick they joined at, and adds their numbers.
	 *
	 * @param deviceSummaries What each device earned in trust, and when it joined the network.
	 * @returns One line of metrics per group of devices.
	 */
	private static _summarizeDevices(deviceSummaries: DeviceSummary[]): DeviceGroupSummary[] {
		const deviceGroupSummaries: DeviceGroupSummary[] = [];
		const behaviorNames: WorkerBehaviorName[] = ['honest', 'unstable', 'malicious'];

		const joinedTicks = [...new Set(deviceSummaries.map((deviceSummary) => {
			return deviceSummary.addedAtTick;
		}))].sort((tickA, tickB) => {
			return tickA - tickB;
		});

		for (const behaviorName of behaviorNames) {
			for (const addedAtTick of joinedTicks) {
				const groupSummaries = deviceSummaries.filter((deviceSummary) => {
					return deviceSummary.behaviorName === behaviorName && deviceSummary.addedAtTick === addedAtTick;
				});
				if (groupSummaries.length === 0) {
					continue;
				}

				let totalDeviceTrust = 0;
				let totalAccountTrust = 0;
				let totalCombinedTrust = 0;
				for (const deviceSummary of groupSummaries) {
					totalDeviceTrust += deviceSummary.deviceTrust;
					totalAccountTrust += deviceSummary.accountTrust;
					totalCombinedTrust += deviceSummary.combinedTrust;
				}

				deviceGroupSummaries.push({
					behaviorName: behaviorName,
					addedAtTick: addedAtTick,
					deviceCount: groupSummaries.length,
					averageDeviceTrust: totalDeviceTrust / groupSummaries.length,
					averageAccountTrust: totalAccountTrust / groupSummaries.length,
					averageCombinedTrust: totalCombinedTrust / groupSummaries.length,
				});
			}
		}

		return deviceGroupSummaries;
	}

	/**
	 * Writes one line of the table of comparisons, so that the heading and the lines below it always line up.
	 *
	 * @param cells The five cells of the line, from the name of the task type to the genuine results rejected.
	 * @returns The written line.
	 */
	private static _formatValidationRow(cells: string[]): string {
		return ReportPrinter._formatRow(cells, [17, 22, 13, 15, 18]);
	}

	/**
	 * Writes one line of the table of devices, so that the heading and the lines below it always line up.
	 *
	 * @param cells The six cells of the line, from the behaviour to the combined trust.
	 * @returns The written line.
	 */
	private static _formatDeviceRow(cells: string[]): string {
		return ReportPrinter._formatRow(cells, [13, 9, 16, 15, 15, 16]);
	}

	/**
	 * Writes one line of the table of workers, so that the heading and the lines below it always line up.
	 *
	 * @param cells The seven cells of the line, from the behaviour to the tick the group became trusted at.
	 * @returns The written line.
	 */
	private static _formatWorkerRow(cells: string[]): string {
		return ReportPrinter._formatRow(cells, [13, 9, 16, 15, 14, 17, 17]);
	}

	/**
	 * Writes one line of the table of prices, so that the heading and the lines below it always line up.
	 *
	 * @param cells The six cells of the line, from the name of the task type to the profitability.
	 * @returns The written line.
	 */
	private static _formatPricingRow(cells: string[]): string {
		return ReportPrinter._formatRow(cells, [17, 11, 15, 11, 12, 15]);
	}

	/**
	 * Writes one line of a table, with the first cell against the left and every other cell against the right.
	 *
	 * @param cells The cells of the line.
	 * @param cellWidths The width of every cell, in characters.
	 * @returns The written line.
	 */
	private static _formatRow(cells: string[], cellWidths: number[]): string {
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
