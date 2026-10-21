import { hashCanvas, canvasToDataURL } from './imageUtils';
import type { TileBehavior } from './types';

// boundary markers are virtual, pre-collapsed neighbors
// they’re recorded in adjacency rules, but never added to the cell’s placeable tile options.
export const BOUNDARY_NEIGHBORS = {
  top: '__top_boundary__',
  right: '__right_boundary__',
  bottom: '__bottom_boundary__',
  left: '__left_boundary__',
} as const;

export type TileNeighbor = number | (typeof BOUNDARY_NEIGHBORS)[keyof typeof BOUNDARY_NEIGHBORS];

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

  // Adjacency counts use tile indexes for real neighbors and boundary markers for the input edge.
  up = new Map<TileNeighbor, number>();
  right = new Map<TileNeighbor, number>();
  down = new Map<TileNeighbor, number>();
  left = new Map<TileNeighbor, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.dataURL = canvasToDataURL(canvas);
  }

  createHash(): number {
    return hashCanvas(this.canvas);
  }
}
