import { motion } from 'motion/react';

interface TileThumbProps {
  src: string | null;
  size: number;
  selected?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
  title?: string;
}

/**
 * A single tile cell. When `src` flips from null to a data URL (a cell just
 * collapsed), it pops in with a small scale/opacity animation instead of
 * appearing instantly — this is what replaces the DOM-grid alternative to
 * the original's canvas redraw.
 */
export function TileThumb({ src, size, selected, dimmed, onClick, title }: TileThumbProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={[
        'relative flex items-center justify-center border-2 transition-colors',
        selected ? 'border-[var(--retro-cyan)]' : 'border-[var(--retro-border)]',
        dimmed ? 'opacity-40' : 'opacity-100',
        onClick ? 'cursor-pointer hover:border-[var(--retro-gold)]' : 'cursor-default',
      ].join(' ')}
      style={{ width: size, height: size, background: 'var(--retro-surface)' }}
    >
      {src && (
        <motion.img
          key={src}
          src={src}
          alt={title ?? 'tile'}
          className="pixelated h-full w-full"
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
      )}
    </button>
  );
}
