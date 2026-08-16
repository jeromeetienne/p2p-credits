import { ParameterSweep } from '../../src/index.js';
import { attackerShareSweep, operatingRegionLimits, seedCount, sweepDefinitions } from './sweep_definitions.js';
import { SweepPrinter } from './sweep_printer.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Main — runs the five sweeps of section 10 and judges the central hypothesis
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

console.log('');
console.log(`=== parameter sweeps, ${seedCount} seeds per value ===`);
console.log('');

const sweepResultsByName = sweepDefinitions.map((sweepDefinition) => {
	return {
		sweepName: sweepDefinition.sweepName,
		sweepResults: ParameterSweep.run(sweepDefinition.sweepPoints, seedCount),
	};
});

for (const sweep of sweepResultsByName) {
	SweepPrinter.print(sweep.sweepName, sweep.sweepResults, operatingRegionLimits);
}

const attackerShareResults = ParameterSweep.run(attackerShareSweep.sweepPoints, seedCount);
SweepPrinter.print(attackerShareSweep.sweepName, attackerShareResults, operatingRegionLimits);

console.log('--- why a value fell outside the region ---');
for (const sweep of sweepResultsByName) {
	SweepPrinter.printReasons(sweep.sweepName, sweep.sweepResults, operatingRegionLimits);
}
SweepPrinter.printReasons(attackerShareSweep.sweepName, attackerShareResults, operatingRegionLimits);
console.log('');
