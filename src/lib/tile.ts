import { hashCanvas, canvasToDataURL } from './imageUtils';
import type { TileBehavior } from './types';

/**
 * Tiles refer to the individual images that make up the grid.
 * They contain information about their possible neighboring tiles.
 *
 * Ported from the original tile.js (p5.js) to plain browser Canvas.
 */
export class Tile {
  /** The canvas holding this tile's pixel data */
  canvas: HTMLCanvasElement;

  /** Cached data URL for cheap rendering in the UI */
  dataURL: string;

  /** The index of the tile variant in the tileset (set once identified as a unique variant) */
  index: number | null = null;

  /** The hash of the tile's pixel data */
  hash: number | null = null;

  /** Optional field. Tile is treated in a special way depending on the behavior. */
  behavior: TileBehavior = null;

  /** Optional user-assigned display name */
  name: string | null = null;

  /** How many times this exact tile variant appears in the input grid */
  totalFrequencyInGrid = 0;

  // Rolls adjacency rules and frequency hints into one.
  // Key: Tile Index, Value: number of times this tile was found connected to the given tile index.
  up = new Map<number, number>();
  right = new Map<number, number>();
  down = new Map<number, number>();
  left = new Map<number, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.dataURL = canvasToDataURL(canvas);
  }

  createHash(): number {
    return hashCanvas(this.canvas);
  }
}
