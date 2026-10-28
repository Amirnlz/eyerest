import { describe, expect, it } from 'vitest';
import { TrayController } from '../../src/main/tray/tray-controller';
import { IDLE, WORKING, resting, warning } from '../helpers/fake-api';
import { FakeTray, FakeTrayActions } from '../helpers/fake-lifecycle';

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
      expect(tray.labels).toEqual(['Next rest at T20000', 'Pause reminders', 'Quit']);
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
      expect(tray.labels).toEqual(['Paused', 'Resume reminders', 'Quit']);
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

      expect(tray.destroyed).toBe(1);
      expect(tray.menus).toHaveLength(1);
      expect(actions.calls).toEqual([]);
    });
  });
});
