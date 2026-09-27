import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PxlKitSurfaceProvider } from '@pxlkit/ui-kit';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PxlKitSurfaceProvider surface="pixel">
      <App />
    </PxlKitSurfaceProvider>
  </StrictMode>
);
