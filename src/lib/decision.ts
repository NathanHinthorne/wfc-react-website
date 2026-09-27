import type { Cell } from './cell';

/**
 * Represents a decision to collapse a cell into a particular tile.
 * Direct port of decision.js.
 */
export class Decision {
  cell: Cell;
  tileIndex: number;

  constructor(cell: Cell, tileIndex: number) {
    this.cell = cell;
    this.tileIndex = tileIndex;
  }
}
