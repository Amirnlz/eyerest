import { describe, expect, it } from 'vitest';
import { resolveView } from '../../src/renderer/view';

describe('resolveView', () => {
  it.each(['?view=settings', '?layout=positioned&view=settings', 'view=settings'])(
    'shows the settings screen for %s',
    (search) => {
      expect(resolveView(search)).toBe('settings');
    },
  );

  it.each(['', '?layout=surface', '?layout=positioned&integratedDim=1'])(
    'shows the overlay for the overlay window query %j',
    (search) => {
      expect(resolveView(search)).toBe('overlay');
    },
  );

  it.each(['?view=', '?view=overlay', '?view=SETTINGS', '?view=settings2', '?views=settings'])(
    'falls back to the overlay for %s',
    (search) => {
      expect(resolveView(search)).toBe('overlay');
    },
  );
});
