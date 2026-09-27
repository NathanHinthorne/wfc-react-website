import { useCallback, useEffect, useRef, useState } from 'react';
import { WfcEngine } from '../lib/wfcEngine';
import type { Tile } from '../lib/tile';
import type { TileBehavior, StepStatus } from '../lib/types';

export function useWfcEngine() {
  const engineRef = useRef<WfcEngine>(new WfcEngine());
  const engine = engineRef.current;

  const [inputImageSrc, setInputImageSrc] = useState<string | null>(null);
  const [inputTiles, setInputTiles] = useState<string[][]>([]);
  const [tileVariants, setTileVariants] = useState<Tile[]>([]);
  const [outputTiles, setOutputTiles] = useState<(string | null)[][]>([]);
  const [outputOptionCounts, setOutputOptionCounts] = useState<number[][]>([]);
  const [status, setStatus] = useState<StepStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [totalBacktracks, setTotalBacktracks] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [generationSpeed, setGenerationSpeed] = useState(120); // steps per second

  const rafRef = useRef<number | null>(null);
  const lastStepTimeRef = useRef(0);

  const refreshOutput = useCallback(() => {
    setOutputTiles(engine.getOutputTileImages());
    setOutputOptionCounts(engine.outputGrid.map((row) => row.map((cell) => cell.options.size)));
  }, [engine]);

  const loadImage = useCallback(
    async (file: File, tilePixelSize: number) => {
      const img = await engine.loadAndParseImage(file, tilePixelSize);
      setInputImageSrc(img.src);
      setInputTiles(engine.getInputTileImages());
      setTileVariants([]);
      setOutputTiles([]);
      setStatus('idle');
    },
    [engine]
  );

  const analyze = useCallback(() => {
    const variants = engine.analyze();
    setTileVariants([...variants]);
  }, [engine]);

  const setBehavior = useCallback(
    (tileIndex: number, behavior: TileBehavior) => {
      engine.setBehavior(tileIndex, behavior);
      setTileVariants([...engine.tileVariants]);
    },
    [engine]
  );

  const setTileName = useCallback(
    (tileIndex: number, name: string) => {
      engine.setTileName(tileIndex, name);
      setTileVariants([...engine.tileVariants]);
    },
    [engine]
  );

  const resetBehaviors = useCallback(() => {
    engine.resetBehaviors();
    setTileVariants([...engine.tileVariants]);
  }, [engine]);

  const initializeGrid = useCallback(
    (width: number, height: number) => {
      engine.initializeOutputGrid(width, height);
      refreshOutput();
      setProgress(0);
      setTotalBacktracks(0);
      setRetryCount(0);
      setStatus('idle');
    },
    [engine, refreshOutput]
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(
    (time: number) => {
      const interval = 1000 / Math.max(1, generationSpeed);
      if (time - lastStepTimeRef.current >= interval) {
        lastStepTimeRef.current = time;
        const result = engine.step();
        refreshOutput();

        if (result.status === 'progress') {
          setProgress(result.progress);
        } else if (result.status === 'backtrack') {
          setTotalBacktracks(result.totalBacktracks);
          setRetryCount(result.retryCount);
        } else if (result.status === 'complete') {
          setProgress(1);
          setStatus('complete');
          stopLoop();
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [engine, generationSpeed, refreshOutput, stopLoop]
  );

  const play = useCallback(() => {
    if (!engine.outputIsInitialized || engine.outputIsComplete) {
      engine.initializeOutputGrid(engine.outputWidth, engine.outputHeight);
      refreshOutput();
      setProgress(0);
      setTotalBacktracks(0);
      setRetryCount(0);
    }
    setStatus('generating');
    lastStepTimeRef.current = 0;
    stopLoop();
    rafRef.current = requestAnimationFrame(tick);
  }, [engine, refreshOutput, stopLoop, tick]);

  const pause = useCallback(() => {
    stopLoop();
    setStatus('paused');
  }, [stopLoop]);

  const reset = useCallback(() => {
    stopLoop();
    engine.initializeOutputGrid(engine.outputWidth, engine.outputHeight);
    refreshOutput();
    setProgress(0);
    setTotalBacktracks(0);
    setRetryCount(0);
    setStatus('idle');
  }, [engine, refreshOutput, stopLoop]);

  useEffect(() => stopLoop, [stopLoop]);

  return {
    engine,
    inputImageSrc,
    inputTiles,
    tileVariants,
    outputTiles,
    outputOptionCounts,
    status,
    progress,
    totalBacktracks,
    retryCount,
    generationSpeed,
    setGenerationSpeed,
    loadImage,
    analyze,
    setBehavior,
    setTileName,
    resetBehaviors,
    initializeGrid,
    play,
    pause,
    reset,
  };
}

export type WfcEngineApi = ReturnType<typeof useWfcEngine>;
