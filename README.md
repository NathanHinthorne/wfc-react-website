# WFC Terrain Generator

A React + Tailwind + Pxlkit rebuild of your p5.js Wave Function Collapse demo,
as a 4-step wizard (Upload → Analyze → Configure → Generate).

## ⚠️ Before you run it

This project was written in a sandboxed environment with **no network access**,
so I could not run `npm install` or `npm run dev` to compile-check it. I built
it carefully against Pxlkit's documented API (https://pxlkit.xyz/ui-kit and
https://pxlkit.xyz/icons), but two things are worth double-checking on your
first run:

1. **Icon export names.** I inferred PascalCase names from the kebab-case
   icon IDs on the icons page (`play` → `Play`, `arrow-right` → `ArrowRight`,
   etc.). If any import fails, open `https://pxlkit.xyz/icons`, find the icon,
   and adjust the import — the icons are cosmetic and every button still works
   with just its text label if you remove one.
2. **Package versions** in `package.json` are best-guess pins. Run
   `npm install @pxlkit/ui-kit@latest @pxlkit/core@latest @pxlkit/ui@latest motion@latest`
   if the pinned versions don't resolve.

## Setup

```bash
npm install
npm run dev
```

Then open the printed local URL.

## What got ported vs. redesigned

**Ported 1:1 (algorithm logic, unchanged):**
- `src/lib/cell.ts` ← `cell.js` — entropy calculation, weighted collapse, exclude
- `src/lib/decision.ts` ← `decision.js`
- `src/lib/wfcEngine.ts` ← `wfc.js` — tile-variant discovery, adjacency-rule
  learning, lowest-entropy cell selection, constraint propagation, and the
  same backtracking schedule (1 step after 5 fails, 2 after 10, 5 after 20,
  full restart after that)

**Adapted (same behavior, different runtime):**
- `src/lib/tile.ts` ← `tile.js` — swaps p5's `Image`/`loadPixels()` for a
  plain `<canvas>` + `getImageData()`, same rolling hash function
- `src/lib/imageUtils.ts` — slicing the uploaded sheet into tiles, composing
  the final PNG, and downloading JSON, all done with native Canvas/Blob APIs
  instead of p5

**Redesigned (per your answers):**
- Retro pixel-art visual style via Pxlkit's `surface="pixel"` mode
- A 4-step wizard (`PixelStepper`) instead of one dense always-visible canvas
- Both the input tileset preview and the output grid render as animated DOM
  grids (`src/components/GridView.tsx` + `TileThumb.tsx`), with each cell
  popping in via `motion` the moment it collapses, instead of an immediate
  canvas redraw
- Generation is driven by `requestAnimationFrame` in `useWfcEngine.ts`
  (`src/hooks/useWfcEngine.ts`) at a configurable steps/second, rather than
  p5's fixed `draw()` loop, so Play/Pause/speed are real controls

**Slightly generalized:** the original had a `// TODO change this when dims
are not equal` note and only supported square output grids. The port takes
independent width/height everywhere.

**Not carried over (functionally unused in the original UI):** the `"air"`
tile behavior existed in `wfc.js` for edge constraints, but the original
`view.js` never exposed a way to set it (only "floor" and "empty" buttons
existed) — the engine still supports it for completeness, but no UI sets it.
Sound effects, the on-canvas "How to Use" card, and the raw log downloader
were also left out as out of scope for the redesign.

## Project structure

```
src/
  lib/            – WFC engine, fully framework-agnostic (no React/Pxlkit deps)
  hooks/
    useWfcEngine.ts – bridges the engine into React state + the RAF game loop
  components/
    TileThumb.tsx       – single animated tile cell
    GridView.tsx        – renders a 2D tile array as a grid
    TileVariantGallery.tsx – selectable tile-variant list for step 2
    steps/              – one component per wizard step
  App.tsx           – wizard shell (PixelStepper + step switching)
```

## Known follow-ups worth doing next

- Wire up `PixelToast` (`useToast()`) for "download started" / "analysis
  complete" feedback instead of the plain `PixelAlert` currently used
- Add a "sample tileset" option on the Upload step so people can try the
  wizard without sourcing their own sprite sheet first
- Persist `tileVariants` behavior/name edits if you re-upload the same image
  (currently a fresh upload resets everything, matching the original)
