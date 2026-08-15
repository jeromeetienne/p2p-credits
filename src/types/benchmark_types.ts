import { z as Zod } from 'zod';

import { TaskTypeNameSchema } from './task_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	BenchmarkTypes — the environment a price is measured in, and one measurement
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/** Schema of the environment a benchmark is measured in. */
export const BenchmarkEnvironmentSchema = Zod.object({
	/** Name of the model the measurement was made with. */
	modelName: Zod.string().min(1),
	/** Name of the runtime the measurement was made with, including the kernels it uses. */
	runtimeName: Zod.string().min(1),
	/** Name of the precision format the measurement was made with, for example "float16". */
	precisionFormatName: Zod.string().min(1),
	/** Name of the family of hardware the measurement was made on. */
	hardwareFamilyName: Zod.string().min(1),
});

/**
 * The environment a benchmark is measured in.
 *
 * A price measured in one environment says nothing about another environment, so the environment travels with the
 * measurement and is compared before a price is used.
 */
export type BenchmarkEnvironment = Zod.infer<typeof BenchmarkEnvironmentSchema>;

/** Schema of one measured execution of one task type on one reference machine. */
export const BenchmarkRunSchema = Zod.object({
	/** Name of the measured task type. */
	taskTypeName: TaskTypeNameSchema,
	/** Name of the reference machine the run was measured on. */
	referenceMachineName: Zod.string().min(1),
	/** Duration of the run, in seconds. */
	durationSeconds: Zod.number().positive(),
});

/**
 * One measured execution of one task type on one reference machine.
 *
 * One run alone is never enough, because a single measurement carries noise. Several runs of the same task type are
 * recorded, and the benchmark keeps the value in the middle of them.
 */
export type BenchmarkRun = Zod.infer<typeof BenchmarkRunSchema>;
