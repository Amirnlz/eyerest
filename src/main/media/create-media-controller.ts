import { NullMediaController } from './null-media-controller';
import { BusctlMprisBus } from './mpris/busctl-mpris-bus';
import { MprisMediaController } from './mpris/mpris-media-controller';
import type { MediaController } from './ports';

/**
 * One place that picks the adapter by platform. Windows and macOS adapters
 * arrive in Step 1.7; until then they use the null controller.
 */
export function createMediaController(
  platform: NodeJS.Platform,
  log: (message: string) => void = () => {},
): MediaController {
  switch (platform) {
    case 'linux':
      return new MprisMediaController(new BusctlMprisBus(), (player, error) =>
        log(`could not pause ${player}: ${String(error)}`),
      );
    default:
      return new NullMediaController();
  }
}
