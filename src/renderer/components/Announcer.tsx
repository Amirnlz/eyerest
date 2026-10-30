import { VisuallyHidden } from '../ui';

export interface AnnouncerProps {
  /** Spoken when it changes. Empty text says nothing. */
  readonly text: string;
}

/**
 * Polite live region for milestone announcements. `role="status"` is polite and atomic, so a
 * screen reader reads the whole sentence without interrupting what it is already saying.
 */
export function Announcer({ text }: AnnouncerProps) {
  return <VisuallyHidden role="status">{text}</VisuallyHidden>;
}
