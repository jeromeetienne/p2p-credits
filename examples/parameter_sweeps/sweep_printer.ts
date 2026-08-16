import { OperatingRegion, type OperatingRegionLimits, type SweepResult } from '../../src/index.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SweepPrinter — writes one sweep as one table on the terminal
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The printed form of one sweep. */
export class SweepPrinter {
	/**
	 * Writes one sweep as one table, one line per value of the parameter that moves.
	 *
	 * @param sweepName Name of the parameter that moves.
	 * @param sweepResults What each value measured.
	 * @param operatingRegionLimits The three limits every value is held to.
	 * @returns Nothing.
	 */
	static print(
		sweepName: string,
		sweepResults: SweepResult[],
		operatingRegionLimits: OperatingRegionLimits,
	): void {
		console.log(`--- ${sweepName} ---`);
		console.log(
			SweepPrinter._formatRow([
				sweepName,
				'validating',
				'fraud paid',
				'sybil kept',
				'caught after',
				'unfair',
				'refused',
				'worth running',
			]),
		);

		for (const sweepResult of sweepResults) {
			const summary = sweepResult.summary;
			const verdict = OperatingRegion.judge(summary, operatingRegionLimits);

			let detectionDelay = 'never caught';
			if (summary.averageDetectionDelayTicks !== undefined) {
				detectionDelay = `${summary.averageDetectionDelayTicks.toFixed(1)} ticks`;
			}

			console.log(
				SweepPrinter._formatRow([
					sweepResult.pointName,
					SweepPrinter._formatPercentage(summary.validationShare),
					SweepPrinter._formatPercentage(summary.fraudulentCreditShare),
					summary.sybilAttackerProfit.toFixed(1),
					detectionDelay,
					SweepPrinter._formatPercentage(summary.unfairRejectionShare),
					SweepPrinter._formatPercentage(summary.honestRefusalShare),
					SweepPrinter._formatVerdict(verdict.isInsideOperatingRegion),
				]),
			);
		}
		console.log('');
	}

	/**
	 * Writes the reason every value of one sweep fell outside the region, when it did.
	 *
	 * @param sweepName Name of the parameter that moves.
	 * @param sweepResults What each value measured.
	 * @param operatingRegionLimits The three limits every value is held to.
	 * @returns Nothing.
	 */
	static printReasons(
		sweepName: string,
		sweepResults: SweepResult[],
		operatingRegionLimits: OperatingRegionLimits,
	): void {
		for (const sweepResult of sweepResults) {
			const verdict = OperatingRegion.judge(sweepResult.summary, operatingRegionLimits);
			if (verdict.isInsideOperatingRegion === true) {
				continue;
			}
			const missedConditions: string[] = [];
			if (verdict.isValidationCostLow === false) {
				missedConditions.push('the validation cost is too high');
			}
			if (verdict.isFraudUnprofitable === false) {
				missedConditions.push('fraud pays');
			}
			if (verdict.isFrictionLow === false) {
				missedConditions.push('honest workers meet too much friction');
			}
			console.log(`${sweepName} at ${sweepResult.pointName}: ${missedConditions.join(', and ')}`);
		}
	}

	/**
	 * Writes one line of a sweep table, so that the heading and the lines below it always line up.
	 *
	 * @param cells The eight cells of the line, from the value of the parameter to the verdict.
	 * @returns The written line.
	 */
	private static _formatRow(cells: string[]): string {
		const cellWidths = [36, 12, 12, 12, 15, 9, 10, 16];
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
	 * Writes a share as a percentage with two decimals.
	 *
	 * @param ratio The share, between 0 and 1.
	 * @returns The written percentage.
	 */
	private static _formatPercentage(ratio: number): string {
		return `${(ratio * 100).toFixed(2)}%`;
	}

	/**
	 * Writes whether one value of a parameter sits inside the region where the network is worth running.
	 *
	 * @param isInsideOperatingRegion True when the value met all three conditions.
	 * @returns The written verdict.
	 */
	private static _formatVerdict(isInsideOperatingRegion: boolean): string {
		if (isInsideOperatingRegion === true) {
			return 'yes';
		}
		return 'no';
	}
}
