import type { CSSProperties } from 'react';
import { OVERLAY_MARGIN, OVERLAY_SIZE, type OverlayLayout } from '../shared/overlay-layout';
import type { EyerestApi } from '../shared/ipc';
import { Overlay } from './components/Overlay';
import { useSchedulerSnapshot } from './hooks/use-scheduler-snapshot';
import { toOverlayViewModel } from './view-model';

export interface AppProps {
  readonly api: EyerestApi;
  /**
   * `positioned`: the window is the panel, so the panel fills it.
   * `surface`: the window covers the work area, so the panel is placed at the
   * top-right here. The window is transparent, so nothing else is drawn.
   */
  readonly layout?: OverlayLayout;
}

/** Temporary Phase 1 look for the panel in the surface layout. Phase 2 replaces it. */
const surfacePanelStyle: CSSProperties = {
  position: 'fixed',
  top: OVERLAY_MARGIN,
  right: OVERLAY_MARGIN,
  width: OVERLAY_SIZE.width,
  boxSizing: 'border-box',
  padding: 8,
  background: '#ffffff',
  color: '#000000',
  border: '1px solid #888888',
};

/** Connects the overlay to the main process through the preload bridge. */
export function App({ api, layout = 'positioned' }: AppProps) {
  const snapshot = useSchedulerSnapshot(api);
  if (snapshot === null) return null;

  const viewModel = toOverlayViewModel(snapshot);
  if (viewModel.mode === 'hidden') return null;

  const overlay = (
    <Overlay viewModel={viewModel} onSkip={() => api.skip()} onPostpone={() => api.postpone()} />
  );

  return layout === 'surface' ? <div style={surfacePanelStyle}>{overlay}</div> : overlay;
}
