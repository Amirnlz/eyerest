import type { ReactNode } from 'react';
import './ProgressRing.css';

export type ProgressRingSize = 'sm' | 'md' | 'lg';

/** The drawing is a 100 by 100 viewBox, so every length below is in user units, not pixels. */
export const RING_VIEWBOX = 100;
export const RING_RADIUS = 45;
export const RING_STROKE = 8;

/** Clamp to 0..100. Non-finite input becomes 0. */
export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}

/** Share of the period still left, 0..100. A period of zero or less counts as finished. */
export function percentRemaining(
  secondsRemaining: number,
  totalSeconds: number,
): number {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return 0;
  return clampPercent((secondsRemaining / totalSeconds) * 100);
}

export interface RingGeometry {
  readonly percent: number;
  readonly circumference: number;
  /** Length of the gap in the dash pattern: 0 draws the full ring, the circumference draws none. */
  readonly dashOffset: number;
}

export function ringGeometry(percent: number): RingGeometry {
  const clamped = clampPercent(percent);
  const circumference = 2 * Math.PI * RING_RADIUS;
  return {
    percent: clamped,
    circumference,
    dashOffset: circumference * (1 - clamped / 100),
  };
}

export function ringClassName(size: ProgressRingSize): string {
  return ['er-ring', `er-ring--${size}`].join(' ');
}

export interface ProgressRingProps {
  /** How full the ring is, 0 to 100. Out-of-range values are clamped. */
  readonly percent: number;
  readonly size?: ProgressRingSize;
  /**
   * Accessible name. Without it the ring is decorative and hidden from assistive tech, which is
   * right when a Countdown beside it already states the time. With it, the drawing is exposed as
   * a progressbar.
   */
  readonly label?: string;
  /** Centered over the ring, for example a Countdown. */
  readonly children?: ReactNode;
}

/** Circular progress. The arc starts at the top and runs clockwise. */
export function ProgressRing({
  percent,
  size = 'md',
  label,
  children,
}: ProgressRingProps) {
  const { percent: value, circumference, dashOffset } = ringGeometry(percent);
  const labelled =
    label === undefined
      ? ({ 'aria-hidden': true } as const)
      : ({
        role: 'progressbar',
        'aria-label': label,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-valuenow': Math.round(value),
      } as const);

  return (
    <div className={ringClassName(size)}>
      <svg
        className="er-ring__svg"
        viewBox={`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`}
        focusable="false"
        {...labelled}
      >
        <circle
          className="er-ring__track"
          cx={RING_VIEWBOX / 2}
          cy={RING_VIEWBOX / 2}
          r={RING_RADIUS}
          strokeWidth={RING_STROKE}
          fill="none"
        />
        <circle
          className="er-ring__progress"
          cx={RING_VIEWBOX / 2}
          cy={RING_VIEWBOX / 2}
          r={RING_RADIUS}
          strokeWidth={RING_STROKE}
          fill="none"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: dashOffset,
          }}
        />
      </svg>
      {children === undefined ? null : (
        <div className="er-ring__content">{children}</div>
      )}
    </div>
  );
}
