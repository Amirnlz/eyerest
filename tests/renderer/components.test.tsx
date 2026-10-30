// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { chunkClassName } from '../../src/renderer/components/OverlayPanel';
import { RestPanel } from '../../src/renderer/components/RestPanel';
import { WarningNotice } from '../../src/renderer/components/WarningNotice';
import type { RestViewModel, WarningViewModel } from '../../src/renderer/view-model';

const warningVm: WarningViewModel = {
  mode: 'warning',
  title: 'Eye rest starting soon',
  message: 'Finish what you are doing.',
  seconds: 15,
  countdown: '15',
};

const restVm: RestViewModel = {
  mode: 'rest',
  kind: 'eye',
  title: 'Rest your eyes',
  message: 'Look away from the screen.',
  seconds: 20,
  countdown: '20',
  skipLabel: 'Skip',
  postponeLabel: 'Postpone',
};

describe('WarningNotice', () => {
  it('shows title, message and countdown', () => {
    render(<WarningNotice viewModel={warningVm} />);
    expect(screen.getByRole('heading', { name: warningVm.title })).toBeInTheDocument();
    expect(screen.getByText(warningVm.message)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('15');
  });

  it('is a labelled region named after its title', () => {
    render(<WarningNotice viewModel={warningVm} />);
    expect(screen.getByRole('region', { name: warningVm.title })).toBeInTheDocument();
  });

  it('has no buttons', () => {
    render(<WarningNotice viewModel={warningVm} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('updates the countdown when props change', () => {
    const { rerender } = render(<WarningNotice viewModel={warningVm} />);
    rerender(<WarningNotice viewModel={{ ...warningVm, seconds: 14, countdown: '14' }} />);
    expect(screen.getByRole('timer')).toHaveTextContent('14');
  });
});

describe('RestPanel', () => {
  it('shows title, message and countdown', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    expect(screen.getByRole('heading', { name: restVm.title })).toBeInTheDocument();
    expect(screen.getByText(restVm.message)).toBeInTheDocument();
    expect(screen.getByRole('timer')).toHaveTextContent('20');
  });

  it('shows both action buttons with the labels from the view model', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Skip' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Postpone' })).toBeEnabled();
  });

  it('calls onSkip once when Skip is clicked, and nothing else', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    const user = userEvent.setup();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={onPostpone} />);

    await user.click(screen.getByRole('button', { name: 'Skip' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onPostpone).not.toHaveBeenCalled();
  });

  it('calls onPostpone once when Postpone is clicked, and nothing else', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    const user = userEvent.setup();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={onPostpone} />);

    await user.click(screen.getByRole('button', { name: 'Postpone' }));

    expect(onPostpone).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('can be operated with the keyboard', async () => {
    const onSkip = vi.fn();
    const onPostpone = vi.fn();
    const user = userEvent.setup();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={onPostpone} />);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onSkip).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(screen.getByRole('button', { name: 'Postpone' })).toHaveFocus();
    await user.keyboard(' ');
    expect(onPostpone).toHaveBeenCalledTimes(1);
  });

  it('updates the countdown when props change', () => {
    const { rerender } = render(
      <RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />,
    );
    rerender(
      <RestPanel
        viewModel={{ ...restVm, seconds: 19, countdown: '19' }}
        onSkip={vi.fn()}
        onPostpone={vi.fn()}
      />,
    );
    expect(screen.getByRole('timer')).toHaveTextContent('19');
  });
});

describe('overlay components are built from design-system primitives', () => {
  it('WarningNotice: a Surface region, a title-role h2, a Countdown, no inline styles', () => {
    const { container } = render(<WarningNotice viewModel={warningVm} />);
    const region = screen.getByRole('region', { name: warningVm.title });
    expect(region).toHaveClass('er-surface');
    expect(screen.getByRole('heading', { level: 2 })).toHaveClass('er-text--title');
    expect(screen.getByRole('timer')).toHaveClass('er-countdown');
    expect(container.querySelector('[style]')).toBeNull();
  });

  it('RestPanel: Button primitives with icons, decorative, no inline styles', () => {
    const { container } = render(
      <RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />,
    );
    const skip = screen.getByRole('button', { name: 'Skip' });
    const postpone = screen.getByRole('button', { name: 'Postpone' });
    expect(skip).toHaveClass('er-button', 'er-button--quiet', 'er-button--sm', 'er-button--icon-start');
    expect(postpone).toHaveClass('er-button', 'er-button--secondary', 'er-button--sm');
    expect(skip.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(postpone.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('[style]')).toBeNull();
  });

  it('keeps the countdown before the actions in the footer, so reading order is time then choices', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    const timer = screen.getByRole('timer');
    const skip = screen.getByRole('button', { name: 'Skip' });
    expect(timer.compareDocumentPosition(skip) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows the long rest countdown as m:ss through Countdown', () => {
    render(
      <RestPanel
        viewModel={{ ...restVm, kind: 'long', seconds: 600, countdown: '10:00' }}
        onSkip={vi.fn()}
        onPostpone={vi.fn()}
      />,
    );
    expect(screen.getByRole('timer')).toHaveTextContent('10:00');
  });

  it('keeps wording out of the components: no inline style and no raw button in their source', () => {
    const dir = join(__dirname, '../../src/renderer/components');
    const sources = readdirSync(dir).filter((f) => f.endsWith('.tsx'));
    expect(sources).toEqual(
      expect.arrayContaining(['Overlay.tsx', 'OverlayPanel.tsx', 'RestPanel.tsx', 'WarningNotice.tsx']),
    );
    for (const file of sources) {
      const source = readFileSync(join(dir, file), 'utf8');
      expect(source, file).not.toMatch(/\bstyle=/);
      expect(source, file).not.toMatch(/<button\b/);
    }
  });
});

describe('OverlayPanel.css contract', () => {
  const css = readFileSync(
    join(__dirname, '../../src/renderer/components/OverlayPanel.css'),
    'utf8',
  );

  it('fills its container and lets the footer wrap instead of overflowing', () => {
    expect(css).toMatch(/\.er-overlay-panel\s*\{[^}]*block-size:\s*100%/);
    expect(css).toMatch(/\.er-overlay-panel__footer\s*\{[^}]*flex-wrap:\s*wrap/);
  });

  it('spaces everything with space tokens', () => {
    const gaps = css.match(/gap:[^;]*;/g) ?? [];
    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) expect(gap).toMatch(/var\(--er-space-\d+\)/);
  });
});

describe('OverlayPanel entrance chunks (M7)', () => {
  it('maps a chunk index to its class', () => {
    expect(chunkClassName(0)).toBe('er-overlay-panel__chunk er-overlay-panel__chunk--0');
    expect(chunkClassName(2)).toBe('er-overlay-panel__chunk er-overlay-panel__chunk--2');
  });

  it('splits into title, message and footer chunks, in that order', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    const title = screen.getByRole('heading').closest('.er-overlay-panel__chunk');
    const message = screen.getByText(restVm.message).closest('.er-overlay-panel__chunk');
    const footer = screen.getByRole('timer').closest('.er-overlay-panel__chunk');
    expect(title).toHaveClass('er-overlay-panel__chunk--0');
    expect(message).toHaveClass('er-overlay-panel__chunk--1');
    expect(footer).toHaveClass('er-overlay-panel__chunk--2');
  });

  it('puts the actions in the last chunk, so the choices arrive after the time', () => {
    render(<RestPanel viewModel={restVm} onSkip={vi.fn()} onPostpone={vi.fn()} />);
    const footer = screen.getByRole('timer').closest('.er-overlay-panel__chunk--2');
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Skip' }));
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Postpone' }));
  });

  it('chunks the warning the same way, without actions', () => {
    const { container } = render(<WarningNotice viewModel={warningVm} />);
    expect(container.querySelectorAll('.er-overlay-panel__chunk')).toHaveLength(3);
  });

  it('keeps every control reachable and enabled while the entrance runs', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<RestPanel viewModel={restVm} onSkip={onSkip} onPostpone={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('OverlayPanel.css entrance contract (better-ui)', () => {
  const css = readFileSync(
    join(__dirname, '../../src/renderer/components/OverlayPanel.css'),
    'utf8',
  );

  it('animates a chunk over the base duration with ease-out and fill both', () => {
    expect(css).toMatch(
      /\.er-overlay-panel__chunk\s*\{[^}]*animation:\s*er-overlay-panel-enter var\(--er-duration-base\) var\(--er-ease-out\) both;/,
    );
  });

  it('enters with opacity, a 12px rise and 4px blur from tokens, hidden state in the from keyframe', () => {
    const keyframes = /@keyframes er-overlay-panel-enter\s*\{\s*from\s*\{([^}]*)\}/.exec(css);
    expect(keyframes?.[1]).toContain('opacity: 0;');
    expect(keyframes?.[1]).toContain('translate: 0 var(--er-motion-enter-offset);');
    expect(keyframes?.[1]).toContain('filter: blur(var(--er-motion-blur));');
  });

  it('never hides a chunk in a base rule, so a chunk without animation stays visible', () => {
    const base = css.replace(/@keyframes[\s\S]*?\n\}\n/, '');
    expect(base).not.toMatch(/opacity:\s*0/);
  });

  it('staggers chunks 0, 1 and 2 by whole stagger tokens', () => {
    expect(css).toMatch(/--0\s*\{\s*animation-delay:\s*0ms;/);
    expect(css).toMatch(/--1\s*\{\s*animation-delay:\s*var\(--er-motion-stagger\);/);
    expect(css).toMatch(/--2\s*\{\s*animation-delay:\s*calc\(var\(--er-motion-stagger\) \* 2\);/);
  });

  it('does not animate on hover or toggled state, and has no exit animation', () => {
    expect(css).not.toMatch(/:hover[^{]*\{[^}]*animation/);
    expect(css).not.toMatch(/@keyframes[^{]*exit/i);
  });
});
