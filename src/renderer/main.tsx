import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'virtual:eyerest-design.css';
import { isOverlayLayout } from '../shared/overlay-layout';
import { App } from './App';
import { SettingsPage } from './components/SettingsPage';
import { copy } from './copy';
import { loadBundledFonts } from './fonts-bootstrap';
import { createAudioPlayer, createBrowserAudio } from './sound/audio-player';
import { SOUND_URLS } from './sound/sound-assets';
import { createDomThemeController, followThemeFromMain, themeFromSearch } from './theme';
import { resolveView } from './view';

void loadBundledFonts();
const api = window.eyerest;
if (!api) throw new Error('window.eyerest is missing: the preload script did not run');

// The choice (System, Light or Dark) lives in main. It arrives in the URL for the first paint and as
// a push when the person changes it in the tray.
const theme = createDomThemeController(window, themeFromSearch(window.location.search));
theme.start();
followThemeFromMain(theme, api);

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

const params = new URLSearchParams(window.location.search);

// The main process opens the settings window with `?view=settings`; the overlay has no `view`.
if (resolveView(window.location.search) === 'settings') {
  document.title = copy.settings.windowTitle;
  createRoot(container).render(
    <StrictMode>
      <SettingsPage api={api} />
    </StrictMode>,
  );
} else {
  // The main process passes the layout as `?layout=positioned|surface`.
  const requestedLayout = params.get('layout');
  const layout = isOverlayLayout(requestedLayout) ? requestedLayout : 'positioned';
  const integratedDim = params.get('integratedDim') === '1';
  const soundPlayer = createAudioPlayer({
    urls: SOUND_URLS,
    createAudio: createBrowserAudio,
    log: (message) => console.warn(`[sound] ${message}`),
  });

  createRoot(container).render(
    <StrictMode>
      <App api={api} layout={layout} integratedDim={integratedDim} soundPlayer={soundPlayer} />
    </StrictMode>,
  );
}
