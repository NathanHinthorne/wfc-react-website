import { useEffect, useRef } from 'react';

interface CanvasGridViewProps {
  tiles: (string | null)[][];
  optionCounts?: number[][];
  maxDisplayWidth?: number;
  /** Fade newly-appeared tiles in over this many ms. Set to 0 to disable animation entirely. */
  fadeInMs?: number;
}

/**
 * Renders a 2D array of tile data URLs onto a single canvas instead of one
 * DOM node per cell. A 60x60 output grid is 3,600 <img>/motion nodes the
 * DOM-based version had to mount, diff, and animate individually — this
 * does the equivalent work as draw calls on one element, which scales to
 * much larger grids without the browser breaking a sweat.
 *
 * Newly-collapsed cells still get a brief fade-in, but it's done by
 * tracking per-cell "time first appeared" and blending alpha in the same
 * draw loop, rather than mounting/animating separate elements.
 */
export function CanvasGridView({ tiles, optionCounts, maxDisplayWidth = 480, fadeInMs = 150 }: CanvasGridViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const appearedAtRef = useRef<Map<string, number>>(new Map());
  const prevSrcRef = useRef<Map<string, string>>(new Map());
  const rafRef = useRef<number | null>(null);

  const rows = tiles.length;
  const cols = tiles[0]?.length ?? 0;
  const cellSize = Math.max(2, Math.min(32, Math.floor(maxDisplayWidth / Math.max(cols, 1))));
  const showOptionCounts = cellSize >= 18;
  const maxOptionCount = optionCounts ? Math.max(1, ...optionCounts.flat()) : 1;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || rows === 0 || cols === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const width = cols * cellSize;
    const height = rows * cellSize;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    const getImage = (src: string): HTMLImageElement | null => {
      const cache = imageCacheRef.current;
      let img = cache.get(src);
      if (!img) {
        img = new Image();
        img.src = src;
        cache.set(src, img);
      }
      return img.complete ? img : null;
    };

    const now0 = performance.now();
    // Record "first seen" time for any cell whose src changed since last render.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const key = `${x},${y}`;
        const src = tiles[y][x];
        const prevSrc = prevSrcRef.current.get(key);
        if (src && src !== prevSrc) {
          appearedAtRef.current.set(key, now0);
        }
        if (src) prevSrcRef.current.set(key, src);
        else prevSrcRef.current.delete(key);
      }
    }

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      // Empty background grid so uncollapsed cells still read as a grid.
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;

      let stillAnimating = false;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const src = tiles[y][x];
          const optionCount = optionCounts?.[y]?.[x];
          const px = x * cellSize;
          const py = y * cellSize;

          if (optionCount !== undefined && !src) {
            const intensity = maxOptionCount > 1 ? 1 - Math.max(0, optionCount - 1) / (maxOptionCount - 1) : 1;
            ctx.fillStyle = `rgba(${255 - intensity * 105}, ${255 - intensity * 25}, ${255 - intensity * 105}, 0.95)`;
            ctx.fillRect(px, py, cellSize, cellSize);
          }

          if (!src) {
            ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
          } else {
            const img = getImage(src);
            if (!img) {
              stillAnimating = true; // image still loading, try again next frame
            } else {
              let alpha = 1;
              if (fadeInMs > 0) {
                const key = `${x},${y}`;
                const appearedAt = appearedAtRef.current.get(key);
                if (appearedAt !== undefined) {
                  const age = time - appearedAt;
                  if (age < fadeInMs) {
                    alpha = Math.min(1, age / fadeInMs);
                    stillAnimating = true;
                  }
                }
              }

              ctx.globalAlpha = alpha;
              ctx.drawImage(img, px, py, cellSize, cellSize);
              ctx.globalAlpha = 1;
            }
          }

          if (showOptionCounts && optionCount !== undefined && !src) {
            ctx.fillStyle = optionCount === 1 ? '#16351f' : '#17331d';
            ctx.font = `bold ${Math.max(9, Math.floor(cellSize * 0.45))}px monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.strokeStyle = 'rgba(255,255,255,0.8)';
            ctx.lineWidth = 2;
            ctx.strokeText(String(optionCount), px + cellSize / 2, py + cellSize / 2);
            ctx.fillText(String(optionCount), px + cellSize / 2, py + cellSize / 2);
          }
          ctx.strokeStyle = 'rgba(255,255,255,0.28)';
          ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
        }
      }

      if (stillAnimating) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        rafRef.current = null;
      }
    };

    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, optionCounts, maxOptionCount, rows, cols, cellSize, fadeInMs]);

  if (rows === 0 || cols === 0) {
    return (
      <div className="flex h-40 items-center justify-center border-2 border-dashed border-[var(--retro-border)] text-xs text-[var(--retro-muted)]">
        Nothing to show yet
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="pixelated border-2 border-[var(--retro-border)]"
      style={{ background: 'var(--retro-bg)' }}
    />
  );
}
