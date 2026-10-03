import { useRef, useState } from 'react';
import { PixelButton, PixelCard, PixelNumberInput } from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight } from '@pxlkit/ui';
import { CanvasGridView } from '../CanvasGridView';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface ConfigureStepProps {
  api: WfcEngineApi;
  onNext: () => void;
  onBack: () => void;
}

export function ConfigureStep({ api, onNext, onBack }: ConfigureStepProps) {
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(20);
  const resizeRef = useRef<{
    axis: 'width' | 'height';
    startCoordinate: number;
    startValue: number;
    cellSize: number;
  } | null>(null);

  const startResize = (axis: 'width' | 'height', event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeRef.current = {
      axis,
      startCoordinate: axis === 'width' ? event.clientX : event.clientY,
      startValue: axis === 'width' ? width : height,
      cellSize: Math.max(2, Math.min(32, Math.floor(560 / width))),
    };
  };

  const updateResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    const resize = resizeRef.current;
    if (!resize) return;

    const coordinate = resize.axis === 'width' ? event.clientX : event.clientY;
    const delta = Math.round((coordinate - resize.startCoordinate) / resize.cellSize);
    const nextValue = Math.max(1, Math.min(100, resize.startValue + delta));
    if (resize.axis === 'width') setWidth(nextValue);
    else setHeight(nextValue);
  };

  const stopResize = (event: React.PointerEvent<HTMLButtonElement>) => {
    resizeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleNext = () => {
    api.initializeGrid(width, height);
    onNext();
  };

  const previewTiles = Array.from({ length: height }, () => Array<string | null>(width).fill(null));

  return (
    <div className="flex flex-col gap-6">
      <PixelCard title="3. Configure the output" description="Set the size of the terrain you want to generate.">
        <div className="flex flex-wrap gap-4">
          <PixelNumberInput label="Width (tiles)" value={width} onChange={setWidth} min={1} max={100} />
          <PixelNumberInput label="Height (tiles)" value={height} onChange={setHeight} min={1} max={100} />
        </div>
      </PixelCard>

      <PixelCard title="Output preview" description="An empty grid at the selected size.">
        <div className="relative inline-block max-w-full align-top">
          <CanvasGridView tiles={previewTiles} maxDisplayWidth={560} fadeInMs={0} />
          <button
            type="button"
            aria-label="Drag to resize grid width"
            title="Drag to resize width"
            className="absolute right-0 top-1/2 flex h-12 w-6 -translate-y-1/2 touch-none cursor-ew-resize items-center justify-center border border-[var(--retro-gold)] bg-[var(--retro-bg)]/90 text-[var(--retro-gold)] hover:bg-[var(--retro-gold)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--retro-gold)]"
            onPointerDown={(event) => startResize('width', event)}
            onPointerMove={updateResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
          >
            <span aria-hidden className="h-5 w-1 border-x-2 border-[var(--retro-gold)]" />
          </button>
          <button
            type="button"
            aria-label="Drag to resize grid height"
            title="Drag to resize height"
            className="absolute -bottom-3 left-1/2 flex h-6 w-12 -translate-x-1/2 touch-none cursor-ns-resize items-center justify-center border border-[var(--retro-gold)] bg-[var(--retro-bg)]/90 text-[var(--retro-gold)] hover:bg-[var(--retro-gold)]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--retro-gold)]"
            onPointerDown={(event) => startResize('height', event)}
            onPointerMove={updateResize}
            onPointerUp={stopResize}
            onPointerCancel={stopResize}
          >
            <span aria-hidden className="h-1 w-5 border-y-2 border-[var(--retro-gold)]" />
          </button>
        </div>
      </PixelCard>

      <div className="flex justify-between">
        <PixelButton tone="neutral" variant="ghost" onClick={onBack}>
          Back
        </PixelButton>
        <PixelButton tone="green" iconRight={<PxlKitIcon icon={ArrowRight} size={16} />} onClick={handleNext}>
          Next: Generate
        </PixelButton>
      </div>
    </div>
  );
}
