import { useState } from 'react';
import {
  PixelButton,
  PixelCard,
  PixelAlert
} from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight, Search } from '@pxlkit/ui';
import { TileVariantGallery } from '../TileVariantGallery';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface AnalyzeStepProps {
  api: WfcEngineApi;
  imageFile: File | null;
  tileSize: number;
  onNext: () => void;
  onBack: () => void;
}

export function AnalyzeStep({ api, imageFile, tileSize, onNext, onBack }: AnalyzeStepProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [nameDraft, setNameDraft] = useState('');
  const [analyzedSource, setAnalyzedSource] = useState<{ file: File; tileSize: number } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analysisIsCurrent =
    analyzedSource?.file === imageFile &&
    analyzedSource.tileSize === tileSize &&
    api.tileVariants.length > 0;

  const handleAnalyze = async () => {
    if (!imageFile || analyzing) return;
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      if (!analyzedSource || analyzedSource.file !== imageFile || analyzedSource.tileSize !== tileSize) {
        setSelected([]);
        await api.loadImage(imageFile, tileSize);
      }
      api.analyze();
      setAnalyzedSource({ file: imageFile, tileSize });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Unable to analyze the image.');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggle = (index: number) => {
    setSelected((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const applyBehavior = (behavior: 'floor' | 'empty') => {
    selected.forEach((i) => api.setBehavior(i, behavior));
    setSelected([]);
  };

  const applyName = () => {
    if (!nameDraft.trim()) return;
    selected.forEach((i) => api.setTileName(i, nameDraft.trim()));
    setNameDraft('');
    setSelected([]);
  };

  return (
    <div className="flex flex-col gap-6">
      <PixelCard
        title="2. Analyze the tileset"
        description="Find unique tiles and learn how they connect to each other."
      >
        {!analysisIsCurrent ? (
          <PixelButton
            tone="cyan"
            disabled={!imageFile || analyzing}
            iconLeft={<PxlKitIcon icon={Search} size={16} />}
            onClick={() => void handleAnalyze()}
          >
            {analyzing ? 'Preparing image and analyzing…' : 'Analyze'}
          </PixelButton>
        ) : (
          <PixelAlert
            tone="green"
            title="Analysis complete"
            message={`Found ${api.tileVariants.length} unique tile variant${
              api.tileVariants.length === 1 ? '' : 's'
            }.`}
          />
        )}
        {analysisError && <p role="alert" className="mt-3 text-xs text-red-600">{analysisError}</p>}
      </PixelCard>

      {analysisIsCurrent && (
        <PixelCard
          title="Tile variants"
          description="Select one or more tiles, then apply a behavior or name below."
        >
          <div className="flex flex-col gap-4">
            <TileVariantGallery tiles={api.tileVariants} selected={selected} onToggle={toggle} />

            {/* <div className="flex flex-wrap items-end gap-3 border-t-2 border-[var(--retro-border)] pt-4">

              <div className="flex items-end gap-2">
                <PixelInput
                  label="Rename selected"
                  value={nameDraft}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNameDraft(e.target.value)}
                  placeholder="e.g. grass"
                  disabled={selected.length === 0}
                />
                <PixelButton size="sm" tone="purple" disabled={!nameDraft.trim() || selected.length === 0} onClick={applyName}>
                  Apply
                </PixelButton>
              </div>

              <PixelButton
                tone="red"
                size="sm"
                variant="ghost"
                iconLeft={<PxlKitIcon icon={Undo} size={14} />}
                onClick={api.resetBehaviors}
              >
                Reset behaviors
              </PixelButton>
            </div> */}
          </div>
        </PixelCard>
      )}

      <div className="flex justify-between">
        <PixelButton tone="neutral" variant="ghost" onClick={onBack}>
          Back
        </PixelButton>
        <PixelButton
          tone="green"
          disabled={!analysisIsCurrent}
          iconRight={<PxlKitIcon icon={ArrowRight} size={16} />}
          onClick={onNext}
        >
          Next: Configure
        </PixelButton>
      </div>
    </div>
  );
}
