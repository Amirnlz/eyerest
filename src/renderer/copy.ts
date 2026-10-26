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
} as const;
