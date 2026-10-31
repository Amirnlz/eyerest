import type { CSSProperties } from 'react';
import { OVERLAY_MARGIN, OVERLAY_SIZE, type OverlayLayout } from '../shared/overlay-layout';
import type { EyerestApi } from '../shared/ipc';
import { Overlay } from './components/Overlay';
import './components/IntegratedDim.css';
import { useSchedulerSnapshot } from './hooks/use-scheduler-snapshot';
import { toOverlayViewModel } from './view-model';

export interface AppProps {
  readonly api: EyerestApi;
  /**
   * `positioned`: the window is the panel, so the panel fills it.
   * `surface`: the window covers the work area, so the panel is placed at the
   * top-right here. The window is transparent except for an integrated rest
   * scrim on native Wayland.
   */
  readonly layout?: OverlayLayout;
  /** Draw dim and rest content in one window for native Wayland stacking. */
  readonly integratedDim?: boolean;
}

/**
 * Geometry only, from the shared layout contract. The panel's look (surface color, shadow, text
 * color) comes from the `Surface` inside, so this box paints nothing: a white box here would
 * frame a dark panel in the dark theme.
 */
const surfacePanelStyle: CSSProperties = {
  position: 'fixed',
  top: OVERLAY_MARGIN,
  right: OVERLAY_MARGIN,
  width: OVERLAY_SIZE.width,
  height: OVERLAY_SIZE.height,
  boxSizing: 'border-box',
  zIndex: 1,
};

const integratedSurfaceStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
};

/** Connects the overlay to the main process through the preload bridge. */
export function App({ api, layout = 'positioned', integratedDim = false }: AppProps) {
  const snapshot = useSchedulerSnapshot(api);
  if (snapshot === null) return null;

  const viewModel = toOverlayViewModel(snapshot);
  if (viewModel.mode === 'hidden') return null;

  const overlay = (
    <Overlay
      viewModel={viewModel}
      onSkip={() => api.skip()}
      onPostpone={() => api.postpone()}
    />
  );

  if (layout !== 'surface') return overlay;

  if (integratedDim) {
    return (
      <div style={integratedSurfaceStyle}>
        {viewModel.mode === 'rest' ? (
          <div
            aria-hidden="true"
            className="er-integrated-dim"
            data-testid="integrated-dim"
          />
        ) : null}
        <div style={surfacePanelStyle}>{overlay}</div>
      </div>
    );
  }

  return <div style={surfacePanelStyle}>{overlay}</div>;
}
