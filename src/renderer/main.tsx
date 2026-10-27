import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { isOverlayLayout } from '../shared/overlay-layout';
import { App } from './App';

const api = window.eyerest;
if (!api) throw new Error('window.eyerest is missing: the preload script did not run');

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

// The main process passes the layout as `?layout=positioned|surface`.
const requestedLayout = new URLSearchParams(window.location.search).get('layout');
const layout = isOverlayLayout(requestedLayout) ? requestedLayout : 'positioned';

createRoot(container).render(
  <StrictMode>
    <App api={api} layout={layout} />
  </StrictMode>,
);
