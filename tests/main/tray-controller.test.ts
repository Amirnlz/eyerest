import { describe, expect, it } from 'vitest';
import { TrayController } from '../../src/main/tray/tray-controller';
import { AWAY, IDLE, WORKING, resting, warning } from '../helpers/fake-api';
import { FakeAutostart, FakeExercisesPort, FakeSoundPrefs, FakeThemePort, FakeTray, FakeTrayActions } from '../helpers/fake-lifecycle';

function setup() {
  const tray = new FakeTray();
  const actions = new FakeTrayActions();
  const controller = new TrayController(tray, actions, (ms) => `T${ms}`);
  return { tray, actions, controller };
}

describe('TrayController', () => {
  describe('menu state per scheduler state', () => {
    it('sets nothing before the first snapshot', () => {
      const { tray } = setup();
      expect(tray.menus).toHaveLength(0);
    });

    it('shows the next rest time while working', () => {
      const { tray, controller } = setup();
      controller.send(WORKING);
      expect(tray.labels).toEqual(['Next rest at T20000', 'Pause reminders', 'Settings', 'Quit']);
    });

    it('follows the phases: working, warning, resting, working', () => {
      const { tray, controller } = setup();
      controller.send(WORKING);
      controller.send(warning(10));
      expect(tray.labels[0]).toBe('Rest starting soon');
      controller.send(resting(20));
      expect(tray.labels[0]).toBe('Resting');
      controller.send(WORKING);
      expect(tray.labels[0]).toBe('Next rest at T20000');
    });

    it('shows Paused and Resume when the scheduler is idle', () => {
      const { tray, controller } = setup();
      controller.send(WORKING);
      controller.send(IDLE);
      expect(tray.labels).toEqual(['Paused', 'Resume reminders', 'Settings', 'Quit']);
    });

    it('does not touch the tray for every countdown second', () => {
      const { tray, controller } = setup();
      controller.send(resting(20));
      controller.send(resting(19));
      controller.send(resting(18));
      expect(tray.menus).toHaveLength(1);
    });
  });

  describe('actions', () => {
    it('Pause while working runs pause', () => {
      const { tray, actions, controller } = setup();
      controller.send(WORKING);
      tray.click('toggle');
      expect(actions.calls).toEqual(['pause']);
    });

    it.each([
      ['warning', warning(10)],
      ['resting', resting(10)],
      ['away', AWAY],
    ])('Pause during the %s runs pause', (_name, snapshot) => {
      const { tray, actions, controller } = setup();
      controller.send(snapshot);
      tray.click('toggle');
      expect(actions.calls).toEqual(['pause']);
    });

    it('Resume while paused runs resume', () => {
      const { tray, actions, controller } = setup();
      controller.send(IDLE);
      tray.click('toggle');
      expect(actions.calls).toEqual(['resume']);
    });

    it('toggle follows the latest snapshot: pause, then resume', () => {
      const { tray, actions, controller } = setup();
      controller.send(WORKING);
      tray.click('toggle');
      controller.send(IDLE);
      tray.click('toggle');
      expect(actions.calls).toEqual(['pause', 'resume']);
    });

    it('Quit runs quit in every state', () => {
      for (const snapshot of [IDLE, WORKING, warning(5), resting(5)]) {
        const { tray, actions, controller } = setup();
        controller.send(snapshot);
        tray.click('quit');
        expect(actions.calls).toEqual(['quit']);
      }
    });

    it('Settings opens the settings window in every state, and nothing else', () => {
      for (const snapshot of [IDLE, WORKING, warning(5), resting(5)]) {
        const { tray, actions, controller } = setup();
        controller.send(snapshot);
        tray.click('settings');
        expect(actions.calls).toEqual(['openSettings']);
      }
    });

    it('the status line does nothing', () => {
      const { tray, actions, controller } = setup();
      controller.send(WORKING);
      tray.click('status');
      expect(actions.calls).toEqual([]);
    });

    it('a toggle before the first snapshot does nothing', () => {
      const { actions, controller } = setup();
      controller.handle('toggle');
      expect(actions.calls).toEqual([]);
    });
  });

  describe('dispose', () => {
    it('destroys the tray once and ignores later snapshots and clicks', () => {
      const { tray, actions, controller } = setup();
      controller.send(WORKING);
      controller.dispose();
      controller.dispose();
      controller.send(IDLE);
      controller.handle('quit');
      controller.handle('settings');

      expect(tray.destroyed).toBe(1);
      expect(tray.menus).toHaveLength(1);
      expect(actions.calls).toEqual([]);
    });
  });
});

describe('TrayController launch at login', () => {
  function withAutostart(autostart = new FakeAutostart()) {
    const tray = new FakeTray();
    const actions = new FakeTrayActions();
    const log: string[] = [];
    const controller = new TrayController(tray, actions, (ms) => `T${ms}`, {
      autostart,
      log: (message) => log.push(message),
    });
    return { tray, actions, controller, autostart, log };
  }

  const checked = (tray: FakeTray) => {
    const entry = tray.menu.items.find((item) => item.kind === 'item' && item.id === 'autostart');
    return entry?.kind === 'item' ? entry.checked : undefined;
  };

  it('shows an unchecked item when the OS entry is off, a checked one when on', () => {
    const off = withAutostart();
    off.controller.send(WORKING);
    expect(checked(off.tray)).toBe(false);

    const on = withAutostart(new FakeAutostart({ supported: true, enabled: true }));
    on.controller.send(WORKING);
    expect(checked(on.tray)).toBe(true);
  });

  it('has no item when unsupported, and clicking it does nothing', () => {
    const { tray, controller, autostart } = withAutostart(new FakeAutostart({ supported: false }));
    controller.send(WORKING);
    expect(checked(tray)).toBeUndefined();
    controller.handle('autostart');
    expect(autostart.calls).toEqual([]);
  });

  it('has no item at all without a port (the existing constructor)', () => {
    const { tray, controller } = setup();
    controller.send(WORKING);
    expect(checked(tray)).toBeUndefined();
  });

  it('click turns it on and the menu is rebuilt checked', () => {
    const { tray, controller, autostart } = withAutostart();
    controller.send(WORKING);
    tray.click('autostart');
    expect(autostart.calls).toEqual([true]);
    expect(checked(tray)).toBe(true);
  });

  it('a second click turns it off again', () => {
    const { tray, controller, autostart } = withAutostart();
    controller.send(WORKING);
    tray.click('autostart');
    tray.click('autostart');
    expect(autostart.calls).toEqual([true, false]);
    expect(checked(tray)).toBe(false);
  });

  it('keeps the current phase text after a toggle', () => {
    const { tray, controller } = withAutostart();
    controller.send(warning(10));
    tray.click('autostart');
    expect(tray.labels[0]).toBe('Rest starting soon');
  });

  it('reads the OS once, not on every snapshot', () => {
    const { controller, autostart } = withAutostart();
    controller.send(WORKING);
    controller.send(warning(10));
    controller.send(warning(9));
    controller.send(resting(5));
    expect(autostart.reads).toBe(1);
  });

  it('a refused change is logged and the checkbox shows the real OS state', () => {
    const { tray, controller, autostart, log } = withAutostart();
    autostart.setError = new Error('permission denied');
    controller.send(WORKING);

    tray.click('autostart');

    expect(log).toEqual([expect.stringContaining('permission denied')]);
    expect(checked(tray)).toBe(false);
  });

  it('an unreadable OS state hides the item instead of crashing', () => {
    const { tray, controller, autostart, log } = withAutostart();
    autostart.readError = new Error('registry locked');
    controller.send(WORKING);
    expect(checked(tray)).toBeUndefined();
    expect(log).toEqual([expect.stringContaining('registry locked')]);
  });

  it('click before the first snapshot does nothing and does not throw', () => {
    const { controller, autostart } = withAutostart();
    controller.handle('autostart');
    expect(autostart.calls).toEqual([]);
  });

  it('is ignored after dispose', () => {
    const { controller, autostart } = withAutostart();
    controller.send(WORKING);
    controller.dispose();
    controller.handle('autostart');
    expect(autostart.calls).toEqual([]);
  });
});


describe('TrayController sound', () => {
  function withSound(prefs = new FakeSoundPrefs()) {
    const tray = new FakeTray();
    const controller = new TrayController(tray, new FakeTrayActions(), (ms) => `T${ms}`, {
      sound: prefs,
    });
    return { tray, controller, prefs };
  }

  const item = (tray: FakeTray, id: string) => {
    for (const entry of tray.menu.items) {
      if (entry.kind === 'item' && entry.id === id) return entry;
      if (entry.kind === 'submenu') {
        const child = entry.items.find((sub) => sub.kind === 'item' && sub.id === id);
        if (child?.kind === 'item') return child;
      }
    }
    return undefined;
  };

  it('has no sound items without a port', () => {
    const { tray, controller } = setup();
    controller.send(WORKING);
    expect(item(tray, 'mute')).toBeUndefined();
  });

  it('shows the current choices', () => {
    const { tray, controller } = withSound(new FakeSoundPrefs({ muted: true, volume: 'low' }));
    controller.send(WORKING);
    expect(item(tray, 'mute')?.checked).toBe(true);
    expect(item(tray, 'volume-low')?.checked).toBe(true);
    expect(item(tray, 'volume-high')?.checked).toBe(false);
  });

  it('Mute toggles mute, keeps the volume, and the menu shows it at once', () => {
    const { tray, controller, prefs } = withSound(new FakeSoundPrefs({ muted: false, volume: 'high' }));
    controller.send(WORKING);

    tray.click('mute');
    expect(prefs.changes).toEqual([{ muted: true, volume: 'high' }]);
    expect(item(tray, 'mute')?.checked).toBe(true);

    tray.click('mute');
    expect(prefs.prefs).toEqual({ muted: false, volume: 'high' });
    expect(item(tray, 'mute')?.checked).toBe(false);
  });

  it.each([
    ['volume-low', 'low'],
    ['volume-medium', 'medium'],
    ['volume-high', 'high'],
  ] as const)('%s sets the volume to %s and keeps mute', (id, volume) => {
    const { tray, controller, prefs } = withSound(new FakeSoundPrefs({ muted: true, volume: 'medium' }));
    controller.send(WORKING);

    tray.click(id);

    expect(prefs.prefs).toEqual({ muted: true, volume });
    expect(item(tray, id)?.checked).toBe(true);
  });

  it('keeps the phase text after a change', () => {
    const { tray, controller } = withSound();
    controller.send(warning(10));
    tray.click('mute');
    expect(tray.labels[0]).toBe('Rest starting soon');
  });

  it('ignores a click before the first snapshot and after dispose', () => {
    const early = withSound();
    early.controller.handle('mute');
    expect(early.prefs.changes).toEqual([]);

    const late = withSound();
    late.controller.send(WORKING);
    late.controller.dispose();
    late.controller.handle('mute');
    expect(late.prefs.changes).toEqual([]);
  });

  it('does nothing for a sound click when no port is wired', () => {
    const { controller } = setup();
    controller.send(WORKING);
    expect(() => controller.handle('mute')).not.toThrow();
  });
});


describe('TrayController theme', () => {
  function withTheme(theme = new FakeThemePort()) {
    const tray = new FakeTray();
    const controller = new TrayController(tray, new FakeTrayActions(), (ms) => `T${ms}`, { theme });
    return { tray, controller, theme };
  }

  const checkedThemes = (tray: FakeTray) => {
    const menu = tray.menu.items.find((entry) => entry.kind === 'submenu' && entry.label === 'Theme');
    if (menu?.kind !== 'submenu') return [];
    return menu.items.flatMap((entry) => (entry.kind === 'item' && entry.checked ? [entry.id] : []));
  };

  it('has no Theme submenu without a port', () => {
    const { tray, controller } = setup();
    controller.send(WORKING);
    expect(checkedThemes(tray)).toEqual([]);
    expect(tray.menu.items.some((entry) => entry.kind === 'submenu')).toBe(false);
  });

  it('shows the current choice', () => {
    const { tray, controller } = withTheme(new FakeThemePort('dark'));
    controller.send(WORKING);
    expect(checkedThemes(tray)).toEqual(['theme-dark']);
  });

  it.each([
    ['theme-light', 'light'],
    ['theme-dark', 'dark'],
    ['theme-system', 'system'],
  ] as const)('%s sets the theme to %s and the menu shows it at once', (id, theme) => {
    const { tray, controller, theme: port } = withTheme(
      new FakeThemePort(theme === 'dark' ? 'light' : 'dark'),
    );
    controller.send(WORKING);

    tray.click(id);

    expect(port.changes).toEqual([theme]);
    expect(checkedThemes(tray)).toEqual([id]);
  });

  it('keeps the phase text after a change', () => {
    const { tray, controller } = withTheme();
    controller.send(warning(10));
    tray.click('theme-dark');
    expect(tray.labels[0]).toBe('Rest starting soon');
  });

  it('ignores a click before the first snapshot, after dispose, and with no port', () => {
    const early = withTheme();
    early.controller.handle('theme-dark');
    expect(early.theme.changes).toEqual([]);

    const late = withTheme();
    late.controller.send(WORKING);
    late.controller.dispose();
    late.controller.handle('theme-dark');
    expect(late.theme.changes).toEqual([]);

    const bare = setup();
    bare.controller.send(WORKING);
    expect(() => bare.controller.handle('theme-dark')).not.toThrow();
  });
});

describe('TrayController eye exercises', () => {
  function withExercises(exercises = new FakeExercisesPort()) {
    const tray = new FakeTray();
    const controller = new TrayController(tray, new FakeTrayActions(), (ms) => `T${ms}`, {
      exercises,
    });
    return { tray, controller, exercises };
  }

  const item = (tray: FakeTray) =>
    tray.menu.items.find((entry) => entry.kind === 'item' && entry.id === 'exercises');

  it('has no item without a port', () => {
    const { tray, controller } = setup();
    controller.send(WORKING);
    expect(item(tray)).toBeUndefined();
  });

  it('shows the current choice', () => {
    const { tray, controller } = withExercises(new FakeExercisesPort(false));
    controller.send(WORKING);
    expect(item(tray)).toMatchObject({ checked: false });
  });

  it('a click flips the switch and the checkbox follows at once', () => {
    const { tray, controller, exercises } = withExercises();
    controller.send(WORKING);

    tray.click('exercises');
    expect(exercises.changes).toEqual([false]);
    expect(item(tray)).toMatchObject({ checked: false });

    tray.click('exercises');
    expect(exercises.changes).toEqual([false, true]);
    expect(item(tray)).toMatchObject({ checked: true });
  });

  it('ignores a click before the first snapshot, after dispose, and with no port', () => {
    const early = withExercises();
    early.controller.handle('exercises');
    expect(early.exercises.changes).toEqual([]);

    const late = withExercises();
    late.controller.send(WORKING);
    late.controller.dispose();
    late.controller.handle('exercises');
    expect(late.exercises.changes).toEqual([]);

    const bare = setup();
    bare.controller.send(WORKING);
    expect(() => bare.controller.handle('exercises')).not.toThrow();
  });
});
