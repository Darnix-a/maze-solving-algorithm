import seedrandom from 'seedrandom'

/**
 * Seeded random number generator wrapper for reproducible randomness
 */
export class SeededRNG {
  private rng: seedrandom.PRNG

  constructor(seed?: string) {
    this.rng = seedrandom(seed || Date.now().toString())
  }

  /**
   * Generate a random number between 0 (inclusive) and 1 (exclusive)
   */
  random(): number {
    return this.rng()
  }

  /**
   * Generate a random integer between min (inclusive) and max (exclusive)
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min
  }

  /**
   * Generate a random integer between 0 (inclusive) and max (exclusive)
   */
  randomIntMax(max: number): number {
    return Math.floor(this.random() * max)
  }

  /**
   * Generate a random float between min and max
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min
  }

  /**
   * Randomly shuffle an array in-place using Fisher-Yates algorithm
   */
  shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.randomIntMax(i + 1)
      ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array
  }

  /**
   * Pick a random element from an array
   */
  choice<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error('Cannot choose from empty array')
    }
    return array[this.randomIntMax(array.length)]
  }

  /**
   * Generate a random boolean with given probability (0-1) of being true
   */
  randomBool(probability: number = 0.5): boolean {
    return this.random() < probability
  }

  /**
   * Generate a random number from a normal distribution (Box-Muller transform)
   */
  randomNormal(mean: number = 0, stdDev: number = 1): number {
    // Use Box-Muller transform
    let u = 0, v = 0
    while (u === 0) u = this.random() // Converting [0,1) to (0,1)
    while (v === 0) v = this.random()
    
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
    return z * stdDev + mean
  }
}

/**
 * Global seeded RNG instance for use throughout the application
 */
let globalRNG = new SeededRNG()

/**
 * Set the global seed for reproducible randomness
 */
export function setSeed(seed: string): void {
  globalRNG = new SeededRNG(seed)
}

/**
 * Get the global RNG instance
 */
export function getRNG(): SeededRNG {
  return globalRNG
}

/**
 * Create a new RNG instance with a specific seed
 */
export function createRNG(seed?: string): SeededRNG {
  return new SeededRNG(seed)
}