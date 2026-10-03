import { useEffect, useRef, useState } from 'react';
import { PixelFileUpload, PixelNumberInput, PixelButton, PixelCard } from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight } from '@pxlkit/ui';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface UploadStepProps {
  api: WfcEngineApi;
  onNext: () => void;
}

const sampleImages = [
  { name: 'Cave', fileName: 'cave.png', src: '/sample-images/cave.png' },
  { name: 'Flower', fileName: 'flower.png', src: '/sample-images/flower.png' },
  { name: 'Grass 1', fileName: 'grass1.png', src: '/sample-images/grass1.png' },
  { name: 'Grass 2', fileName: 'grass2.png', src: '/sample-images/grass2.png' },
];

export function UploadStep({ api, onNext }: UploadStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [tileSize, setTileSize] = useState(22);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [sourceSize, setSourceSize] = useState({ width: 0, height: 0 });
  const [displayWidth, setDisplayWidth] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);
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
    setSelectedSample(null);
    setPreviewSrc(next[0] ? URL.createObjectURL(next[0]) : null);
    setSourceSize({ width: 0, height: 0 });
    setPreviewReady(false);
  };

  const handleSampleSelect = async (sample: (typeof sampleImages)[number]) => {
    setSampleLoading(true);
    setSampleError(null);
    try {
      const response = await fetch(sample.src);
      if (!response.ok) {
        throw new Error(`Unable to load ${sample.name} sample image (${response.status}).`);
      }

      const image = await response.blob();
      handleUpload([new File([image], sample.fileName, {
        type: image.type || 'image/png',
      })]);
      setSelectedSample(sample.src);
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : 'Unable to load the sample image.');
    } finally {
      setSampleLoading(false);
    }
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
                    className="pointer-events-none absolute left-0 top-0 border-2 border-[var(--retro-green)]"
                    style={{ backgroundColor: 'color-mix(in srgb, var(--retro-green) 16%, transparent)', width: `${displayTileSize}px`, height: `${displayTileSize}px` }}
                  />
                  <button
                    type="button"
                    aria-label="Drag to resize tile grid"
                    title="Drag to resize tile grid"
                    className="absolute z-10 h-6 w-6 -translate-x-1/2 -translate-y-1/2 touch-none cursor-nwse-resize border-2 border-[var(--retro-green)] bg-[var(--retro-panel)]/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--retro-green)]"
                    style={{
                      left: `${displayTileSize}px`,
                      top: `${displayTileSize}px`,
                      boxShadow: 'inset 0 0 0 6px color-mix(in srgb, var(--retro-green) 28%, transparent)',
                    }}
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
              <PixelButton tone="green" disabled={!files[0] || loading} onClick={() => void handlePreview()}>
                Confirm
              </PixelButton>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">Try a sample image</h3>
              <p className="text-xs text-[var(--retro-muted)]">Select an example to load it into the upload area.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {sampleImages.map((sample) => {
                const selected = selectedSample === sample.src;
                return (
                  <button
                    key={sample.src}
                    type="button"
                    disabled={sampleLoading}
                    aria-pressed={selected}
                    onClick={() => void handleSampleSelect(sample)}
                    className={`overflow-hidden border-2 text-left transition-colors disabled:cursor-wait disabled:opacity-60 ${
                      selected
                        ? 'border-[var(--retro-green)]'
                        : 'border-[var(--retro-border)] hover:border-[var(--retro-green)]'
                    }`}
                    style={selected ? { backgroundColor: 'color-mix(in srgb, var(--retro-green) 12%, transparent)' } : undefined}
                  >
                    <img src={sample.src} alt="" className="pixelated h-24 w-full object-contain bg-[var(--retro-bg)] p-2" />
                    <span className="block px-2 py-1 text-xs font-bold">{sample.name}</span>
                  </button>
                );
              })}
            </div>
            {sampleError && <p role="alert" className="text-xs text-red-600">{sampleError}</p>}
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
