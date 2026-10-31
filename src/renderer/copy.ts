/**
 * All user-facing text lives here. Components and the view model never
 * hard-code strings, which keeps wording changes (and later localization)
 * in one place.
 */
export const copy = {
  warning: {
    title: 'Eye rest starting soon',
    message: 'Finish what you are doing. Your rest starts when the countdown ends.',
  },
  rest: {
    eye: {
      title: 'Rest your eyes',
      message: 'Look away from the screen and slowly rotate your eyes.',
    },
    long: {
      title: 'Take a longer break',
      message: 'Stand up, stretch and rest away from the screen.',
    },
  },
  actions: {
    skip: 'Skip',
    postpone: 'Postpone',
  },
  settings: {
    title: 'Settings',
    windowTitle: 'eyerest settings',
    restartNote: 'Saving restarts the work timer. A paused app stays paused.',
    groups: {
      work: 'Work',
      rest: 'Rests',
      postpone: 'Postpone',
    },
    fields: {
      workIntervalMs: {
        label: 'Work interval',
        hint: 'How long you work before a rest.',
        unit: 'minutes',
      },
      warningMs: {
        label: 'Heads-up',
        hint: 'The countdown shown before a rest starts.',
        unit: 'seconds',
      },
      eyeRestMs: {
        label: 'Eye rest',
        hint: 'The length of a regular rest.',
        unit: 'seconds',
      },
      longRestMs: {
        label: 'Long rest',
        hint: 'The length of the longer rest.',
        unit: 'minutes',
      },
      cyclesBeforeLongRest: {
        label: 'Long rest every',
        hint: 'Every Nth rest is a long rest.',
        unit: 'rests',
      },
      postponeMs: {
        label: 'Postpone by',
        hint: 'How far Postpone moves the next rest.',
        unit: 'minutes',
      },
    },
    actions: {
      save: 'Save',
      saving: 'Saving',
      restoreDefaults: 'Restore defaults',
    },
    status: {
      loading: 'Loading settings.',
      loadFailed: 'Could not load settings.',
      saved: 'Settings saved.',
      saveFailed: 'Could not save settings. Try again.',
      fixErrors: 'Fix the highlighted fields to save.',
    },
    errors: {
      required: 'Enter a number.',
      positive: 'Must be greater than 0.',
      wholeNumber: 'Must be a whole number, 1 or more.',
      warningTooLong: 'Must be shorter than the work interval.',
      tooLarge: 'Too large.',
    },
  },
  /** Spoken to screen readers at milestones only, never every second. */
  announcements: {
    warning: (duration: string) => `Eye rest starts in ${duration}.`,
    restStart: (title: string, duration: string) => `${title} for ${duration}.`,
    restEnding: (duration: string) => `${duration} left.`,
  },
  /** Unit words for spoken durations. The plural is an "s" suffix, which is English only. */
  units: {
    second: 'second',
    minute: 'minute',
  },
} as const;
