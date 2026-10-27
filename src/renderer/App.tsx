import type { EyerestApi } from "../shared/ipc";
import { Overlay } from "./components/Overlay";
import { useSchedulerSnapshot } from "./hooks/use-scheduler-snapshot";
import { HIDDEN_VIEW_MODEL, toOverlayViewModel } from "./view-model";

export interface AppProps {
  readonly api: EyerestApi;
}

/** Connects the overlay to the main process through the preload bridge. */
export function App({ api }: AppProps) {
  const snapshot = useSchedulerSnapshot(api);
  const viewModel =
    snapshot === null ? HIDDEN_VIEW_MODEL : toOverlayViewModel(snapshot);

  return (
    <Overlay
      viewModel={viewModel}
      onSkip={() => api.skip()}
      onPostpone={() => api.postpone()}
    />
  );
}
