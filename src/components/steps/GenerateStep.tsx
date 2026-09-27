import { useEffect, useRef } from 'react';
import { PixelButton, PixelCard, PixelProgress, PixelStatGroup, PixelStatCard, useToast } from '@pxlkit/ui-kit';
import { AnimatedPxlKitIcon, PxlKitIcon } from '@pxlkit/core';
import { Play, Pause, Undo, Download,  } from '@pxlkit/ui';
import { CanvasGridView } from '../CanvasGridView';
import type { WfcEngineApi } from '../../hooks/useWfcEngine';
import { WarningTriangle, ErrorOctagon } from '@pxlkit/feedback';

interface GenerateStepProps {
  api: WfcEngineApi;
  onBack: () => void;
  onRestartRequired: () => void;
  restartRequired: boolean;
}

export function GenerateStep({ api, onBack, onRestartRequired, restartRequired }: GenerateStepProps) {
  const isGenerating = api.status === 'generating';
  const { toast } = useToast();
  const shownThresholdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (api.retryCount === 0) {
      shownThresholdsRef.current.clear();
      return;
    }

    const notices = [
      {
        threshold: 7,
        title: 'WARNING',
        message: 'The algorithm is having trouble placing tiles that satisfy all the tile rules.',
        tone: 'gold' as const,
        icon: <PxlKitIcon icon={WarningTriangle} size={24} />,
      },
      {
        threshold: 15,
        title: 'WARNING',
        message: 'Struggling to finish generation. There may be too many unique tiles.',
        tone: 'gold' as const,
        icon: <PxlKitIcon icon={WarningTriangle} size={24} />,
      },
      {
        threshold: 22,
        title: 'ERROR',
        message: 'Please retry from the start with a different input image.',
        tone: 'red' as const,
        icon: <PxlKitIcon icon={ErrorOctagon} size={24} />,
      },
    ];

    for (const notice of notices) {
      if (api.retryCount >= notice.threshold && !shownThresholdsRef.current.has(notice.threshold)) {
        shownThresholdsRef.current.add(notice.threshold);
        toast({
          title: notice.title,
          message: notice.message,
          tone: notice.tone,
          duration: 4000,
          icon: notice.icon,
        });
        if (notice.threshold === 22) {
          api.pause();
          onRestartRequired();
        }
      }
    }
  }, [api, onRestartRequired, toast]);


  return (
    <div className="flex flex-col gap-6">
      <div className="relative">
        <div className={restartRequired ? 'pointer-events-none grayscale opacity-40' : ''}>
          <PixelCard title="4. Generate" description="Watch the wave function collapse into a finished map.">
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {!isGenerating ? (
                  <PixelButton tone="green" iconLeft={<PxlKitIcon icon={Play} size={16} />} onClick={api.play}>
                    {api.status === 'complete' ? 'Regenerate' : api.status === 'paused' ? 'Resume' : 'Play'}
                  </PixelButton>
                ) : (
                  <PixelButton tone="gold" iconLeft={<PxlKitIcon icon={Pause} size={16} />} onClick={api.pause}>
                    Pause
                  </PixelButton>
                )}
                <PixelButton tone="red" variant="ghost" iconLeft={<PxlKitIcon icon={Undo} size={16} />} onClick={api.reset}>
                  Reset
                </PixelButton>
              </div>

              <PixelProgress value={Math.round(api.progress * 100)} tone="green" label="Generation progress" />

              <PixelStatGroup aria-label="Generation stats">
                <PixelStatCard label="Grid size" value={`${api.engine.outputWidth}×${api.engine.outputHeight}`} />
                <PixelStatCard label="Retries" value={String(api.retryCount)} />
                <PixelStatCard label="Status" value={api.status} />
              </PixelStatGroup>
            </div>
          </PixelCard>
        </div>
        {restartRequired && (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Generation failed"
            className="absolute inset-0 z-10 flex items-center justify-center"
          >
            <PixelButton tone="green" onClick={() => window.location.reload()}>
              Restart
              </PixelButton>
          </div>
        )}
      </div>
      <div className={restartRequired ? 'pointer-events-none grayscale opacity-40' : ''}>
        <PixelCard title="Output">
          <CanvasGridView tiles={api.outputTiles} optionCounts={api.outputOptionCounts} maxDisplayWidth={560} fadeInMs={150} />
        </PixelCard>
      </div>

      {api.status === 'complete' && (
        <PixelCard title="Export" description="Choose what to do with the finished terrain.">
          <div className="divide-y divide-[var(--retro-border)]/50">
            <div className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--retro-text)]">Image (.png)</h3>
                <p className="mt-1 text-sm text-[var(--retro-muted)]">
                  Save or share a ready-to-view picture of the finished terrain.
                </p>
              </div>
              <PixelButton tone="cyan" iconLeft={<PxlKitIcon icon={Download} size={16} />} onClick={() => api.engine.exportImage()}>
                Download image
              </PixelButton>
            </div>

            <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--retro-text)]">Tilemap (.json)</h3>
                <p className="mt-1 text-sm text-[var(--retro-muted)]">
                  A 2D array of the tile names/indices in their generated pattern above. This can be parsed to reconstruct the terrain in your project.
                </p>
              </div>
              <PixelButton
                tone="purple"
                iconLeft={<PxlKitIcon icon={Download} size={16} />}
                onClick={() => api.engine.exportTilemap()}
              >
                Download tilemap
              </PixelButton>
            </div>

            <div className="flex flex-col gap-3 py-4 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[var(--retro-text)]">Tile rules (.json)</h3>
                <p className="mt-1 text-sm text-[var(--retro-muted)]">
                  The tile neighboring rules. Run the WFC engine on this to generate new terrain under the same contraints. A more flexible approach than the tilemap.
                </p>
              </div>
              <PixelButton
                tone="gold"
                iconLeft={<PxlKitIcon icon={Download} size={16} />}
                onClick={() => api.engine.exportTileRules()}
              >
                Download tile rules
              </PixelButton>
            </div>
          </div>
        </PixelCard>
      )}

      <div className="flex justify-start">
        <PixelButton tone="neutral" variant="ghost" onClick={onBack}>
          Back
        </PixelButton>
      </div>
    </div>
  );
}
