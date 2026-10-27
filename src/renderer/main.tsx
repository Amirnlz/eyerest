import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

const api = window.eyerest;
if (!api) throw new Error('window.eyerest is missing: the preload script did not run');

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <App api={api} />
  </StrictMode>,
);
