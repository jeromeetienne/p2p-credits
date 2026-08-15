import { SimulationEngine } from '../../src/index.js';
import { ReportPrinter, type NamedReport } from './report_printer.js';
import {
	exactComparisonParameters,
	firstSimulationParameters,
	settlementComparisonParameters,
} from './simulation_parameters.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	Main — runs the first scenario over the credit accounting library
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

const simulationEngine = new SimulationEngine(firstSimulationParameters);
const simulationReport = simulationEngine.run();

ReportPrinter.print(simulationReport);

const exactComparisonEngine = new SimulationEngine(exactComparisonParameters);
const exactComparisonReport = exactComparisonEngine.run();

ReportPrinter.printValidity(exactComparisonReport, 'validity, comparing character for character');

const settlementReports: NamedReport[] = settlementComparisonParameters.map((simulationParameters) => {
	const settlementEngine = new SimulationEngine(simulationParameters);
	return {
		runName: simulationParameters.settlementPolicyName,
		simulationReport: settlementEngine.run(),
	};
});

ReportPrinter.printSideBySide('timing of payment', 'settlement policy', settlementReports);
