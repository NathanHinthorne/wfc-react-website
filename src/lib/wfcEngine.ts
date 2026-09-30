import { Tile } from './tile';
import { Cell } from './cell';
import { Decision } from './decision';
import { randomChoice } from './random';
import {
  loadImageFromFile,
  sliceImageIntoTiles,
  canvasToDataURL,
  composeOutputImage,
  downloadDataURL,
  downloadJSON,
} from './imageUtils';
import type { TileBehavior } from './types';

export type StepResult =
  | { status: 'progress'; progress: number }
  | { status: 'backtrack'; totalBacktracks: number; retryCount: number }
  | { status: 'complete' };

export class WfcEngine {
  tilePixelSize = 22;

  inputGrid: Tile[][] = [];
  tileVariants: Tile[] = [];

  outputGrid: Cell[][] = [];
  outputWidth = 10;
  outputHeight = 10;

  // Backtracking state
  private gridStates: Cell[][][] = [];
  private decisions: Decision[] = [];
  backtrackAttempts = 0;
  totalBacktracks = 0;
  totalRetries = 0;

  imageIsAnalyzed = false;
  outputIsInitialized = false;
  outputIsComplete = false;

  async loadAndParseImage(file: File, tilePixelSize: number) {
    const img = await loadImageFromFile(file);
    this.tilePixelSize = tilePixelSize;
    this.parseImage(img);
    return img;
  }

  parseImage(img: HTMLImageElement) {
    const canvasGrid = sliceImageIntoTiles(img, this.tilePixelSize);
    this.inputGrid = canvasGrid.map((row) => row.map((canvas) => new Tile(canvas)));
    this.imageIsAnalyzed = false;
    this.outputIsInitialized = false;
  }

  /** Analyze tile variants + adjacency rules. Mirrors analyzeTiles() in wfc.js */
  analyze(): Tile[] {
    this.findTileVariants();
    this.findTileNeighbors();
    this.imageIsAnalyzed = true;
    return this.tileVariants;
  }

  private findTileVariants() {
    this.tileVariants = [];
    const scannedHashes = new Map<number, Tile>();

    const height = this.inputGrid.length;
    const width = this.inputGrid[0]?.length ?? 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.inputGrid[y][x];
        tile.hash = tile.createHash();

        const existing = scannedHashes.get(tile.hash);
        if (!existing) {
          scannedHashes.set(tile.hash, tile);
          tile.index = this.tileVariants.length;
          tile.totalFrequencyInGrid = 1;
          this.tileVariants.push(tile);
        } else {
          tile.index = existing.index;
          existing.totalFrequencyInGrid += 1;
        }
      }
    }
  }

  private findTileNeighbors() {
    const height = this.inputGrid.length;
    const width = this.inputGrid[0]?.length ?? 0;

    const mostCommonTile = this.tileVariants.reduce((a, b) =>
      b.totalFrequencyInGrid > a.totalFrequencyInGrid ? b : a
    );

    const airTiles = this.tileVariants.filter((t) => t.behavior === 'air');
    const edgeNeighbors = airTiles.length > 0 ? airTiles : [mostCommonTile];

    // Reset adjacency maps before rebuilding (needed because behaviors can be
    // re-applied after the first analyze pass, e.g. toggling a floor tile).
    for (const variant of this.tileVariants) {
      variant.up.clear();
      variant.right.clear();
      variant.down.clear();
      variant.left.clear();
    }

    const bump = (map: Map<number, number>, index: number) =>
      map.set(index, (map.get(index) ?? 0) + 1);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = this.inputGrid[y][x];
        const variant = this.tileVariants[tile.index!];

        if (y > 0) {
          bump(variant.up, this.inputGrid[y - 1][x].index!);
        } else {
          for (const edge of edgeNeighbors) variant.up.set(edge.index!, 1);
        }

        if (x < width - 1) {
          bump(variant.right, this.inputGrid[y][x + 1].index!);
        } else {
          for (const edge of edgeNeighbors) variant.right.set(edge.index!, 1);
        }

        if (y < height - 1) {
          bump(variant.down, this.inputGrid[y + 1][x].index!);
        } else {
          for (const edge of edgeNeighbors) variant.down.set(edge.index!, 1);
        }

        if (x > 0) {
          bump(variant.left, this.inputGrid[y][x - 1].index!);
        } else {
          for (const edge of edgeNeighbors) variant.left.set(edge.index!, 1);
        }
      }
    }
  }

  setBehavior(tileIndex: number, behavior: TileBehavior) {
    const tile = this.tileVariants[tileIndex];
    if (!tile) return;
    tile.behavior = behavior;
    // Re-run neighbor analysis since edge rules depend on behavior-tagged tiles.
    this.findTileNeighbors();
  }

  setTileName(tileIndex: number, name: string) {
    const tile = this.tileVariants[tileIndex];
    if (tile) tile.name = name || null;
  }

  resetBehaviors() {
    for (const tile of this.tileVariants) tile.behavior = null;
    this.findTileNeighbors();
  }

  /** Mirrors initializeOutputGrid() in wfc.js */
  initializeOutputGrid(width: number, height: number) {
    this.outputWidth = width;
    this.outputHeight = height;
    this.outputGrid = [];
    this.gridStates = [];
    this.decisions = [];
    this.totalBacktracks = 0;
    this.backtrackAttempts = 0;
    this.totalRetries = 0;
    this.outputIsComplete = false;

    const floorTiles = this.tileVariants.filter((t) => t.behavior === 'floor');
    const allIndices = this.tileVariants.map((t) => t.index!);

    for (let y = 0; y < height; y++) {
      this.outputGrid[y] = [];
      for (let x = 0; x < width; x++) {
        const cell = new Cell(allIndices, x, y);
        if (y < height - 1) {
          for (const floorTile of floorTiles) cell.exclude(floorTile.index!);
        }
        this.outputGrid[y][x] = cell;
      }
    }

    this.outputIsInitialized = true;
  }

  /** Mirrors restartOutputGrid() in wfc.js — used internally after many failed backtracks */
  private restartOutputGrid() {
    const allIndices = this.tileVariants.map((t) => t.index!);
    this.outputGrid = [];
    for (let y = 0; y < this.outputHeight; y++) {
      this.outputGrid[y] = [];
      for (let x = 0; x < this.outputWidth; x++) {
        this.outputGrid[y][x] = new Cell(allIndices, x, y);
      }
    }
    this.gridStates = [];
    this.decisions = [];
  }

  /**
   * One iteration of the algorithm: collapse the lowest-entropy cell,
   * propagate constraints to its neighbors, backtrack if it painted itself
   * into a corner. Mirrors populateOutputGrid() in wfc.js.
   */
  step(): StepResult {
    const width = this.outputWidth;
    const height = this.outputHeight;

    this.saveGridState();

    let uncollapsed = this.outputGrid.flat().filter((c) => !c.collapsed);
    const progress = 1 - uncollapsed.length / (width * height);

    if (uncollapsed.length === 0) {
      this.outputIsComplete = true;
      return { status: 'complete' };
    }

    uncollapsed = uncollapsed.sort((a, b) => a.calculateEntropy() - b.calculateEntropy());
    const lowestEntropy = uncollapsed[0].calculateEntropy();
    let stopIndex = uncollapsed.length;
    for (let i = 1; i < uncollapsed.length; i++) {
      if (uncollapsed[i].calculateEntropy() > lowestEntropy) {
        stopIndex = i;
        break;
      }
    }
    const tied = uncollapsed.slice(0, stopIndex);
    const cell = randomChoice(tied);

    if (cell.options.size === 0) {
      let restarted = false;
      if (this.backtrackAttempts < 5) {
        restarted = this.backtrack(1);
      } else if (this.backtrackAttempts < 10) {
        restarted = this.backtrack(2);
      } else if (this.backtrackAttempts < 20) {
        restarted = this.backtrack(5);
      } else {
        this.restartOutputGrid();
        restarted = true;
      }
      if (restarted) this.totalRetries++;
      this.backtrackAttempts++;
      return { status: 'backtrack', totalBacktracks: this.totalBacktracks, retryCount: this.totalRetries };
    }
    this.backtrackAttempts = 0;

    cell.collapse();
    const tile = this.tileVariants[cell.selectedTile!];
    this.decisions.push(new Decision(cell, tile.index!));

    this.propagate(cell, tile, width, height);

    return { status: 'progress', progress };
  }

  private propagate(cell: Cell, tile: Tile, width: number, height: number) {
    const intersect = (neighbor: Cell, directionMap: Map<number, number>) => {
      if (neighbor.collapsed) return;
      neighbor.options.forEach((freq, optionTile) => {
        if (!directionMap.has(optionTile)) {
          neighbor.options.delete(optionTile);
        } else {
          neighbor.options.set(optionTile, freq + directionMap.get(optionTile)!);
        }
      });
    };

    if (cell.y > 0) intersect(this.outputGrid[cell.y - 1][cell.x], tile.up);
    if (cell.x < width - 1) intersect(this.outputGrid[cell.y][cell.x + 1], tile.right);
    if (cell.y < height - 1) intersect(this.outputGrid[cell.y + 1][cell.x], tile.down);
    if (cell.x > 0) intersect(this.outputGrid[cell.y][cell.x - 1], tile.left);
  }

  private backtrack(steps: number): boolean {
    let restarted = false;
    const popped: Decision[] = [];
    for (let i = 0; i < steps && this.decisions.length; i++) {
      popped.push(this.decisions.pop()!);
      this.gridStates.pop();
    }

    const prevState = this.gridStates[this.gridStates.length - 1];
    if (prevState) {
      this.outputGrid = prevState.map((row) => row.map((cell) => cell.clone()));
    }

    for (const decision of popped) {
      const cell = this.outputGrid[decision.cell.y]?.[decision.cell.x];
      if (cell && !cell.collapsed) {
        cell.exclude(decision.tileIndex);
      } else if (cell?.collapsed) {
        this.restartOutputGrid();
        restarted = true;
        break;
      }
    }

    this.totalBacktracks++;
    return restarted;
  }

  private saveGridState() {
    // Cap history so long generations on large grids don't grow unbounded;
    // the original backtracks at most 5 steps deep before giving up and restarting.
    if (this.gridStates.length > 25) this.gridStates.shift();
    this.gridStates.push(this.outputGrid.map((row) => row.map((cell) => cell.clone())));
  }

  // ---------- Exports ----------

  getOutputTileImages(): (string | null)[][] {
    return this.outputGrid.map((row) =>
      row.map((cell) =>
        cell.collapsed && cell.selectedTile !== null
          ? this.tileVariants[cell.selectedTile].dataURL
          : null
      )
    );
  }

  async exportImage(filename = 'output.png') {
    const dataUrl = await composeOutputImage(this.getOutputTileImages(), this.tilePixelSize);
    downloadDataURL(dataUrl, filename);
  }

  exportTilemap(filename = 'tilemap.json') {
    const tilemap = this.outputGrid.map((row) =>
      row.map((cell) => {
        if (cell.selectedTile === null) return null;
        const tile = this.tileVariants[cell.selectedTile];
        return tile.name ?? tile.index?.toString() ?? null;
      })
    );
    downloadJSON(JSON.stringify({ tilemap }, null, 2), filename);
  }

  exportTileRules(filename = 'tile-variants.json') {
    const tileVariants = this.tileVariants.map((tile) => ({
      index: tile.index,
      name: tile.name,
      behavior: tile.behavior,
      up: Array.from(tile.up.entries()),
      right: Array.from(tile.right.entries()),
      down: Array.from(tile.down.entries()),
      left: Array.from(tile.left.entries()),
    }));
    downloadJSON(JSON.stringify({ tileVariants }, null, 2), filename);
  }

  getInputTileImages(): string[][] {
    return this.inputGrid.map((row) => row.map((tile) => canvasToDataURL(tile.canvas)));
  }
}
