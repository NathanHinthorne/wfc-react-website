import { useState } from 'react';
import { PixelButton, PixelCard, PixelSlider } from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight } from '@pxlkit/ui';
import { CanvasGridView } from '../CanvasGridView';
import { PixelNumberStepper } from '../PixelNumberStepper';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface ConfigureStepProps {
  api: WfcEngineApi;
  onNext: () => void;
  onBack: () => void;
}

export function ConfigureStep({ api, onNext, onBack }: ConfigureStepProps) {
  const [width, setWidth] = useState(20);
  const [height, setHeight] = useState(20);

  const handleNext = () => {
    api.initializeGrid(width, height);
    onNext();
  };

  const previewTiles = Array.from({ length: height }, () => Array<string | null>(width).fill(null));

  return (
    <div className="flex flex-col gap-6">
      <PixelCard title="3. Configure the output" description="Set the size of the terrain you want to generate.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <PixelNumberStepper label="Width (tiles)" value={width} onChange={setWidth} min={1} max={100} />
            <PixelSlider
              label="Resize width"
              min={1}
              max={100}
              value={width}
              onChange={setWidth}
              tone="green"
              surface="pixel"
              showMinMax
            />
          </div>
          <div className="flex flex-col gap-3">
            <PixelNumberStepper label="Height (tiles)" value={height} onChange={setHeight} min={1} max={100} />
            <PixelSlider
              label="Resize height"
              min={1}
              max={100}
              value={height}
              onChange={setHeight}
              tone="green"
              surface="pixel"
              showMinMax
            />
          </div>
        </div>
      </PixelCard>

      <PixelCard title="Output preview" description="The grid updates as you adjust its width and height.">
        <CanvasGridView tiles={previewTiles} maxDisplayWidth={560} fadeInMs={0} />
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
