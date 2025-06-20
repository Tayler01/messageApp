import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const isStackBlitz = (() => {
  try {
    return window.location.hostname.includes('stackblitz.io') || 
      (window.parent !== window && window.parent.location.hostname.includes('stackblitz.io'));
  } catch (error) {
    // Cross-origin access blocked, fallback to checking current window only
    return window.location.hostname.includes('stackblitz.io');
  }
})();

if ('serviceWorker' in navigator && !isStackBlitz) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch(err => {
        // Check if this is a StackBlitz-specific service worker limitation
        if (err.message && err.message.includes('StackBlitz')) {
          console.warn('Service worker registration failed (expected in StackBlitz):', err.message);
        } else {
          console.error('Service worker registration failed:', err);
        }
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
