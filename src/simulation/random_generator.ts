import type { RandomNumberFn } from '../types/random_types.js';

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
//	RandomGenerator — a seeded source of randomness, so a run can be reproduced
///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

/**
 * A seeded generator of random numbers.
 *
 * A simulation must be reproducible: the same seed must always produce the same run, otherwise a measured difference
 * between two sets of parameters cannot be told apart from the noise of the randomness. The generator therefore never
 * reads the global random number generator of the runtime.
 */
export class RandomGenerator {
	/** The current internal state, advanced at every draw. */
	private _state: number;

	/**
	 * @param seed The seed of the run. The same seed always produces the same sequence of numbers.
	 */
	constructor(seed: number) {
		this._state = seed >>> 0;
	}

	/**
	 * Draws the next number.
	 *
	 * @returns A number greater than or equal to 0 and lower than 1.
	 */
	nextNumber(): number {
		this._state = (this._state + 0x6d2b79f5) >>> 0;
		let mixed = this._state;
		mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
		mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
		return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
	}

	/**
	 * Returns the draw as a plain function, which is the shape every policy of the library expects.
	 *
	 * @returns A function that draws the next number of this generator.
	 */
	asRandomNumberFn(): RandomNumberFn {
		return () => {
			return this.nextNumber();
		};
	}

	/**
	 * Picks one item of a list at random.
	 *
	 * @param items The list to pick from.
	 * @returns The picked item.
	 * @throws When the list is empty.
	 */
	pick<ItemType>(items: ItemType[]): ItemType {
		if (items.length === 0) {
			throw new Error('cannot pick an item in an empty list');
		}
		const itemIndex = Math.floor(this.nextNumber() * items.length);
		const item = items[itemIndex];
		if (item === undefined) {
			throw new Error(`the index ${itemIndex} is outside the list of ${items.length} items`);
		}
		return item;
	}
}
