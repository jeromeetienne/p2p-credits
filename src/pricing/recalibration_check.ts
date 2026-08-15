import type { BenchmarkEnvironment } from '../types/benchmark_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	RecalibrationCheck — says when a measured price stopped describing the network
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** One part of the environment that changed since the benchmark was measured. */
export type EnvironmentDifference = {
	/** The part of the environment that changed. */
	partName: 'model' | 'runtime' | 'precision format' | 'hardware family';
	/** The value the benchmark was measured with. */
	measuredValue: string;
	/** The value the network runs with now. */
	currentValue: string;
};

/**
 * The comparison between the environment a benchmark was measured in and the environment the network runs in.
 *
 * A price is a ratio between two measured durations, and that ratio only holds inside the environment the durations
 * were measured in. When the model, the runtime, the precision format, or the family of hardware changes, the ratio
 * describes a network that no longer exists and the benchmark has to be measured again.
 */
export class RecalibrationCheck {
	/**
	 * Lists the parts of the environment that changed since the benchmark was measured.
	 *
	 * @param measuredEnvironment The environment the benchmark was measured in.
	 * @param currentEnvironment The environment the network runs in now.
	 * @returns One entry per part that changed, and an empty list when nothing changed.
	 */
	static differencesBetween(
		measuredEnvironment: BenchmarkEnvironment,
		currentEnvironment: BenchmarkEnvironment,
	): EnvironmentDifference[] {
		const environmentDifferences: EnvironmentDifference[] = [];

		if (measuredEnvironment.modelName !== currentEnvironment.modelName) {
			environmentDifferences.push({
				partName: 'model',
				measuredValue: measuredEnvironment.modelName,
				currentValue: currentEnvironment.modelName,
			});
		}
		if (measuredEnvironment.runtimeName !== currentEnvironment.runtimeName) {
			environmentDifferences.push({
				partName: 'runtime',
				measuredValue: measuredEnvironment.runtimeName,
				currentValue: currentEnvironment.runtimeName,
			});
		}
		if (measuredEnvironment.precisionFormatName !== currentEnvironment.precisionFormatName) {
			environmentDifferences.push({
				partName: 'precision format',
				measuredValue: measuredEnvironment.precisionFormatName,
				currentValue: currentEnvironment.precisionFormatName,
			});
		}
		if (measuredEnvironment.hardwareFamilyName !== currentEnvironment.hardwareFamilyName) {
			environmentDifferences.push({
				partName: 'hardware family',
				measuredValue: measuredEnvironment.hardwareFamilyName,
				currentValue: currentEnvironment.hardwareFamilyName,
			});
		}

		return environmentDifferences;
	}

	/**
	 * Says whether the benchmark has to be measured again before its prices are used.
	 *
	 * @param measuredEnvironment The environment the benchmark was measured in.
	 * @param currentEnvironment The environment the network runs in now.
	 * @returns True when at least one part of the environment changed.
	 */
	static isRecalibrationNeeded(
		measuredEnvironment: BenchmarkEnvironment,
		currentEnvironment: BenchmarkEnvironment,
	): boolean {
		return RecalibrationCheck.differencesBetween(measuredEnvironment, currentEnvironment).length > 0;
	}

	/**
	 * Writes the differences as one sentence, to be shown when a price is refused.
	 *
	 * @param environmentDifferences The parts of the environment that changed.
	 * @returns One sentence naming every part that changed.
	 */
	static describeDifferences(environmentDifferences: EnvironmentDifference[]): string {
		const writtenDifferences = environmentDifferences.map((environmentDifference) => {
			return `the ${environmentDifference.partName} went from "${environmentDifference.measuredValue}" `
				+ `to "${environmentDifference.currentValue}"`;
		});
		return writtenDifferences.join(', and ');
	}
}
