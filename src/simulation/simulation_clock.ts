///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	SimulationClock — the virtual time of a run, counted in ticks
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * The virtual clock of a simulation.
 *
 * No inference is executed during a run, so no real duration is ever measured. Time is counted in ticks, and one tick
 * holds the tasks submitted during one round of the network.
 */
export class SimulationClock {
	/** The tick the run is currently on. The first tick is 0. */
	private _currentTick = 0;

	/**
	 * Returns the tick the run is currently on.
	 *
	 * @returns The current tick.
	 */
	currentTick(): number {
		return this._currentTick;
	}

	/**
	 * Moves the run to the next tick.
	 *
	 * @returns The new current tick.
	 */
	advance(): number {
		this._currentTick += 1;
		return this._currentTick;
	}
}
