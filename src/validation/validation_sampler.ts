import type { RandomNumberFn } from '../types/random_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	ValidationSampler — decides which tasks are duplicated to be validated
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** The values that decide how often a task is duplicated. */
export type ValidationSamplerOptions = {
	/** Share of the tasks that are duplicated, between 0 and 1. A value of 0.05 duplicates one task out of twenty. */
	validationRate: number;
	/** The source of randomness, so a simulation can reproduce a run exactly. */
	randomNumberFn: RandomNumberFn;
};

/**
 * The choice of the tasks that are duplicated for validation.
 *
 * Validating every result would remove most of the economic advantage of the network, so only a share of the tasks is
 * duplicated. This first version uses one fixed rate for every worker. The rate will later depend on the trust of the
 * worker and on its recent errors, which is the adaptive validation of section 4 of the design note.
 */
export class ValidationSampler {
	/** Share of the tasks that are duplicated, between 0 and 1. */
	private _validationRate: number;

	/** The source of randomness. */
	private _randomNumberFn: RandomNumberFn;

	/**
	 * @param validationSamplerOptions The validation rate and the source of randomness.
	 */
	constructor(validationSamplerOptions: ValidationSamplerOptions) {
		this._validationRate = validationSamplerOptions.validationRate;
		this._randomNumberFn = validationSamplerOptions.randomNumberFn;
	}

	/**
	 * Decides whether the next task must be duplicated and validated.
	 *
	 * @returns True when the task must be duplicated.
	 */
	mustValidate(): boolean {
		return this._randomNumberFn() < this._validationRate;
	}

	/**
	 * Returns the share of the tasks that are duplicated.
	 *
	 * @returns The validation rate, between 0 and 1.
	 */
	validationRate(): number {
		return this._validationRate;
	}
}
