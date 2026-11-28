import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './index.css';
import App from './App';
import { I18nProvider } from './core/i18n';
import { StoreProvider } from './core/store';
import { registerSW } from 'virtual:pwa-register';

import { isDesktopApp, isNativeApp } from './core/api';

// Service worker only for the web/PWA build; the Android and desktop shells ship the files locally.
if (!isNativeApp() && !isDesktopApp()) registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </I18nProvider>
  </StrictMode>,
);
