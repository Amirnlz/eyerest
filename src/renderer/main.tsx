import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'virtual:eyerest-design.css';
import { isOverlayLayout } from '../shared/overlay-layout';
import { App } from './App';
import { SettingsPage } from './components/SettingsPage';
import { copy } from './copy';
import { loadBundledFonts } from './fonts-bootstrap';
import { createDomThemeController } from './theme';
import { resolveView } from './view';

void loadBundledFonts();
// Follows the OS theme. A user setting needs a store in the main process (roadmap candidate).
createDomThemeController(window).start();

const api = window.eyerest;
if (!api) throw new Error('window.eyerest is missing: the preload script did not run');

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

  createRoot(container).render(
    <StrictMode>
      <App api={api} layout={layout} integratedDim={integratedDim} />
    </StrictMode>,
  );
}
