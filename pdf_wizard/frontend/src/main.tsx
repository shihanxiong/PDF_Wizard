import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';
import { App } from './App';
import { I18nProvider } from './utils/i18n';
import { WindowSetBackgroundColour } from '../wailsjs/runtime/runtime';

// Set window background to white (RGBA: 255, 255, 255, 255)
// This ensures the window background is white regardless of system theme
WindowSetBackgroundColour(255, 255, 255, 255);

const container = document.getElementById('root');

const root = createRoot(container!);

root.render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
