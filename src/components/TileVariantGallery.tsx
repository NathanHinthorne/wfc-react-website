import { PixelBadge } from '@pxlkit/ui-kit';
import { TileThumb } from './TileThumb';
import type { Tile } from '../lib/tile';

interface TileVariantGalleryProps {
  tiles: Tile[];
  selected: number[];
  onToggle: (index: number) => void;
}

const behaviorTone: Record<string, 'green' | 'cyan' | 'neutral'> = {
  floor: 'green',
  empty: 'cyan',
};

export function TileVariantGallery({ tiles, selected, onToggle }: TileVariantGalleryProps) {
  if (tiles.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center border-2 border-dashed border-[var(--retro-border)] text-xs text-[var(--retro-muted)]">
        Click "Analyze" to discover tile variants
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {tiles.map((tile) => (
        <div key={tile.index} className="flex flex-col items-center gap-1">
          <TileThumb
            src={tile.dataURL}
            size={48}
            selected={selected.includes(tile.index!)}
            onClick={() => onToggle(tile.index!)}
            title={tile.name ?? `Tile ${tile.index}`}
          />
          <span className="font-pixel text-[10px] text-[var(--retro-muted)]">
            {tile.name ?? tile.index}
          </span>
          {tile.behavior && (
            <PixelBadge tone={behaviorTone[tile.behavior] ?? 'neutral'} size="sm">
              {tile.behavior}
            </PixelBadge>
          )}
        </div>
      ))}
    </div>
  );
}
