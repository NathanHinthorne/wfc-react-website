export type TileBehavior = 'floor' | 'empty' | 'air' | null;

export type WizardStep = 'upload' | 'analyze' | 'configure' | 'generate';

export type StepStatus = 'idle' | 'generating' | 'paused' | 'complete';

/** A single generated frame the UI can render, decoupled from the engine's internals */
export interface OutputCellSnapshot {
  x: number;
  y: number;
  collapsed: boolean;
  /** data URL of the collapsed tile's image, or null while still uncollapsed */
  tileImage: string | null;
  /** how many options remain (a rough proxy for entropy), used for subtle in-progress styling */
  optionCount: number;
}
