import { useEffect, useId, useState } from 'react';

interface PixelNumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
}

export function PixelNumberStepper({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: PixelNumberStepperProps) {
  const inputId = useId();
  const [display, setDisplay] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDisplay(String(value));
  }, [focused, value]);

  const adjustValue = (direction: -1 | 1) => {
    const nextValue = Math.min(max, Math.max(min, value + direction * step));
    onChange(nextValue);
  };

  const handleBlur = () => {
    setFocused(false);
    const parsedValue = Number(display);
    if (display.trim() === '' || !Number.isFinite(parsedValue)) {
      setDisplay(String(value));
      return;
    }

    const nextValue = Math.min(max, Math.max(min, parsedValue));
    setDisplay(String(nextValue));
    if (nextValue !== value) onChange(nextValue);
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wide">
        {label}
      </label>
      <div className="flex w-full max-w-xs items-stretch gap-2">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          title={`Decrease ${label}`}
          disabled={value <= min}
          onClick={() => adjustValue(-1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[var(--retro-border)] bg-[var(--retro-panel)] text-[var(--retro-green)] transition-colors hover:border-[var(--retro-green)] hover:bg-[var(--retro-green)]/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--retro-green)]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 fill-current">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          value={display}
          aria-label={label}
          onFocus={() => setFocused(true)}
          onChange={(event) => {
            const nextDisplay = event.currentTarget.value;
            setDisplay(nextDisplay);
            const nextValue = Number(nextDisplay);
            if (nextDisplay.trim() !== '' && Number.isFinite(nextValue)) {
              onChange(nextValue);
            }
          }}
          onBlur={handleBlur}
          className="h-12 min-w-20 flex-1 border-2 border-[var(--retro-border)] bg-[var(--retro-bg)] px-2 text-center font-mono text-md text-[var(--retro-text)] focus:border-[var(--retro-green)] focus:outline-none"
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          title={`Increase ${label}`}
          disabled={value >= max}
          onClick={() => adjustValue(1)}
          className="flex h-12 w-12 shrink-0 items-center justify-center border-2 border-[var(--retro-border)] bg-[var(--retro-panel)] text-[var(--retro-green)] transition-colors hover:border-[var(--retro-green)] hover:bg-[var(--retro-green)]/10 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--retro-green)]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7 fill-current">
            <path d="m12 4-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
