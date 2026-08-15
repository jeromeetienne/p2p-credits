import type { RandomNumberFn } from '../types/random_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ValidationSampler — decides which tasks are duplicated, from the trust of the worker
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values that decide how often a task is duplicated. */
export type ValidationSamplerOptions = {
	/** Share of the tasks duplicated for a worker at or below the untrusted threshold, between 0 and 1. */
	untrustedValidationRate: number;
	/** Share of the tasks duplicated for a worker at or above the trusted threshold, between 0 and 1. */
	trustedValidationRate: number;
	/** Share of the tasks duplicated for a worker that returned an invalid result recently, between 0 and 1. */
	recentErrorValidationRate: number;
	/** Trust score at or below which a worker is treated as new. */
	untrustedThreshold: number;
	/** Trust score at or above which a worker is treated as trusted. */
	trustedThreshold: number;
	/** The source of randomness, so a simulation can reproduce a run exactly. */
	randomNumberFn: RandomNumberFn;
};

/**
 * The choice of the tasks that are duplicated for validation.
 *
 * Validating every result would remove most of the economic advantage of the network, so only a share of the tasks is
 * duplicated, and that share depends on the worker. A new worker is verified often, a worker that has been confirmed
 * many times is verified rarely, and a worker that was caught recently is verified more than anyone else. The
 * objective is to make fraud expensive without doubling the cost of the network.
 */
export class ValidationSampler {
	/** The values that decide how often a task is duplicated. */
	private _options: ValidationSamplerOptions;

	/**
	 * @param validationSamplerOptions The rates, the two thresholds, and the source of randomness.
	 */
	constructor(validationSamplerOptions: ValidationSamplerOptions) {
		this._options = validationSamplerOptions;
	}

	/**
	 * Returns the share of the tasks duplicated for one worker.
	 *
	 * Between the two thresholds the rate falls in a straight line, so a worker sees its verification become rarer
	 * with every result it gets confirmed, rather than at one single moment.
	 *
	 * @param trustScore The combined trust of the worker.
	 * @param hasRecentError True when the worker returned an invalid result recently.
	 * @returns The validation rate for that worker, between 0 and 1.
	 */
	validationRateFor(trustScore: number, hasRecentError: boolean): number {
		if (hasRecentError === true) {
			return this._options.recentErrorValidationRate;
		}
		if (trustScore <= this._options.untrustedThreshold) {
			return this._options.untrustedValidationRate;
		}
		if (trustScore >= this._options.trustedThreshold) {
			return this._options.trustedValidationRate;
		}
		const trustSpan = this._options.trustedThreshold - this._options.untrustedThreshold;
		const climbedShare = (trustScore - this._options.untrustedThreshold) / trustSpan;
		const rateSpan = this._options.trustedValidationRate - this._options.untrustedValidationRate;
		return this._options.untrustedValidationRate + climbedShare * rateSpan;
	}

	/**
	 * Decides whether the task of one worker must be duplicated and validated.
	 *
	 * @param trustScore The combined trust of the worker.
	 * @param hasRecentError True when the worker returned an invalid result recently.
	 * @returns True when the task must be duplicated.
	 */
	mustValidate(trustScore: number, hasRecentError: boolean): boolean {
		return this._options.randomNumberFn() < this.validationRateFor(trustScore, hasRecentError);
	}
}
