/**
 * Standalone replacements for the p5.js `random()` calls the original
 * implementation relied on.
 */

/** Random float in [min, max) */
export function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Random element from an array */
export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
