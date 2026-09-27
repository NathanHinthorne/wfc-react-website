import { randomRange } from './random';

/**
 * Cells are placed in the output grid and contain the possible tiles that
 * can be placed in that cell.
 *
 * Ported from the original cell.js (p5.js) — logic unchanged, only the
 * random() call is now a local helper instead of a p5 global.
 */
export class Cell {
  /** The maximum entropy this cell could have over the course of the algorithm */
  maxEntropy: number;

  /** This cell's x position in the output grid */
  x: number;

  /** This cell's y position in the output grid */
  y: number;

  /** Whether or not the cell has collapsed into a tile */
  collapsed = false;

  /** The tile index that this cell has collapsed into */
  selectedTile: number | null = null;

  /** Key: tile index, Value: cumulative frequency of that tile appearing next to a placed neighbor */
  options: Map<number, number>;

  constructor(tileIndices: number[], x: number, y: number) {
    this.maxEntropy = tileIndices.length;
    this.x = x;
    this.y = y;
    this.options = new Map();
    for (const tileIndex of tileIndices) {
      this.options.set(tileIndex, 0);
    }
  }

  calculateEntropy(): number {
    if (this.collapsed) return 0;
    // Rough entropy estimate: number of remaining options (not frequency-weighted,
    // matching the "Approach #1" the original code shipped with).
    return this.options.size;
  }

  collapse(): void {
    if (this.collapsed) {
      throw new Error('Cell has already been collapsed');
    }
    if (this.options.size === 0) {
      throw new Error('Tried to collapse, but no tile options were available');
    }

    let totalFrequency = 0;
    const frequencyDistribution = new Map<number, number>();
    for (const [tileIndex, frequency] of this.options) {
      totalFrequency += frequency;
      frequencyDistribution.set(tileIndex, totalFrequency);
    }

    const randomFrequency = Math.floor(randomRange(0, totalFrequency));

    let pick: number | null = null;
    for (const [tileIndex, cumulativeFrequency] of frequencyDistribution) {
      if (cumulativeFrequency >= randomFrequency) {
        pick = tileIndex;
        break;
      }
    }
    // Fallback: if every frequency was 0 (totalFrequency === 0), the loop above
    // never satisfies >= randomFrequency other than by coincidence; grab the
    // first option so the algorithm never stalls on a legitimately empty weight set.
    if (pick === null) {
      pick = this.options.keys().next().value ?? null;
    }

    this.selectedTile = pick;
    this.options.clear();
    this.collapsed = true;
  }

  exclude(tileIndex: number): void {
    if (this.collapsed) {
      throw new Error('Cell has already been collapsed');
    }
    this.options.delete(tileIndex);
  }

  clone(): Cell {
    const copy = new Cell([], this.x, this.y);
    copy.maxEntropy = this.maxEntropy;
    copy.collapsed = this.collapsed;
    copy.selectedTile = this.selectedTile;
    copy.options = new Map(this.options);
    return copy;
  }
}
