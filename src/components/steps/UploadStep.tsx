import { useEffect, useRef, useState } from 'react';
import { PixelFileUpload, PixelNumberInput, PixelButton, PixelCard } from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight } from '@pxlkit/ui';
import { CanvasGridView } from '../CanvasGridView';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface UploadStepProps {
  api: WfcEngineApi;
  onNext: () => void;
}

export function UploadStep({ api, onNext }: UploadStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [tileSize, setTileSize] = useState(16);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [previewReady, setPreviewReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const tileSizeInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ pointerId: number; startX: number; startY: number; startTileSize: number } | null>(null);

  const previewFrameSize = 192;

  useEffect(() => {
    return () => {
      if (previewSrc) URL.revokeObjectURL(previewSrc);
    };
  }, [previewSrc]);

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
    if (!sourceSize.width || !sourceSize.height) return;
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

    const sourcePixelsPerDisplayPixel = sourceSize.width / previewFrameSize;
    const dragDistance = Math.max(event.clientX - resize.startX, event.clientY - resize.startY);
    const nextTileSize = Math.round(resize.startTileSize + dragDistance * sourcePixelsPerDisplayPixel);
    handleTileSizeChange(Math.min(128, Math.max(4, nextTileSize)));
  };

  const handleResizeEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId === event.pointerId) resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const sourceImage = previewSrc ?? api.inputImageSrc;
  const previewTileSize = Math.min(96, Math.max(24, (tileSize / 16) * 38));
  const previewImageWidth = sourceSize.width && tileSize
    ? (sourceSize.width / tileSize) * previewTileSize
    : previewFrameSize;

  return (
    <div className="flex flex-col gap-6">
      <PixelCard title="1. Upload sample terrain" description="A sprite sheet made of repeating square tiles.">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide">Tile size preview</h3>
                <p className="text-xs text-[var(--retro-muted)]">Top-left tile from your input image</p>
              </div>
              <span className="font-mono text-xs text-[var(--retro-muted)]">{tileSize}px × {tileSize}px</span>
            </div>
            <div
              className="relative h-48 w-48 touch-none overflow-hidden border-2 border-[var(--retro-border)] bg-[var(--retro-bg)]"
              aria-label="Top-left tile size preview"
            >
              {sourceImage ? (
                <img
                  src={sourceImage}
                  alt="Top-left tile preview"
                  className="pixelated absolute left-0 top-0 max-w-none"
                  style={{ width: `${previewImageWidth}px`, height: 'auto' }}
                  onLoad={(event) => {
                    setSourceSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight });
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--retro-muted)]">
                  Choose an image to preview its first tile
                </div>
              )}
              {sourceImage && sourceSize.width > 0 && (
                <>
                  <div
                    className="pointer-events-none absolute left-0 top-0 border-2 border-cyan-300 bg-cyan-300/10"
                    style={{ width: `${previewTileSize}px`, height: `${previewTileSize}px` }}
                  />
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.45) 1px, transparent 1px)`,
                      backgroundSize: `${previewTileSize}px ${previewTileSize}px`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/25" />
                </>
              )}
              <button
                type="button"
                aria-label="Resize tile preview"
                className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize border-l-2 border-t-2 border-[var(--retro-border)] bg-[var(--retro-panel)]"
                onPointerDown={handleResizeStart}
                onPointerMove={handleResizeMove}
                onPointerUp={handleResizeEnd}
                onPointerCancel={handleResizeEnd}
              />
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

      <PixelCard title="Preview" description="How your sheet gets sliced into tiles.">
        {loading ? (
          <p className="text-xs text-[var(--retro-muted)]">Slicing tileset…</p>
        ) : (
          <CanvasGridView tiles={previewReady && api.inputTiles.length ? api.inputTiles : []} fadeInMs={0} />
        )}
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
