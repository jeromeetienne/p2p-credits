import { SimulationEngine } from '../../src/index.js';
import { ReportPrinter } from './report_printer.js';
import { exactComparisonParameters, firstSimulationParameters } from './simulation_parameters.js';

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
