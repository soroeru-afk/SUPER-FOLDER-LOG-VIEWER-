import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSettings, applySettingsToDOM } from './settingsSync';

initSettings();

if (window.matchMedia('(display-mode: standalone)').matches) {
  window.resizeTo(1440, 900);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
