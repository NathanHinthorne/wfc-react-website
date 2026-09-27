import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PixelStepper, PixelContainer, PixelSectionHeader, PxlKitToastProvider } from '@pxlkit/ui-kit';
import { useWfcEngine } from './hooks/useWfcEngine';
import { UploadStep } from './components/steps/UploadStep';
import { AnalyzeStep } from './components/steps/AnalyzeStep';
import { ConfigureStep } from './components/steps/ConfigureStep';
import { GenerateStep } from './components/steps/GenerateStep';
import type { WizardStep } from './lib/types';

const STEP_ORDER: WizardStep[] = ['upload', 'analyze', 'configure', 'generate'];

export default function App() {
  const [step, setStep] = useState<WizardStep>('upload');
  const [restartRequired, setRestartRequired] = useState(false);
  const api = useWfcEngine();

  const activeIndex = STEP_ORDER.indexOf(step);
  const goTo = (s: WizardStep) => {
    if (STEP_ORDER.indexOf(s) > activeIndex) window.scrollTo(0, 0);
    setStep(s);
  };

  return (
    <PxlKitToastProvider position="top-right" max={3}>
      <div className="min-h-screen py-10">
      <aside className="fixed left-6 top-1/2 z-10 hidden h-[min(78vh,48rem)] w-44 -translate-y-1/2 items-center sm:flex">
        <PixelStepper
          active={activeIndex}
          orientation="vertical"
          className="h-full [&>div]:flex-1 [&>div>span]:h-auto [&>div>span]:flex-1"
        >
          <PixelStepper.Step label="Upload" description="Add sample terrain" />
          <PixelStepper.Step label="Analyze" description="Find tile rules" />
          <PixelStepper.Step label="Configure" description="Set output size" />
          <PixelStepper.Step label="Generate" description="Run & export" />
        </PixelStepper>
      </aside>

      <main className="sm:ml-56">
        <PixelContainer>
        <PixelSectionHeader
          className="mb-8"
          eyebrow="Wave Function Collapse"
          title="Terrain Generator"
          description="Upload a chunk of terrain composed of square tiles, let the algorithm analyze patterns within it, then generate new terrain that follows the same tile connection rules."
        />

        <div className="my-8 sm:hidden">
          <PixelStepper active={activeIndex} orientation="vertical">
            <PixelStepper.Step label="Upload" description="Add sample terrain" />
            <PixelStepper.Step label="Analyze" description="Find tile rules" />
            <PixelStepper.Step label="Configure" description="Set output size" />
            <PixelStepper.Step label="Generate" description="Run & export" />
          </PixelStepper>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {step === 'upload' && <UploadStep api={api} onNext={() => goTo('analyze')} />}
            {step === 'analyze' && (
              <AnalyzeStep api={api} onNext={() => goTo('configure')} onBack={() => goTo('upload')} />
            )}
            {step === 'configure' && (
              <ConfigureStep api={api} onNext={() => goTo('generate')} onBack={() => goTo('analyze')} />
            )}
            {step === 'generate' && (
              <GenerateStep
                api={api}
                onBack={() => goTo('configure')}
                onRestartRequired={() => setRestartRequired(true)}
                restartRequired={restartRequired}
              />
            )}
          </motion.div>
        </AnimatePresence>
        </PixelContainer>
      </main>
      </div>
    </PxlKitToastProvider>
  );
}
