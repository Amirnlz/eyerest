import { useId, type ReactNode } from 'react';
import { Countdown, Surface, Text } from '../ui';
import './OverlayPanel.css';

export interface OverlayPanelProps {
  readonly title: string;
  readonly message: string;
  /** Whole seconds left, shown by `Countdown`. */
  readonly seconds: number;
  /** Actions shown beside the countdown. Omit for an informational panel. */
  readonly children?: ReactNode;
}

/**
 * Shared layout of the overlay panel: a labelled region with title, message, countdown and an
 * optional action group. Built from design-system primitives only. All text arrives as props, so
 * wording stays in `copy.ts`.
 */
export function OverlayPanel({ title, message, seconds, children }: OverlayPanelProps) {
  const titleId = useId();

  return (
    <div className="er-overlay-panel">
      <Surface as="section" aria-labelledby={titleId}>
        <div className="er-overlay-panel__body">
          <div className="er-overlay-panel__text">
            <Text as="h2" id={titleId} variant="title">
              {title}
            </Text>
            <Text tone="secondary">{message}</Text>
          </div>
          <div className="er-overlay-panel__footer">
            <Countdown seconds={seconds} />
            {children === undefined ? null : (
              <div className="er-overlay-panel__actions">{children}</div>
            )}
          </div>
        </div>
      </Surface>
    </div>
  );
}
