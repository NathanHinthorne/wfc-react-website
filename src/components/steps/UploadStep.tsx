import { useEffect, useRef, useState } from 'react';
import { PixelFileUpload, PixelNumberInput, PixelButton, PixelCard } from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight } from '@pxlkit/ui';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface UploadStepProps {
  api: WfcEngineApi;
  onNext: () => void;
}

export function UploadStep({ api, onNext }: UploadStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [tileSize, setTileSize] = useState(22);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [displayWidth, setDisplayWidth] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const tileSizeInputRef = useRef<HTMLInputElement>(null);
  const previewImageRef = useRef<HTMLImageElement>(null);
  const resizeRef = useRef<{ pointerId: number; startX: number; startY: number; startTileSize: number } | null>(null);

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

  const sourceImage = previewSrc ?? api.inputImageSrc;

  useEffect(() => {
    const image = previewImageRef.current;
    if (!image) return;

    const resizeObserver = new ResizeObserver(() => {
      setDisplayWidth(image.getBoundingClientRect().width);
    });
    resizeObserver.observe(image);
    return () => resizeObserver.disconnect();
  }, [sourceImage]);

  const handleUpload = (next: File[]) => {
    setFiles(next);
    setPreviewSrc(next[0] ? URL.createObjectURL(next[0]) : null);
    setSourceSize({ width: 0, height: 0 });
    setPreviewReady(false);
  };

  const handleTileSizeChange = (value: number) => {
    setTileSize(value);
    setPreviewReady(false);
  };

  const handlePreview = async (requestedTileSize = tileSize) => {
    if (!files[0] || loading) return;
    const confirmedTileSize = Math.min(128, Math.max(1, requestedTileSize));
    setTileSize(confirmedTileSize);
    setLoading(true);
    try {
      await api.loadImage(files[0], confirmedTileSize);
      setPreviewReady(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!sourceSize.width || !displayWidth) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTileSize: tileSize,
    };
  };

  const handleResizeMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;

    const sourcePixelsPerDisplayPixel = sourceSize.width / displayWidth;
    const deltaX = event.clientX - resize.startX;
    const deltaY = event.clientY - resize.startY;
    const dragDistance = Math.abs(deltaX) >= Math.abs(deltaY) ? deltaX : deltaY;
    const nextTileSize = Math.round(resize.startTileSize + dragDistance * sourcePixelsPerDisplayPixel);
    handleTileSizeChange(Math.min(128, Math.max(1, nextTileSize)));
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const displayTileSize = sourceSize.width && displayWidth
    ? (tileSize / sourceSize.width) * displayWidth
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <PixelCard title="1. Upload sample terrain" description="A sprite sheet made of repeating square tiles.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide">Input image</h3>
                <p className="text-xs text-[var(--retro-muted)]">Drag the highlighted tile corner to resize the grid.</p>
              </div>
              <span className="font-mono text-xs text-[var(--retro-muted)]">{tileSize}px × {tileSize}px</span>
            </div>
            <div
              className="relative w-full touch-none overflow-hidden border-2 border-[var(--retro-border)] bg-[var(--retro-bg)]"
              aria-label="Input image with adjustable tile grid"
            >
              {sourceImage ? (
                <img
                  src={sourceImage}
                  alt="Uploaded terrain tileset"
                  className="pixelated block h-auto w-full"
                  onLoad={(event) => {
                    setSourceSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
                    setDisplayWidth(event.currentTarget.getBoundingClientRect().width);
                  }}
                />
              ) : (
                <div className="flex min-h-48 items-center justify-center px-4 text-center text-xs text-[var(--retro-muted)]">
                  Choose an image to preview its tile grid
                </div>
              )}
              {sourceImage && sourceSize.width > 0 && displayTileSize > 0 && (
                <>
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.55) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.55) 1px, transparent 1px)',
                      backgroundSize: `${displayTileSize}px ${displayTileSize}px`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute left-0 top-0 border-2 border-cyan-300 bg-cyan-300/10"
                    style={{ width: `${displayTileSize}px`, height: `${displayTileSize}px` }}
                  />
                  <button
                    type="button"
                    aria-label="Drag to resize tile grid"
                    title="Drag to resize tile grid"
                    className="absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none cursor-nwse-resize border-2 bg-cyan-200/80 border-cyan-500 bg-[var(--retro-panel)]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600"
                    style={{ left: `${displayTileSize}px`, top: `${displayTileSize}px` }}
                    onPointerDown={handleResizeStart}
                    onPointerMove={handleResizeMove}
                    onPointerUp={handleResizeEnd}
                    onPointerCancel={handleResizeEnd}
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <PixelFileUpload
              label="Tileset image"
              hint="PNG or JPG, made of uniform square tiles"
              value={files}
              onChange={handleUpload}
              accept="image/*"
            />
            <div className="flex flex-col items-start gap-3">
              <PixelNumberInput
                ref={tileSizeInputRef}
                label="Tile size (px)"
                value={tileSize}
                onChange={handleTileSizeChange}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const value = Number(tileSizeInputRef.current?.value);
                    if (Number.isFinite(value)) void handlePreview(value);
                  }
                }}
                min={1}
                max={128}
                clampBehavior="blur"
              />
              <PixelButton tone="cyan" disabled={!files[0] || loading} onClick={() => void handlePreview()}>
                Confirm
              </PixelButton>
            </div>
          </div>
        </div>
      </PixelCard>

      <div className="flex justify-end">
        <PixelButton
          tone="green"
          disabled={!previewReady || api.inputTiles.length === 0}
          iconRight={<PxlKitIcon icon={ArrowRight} size={16} />}
          onClick={onNext}
        >
          Next: Analyze
        </PixelButton>
      </div>
    </div>
  );
}
