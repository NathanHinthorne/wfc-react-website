import { useState } from 'react';
import {
  PixelButton,
  PixelCard,
  PixelInput,
  PixelAlert
} from '@pxlkit/ui-kit';
import { PxlKitIcon } from '@pxlkit/core';
import { ArrowRight, Search, Undo } from '@pxlkit/ui';
import { TileVariantGallery } from '../TileVariantGallery';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';

interface AnalyzeStepProps {
  api: WfcEngineApi;
  onNext: () => void;
  onBack: () => void;
}

export function AnalyzeStep({ api, onNext, onBack }: AnalyzeStepProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [nameDraft, setNameDraft] = useState('');

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
        {!api.tileVariants.length ? (
          <PixelButton
            tone="cyan"
            iconLeft={<PxlKitIcon icon={Search} size={16} />}
            onClick={api.analyze}
          >
            Analyze
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
      </PixelCard>

      {api.tileVariants.length > 0 && (
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
          disabled={api.tileVariants.length === 0}
          iconRight={<PxlKitIcon icon={ArrowRight} size={16} />}
          onClick={onNext}
        >
          Next: Configure
        </PixelButton>
      </div>
    </div>
  );
}
