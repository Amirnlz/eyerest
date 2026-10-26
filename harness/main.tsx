/**
 * Dev-only page for clicking through overlay states with fake snapshots.
 * Not shipped. Run with: npm run dev:renderer
 */
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { Snapshot } from '../src/core/scheduler';
import { Overlay, toOverlayViewModel } from '../src/renderer';

type Scenario = 'idle' | 'working' | 'warning' | 'eye-rest' | 'long-rest';

const scenarios: readonly { id: Scenario; label: string; max: number }[] = [
  { id: 'idle', label: 'Idle', max: 0 },
  { id: 'working', label: 'Working', max: 0 },
  { id: 'warning', label: 'Warning', max: 15 },
  { id: 'eye-rest', label: 'Eye rest', max: 20 },
  { id: 'long-rest', label: 'Long rest', max: 600 },
];

function buildSnapshot(scenario: Scenario, seconds: number): Snapshot {
  switch (scenario) {
    case 'idle':
      return { state: { phase: 'idle' }, secondsRemaining: null };
    case 'working':
      return { state: { phase: 'working', restAt: 0, restsDone: 0 }, secondsRemaining: null };
    case 'warning':
      return { state: { phase: 'warning', restAt: 0, restsDone: 0 }, secondsRemaining: seconds };
    case 'eye-rest':
      return {
        state: { phase: 'resting', kind: 'eye', endsAt: 0, restsDone: 0 },
        secondsRemaining: seconds,
      };
    case 'long-rest':
      return {
        state: { phase: 'resting', kind: 'long', endsAt: 0, restsDone: 2 },
        secondsRemaining: seconds,
      };
  }
}

function Harness() {
  const [scenario, setScenario] = useState<Scenario>('eye-rest');
  const [seconds, setSeconds] = useState(20);
  const [log, setLog] = useState<string[]>([]);

  const current = scenarios.find((s) => s.id === scenario);
  const max = current?.max ?? 0;

  const choose = (next: Scenario) => {
    const nextMax = scenarios.find((s) => s.id === next)?.max ?? 0;
    setScenario(next);
    setSeconds(nextMax);
  };

  const record = (intent: string) => setLog((entries) => [intent, ...entries].slice(0, 8));

  return (
    <main>
      <h1>eyerest harness</h1>

      <fieldset>
        <legend>Scenario</legend>
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={scenario === s.id}
            onClick={() => choose(s.id)}
          >
            {s.label}
          </button>
        ))}
      </fieldset>

      <label>
        Seconds remaining: {seconds}
        <input
          type="range"
          min={0}
          max={max}
          value={Math.min(seconds, max)}
          disabled={max === 0}
          onChange={(event) => setSeconds(Number(event.target.value))}
        />
      </label>

      <hr />

      <Overlay
        viewModel={toOverlayViewModel(buildSnapshot(scenario, seconds))}
        onSkip={() => record('skip')}
        onPostpone={() => record('postpone')}
      />

      <hr />

      <h2>Intents received</h2>
      <ol>
        {log.map((entry, index) => (
          <li key={`${entry}-${index}`}>{entry}</li>
        ))}
      </ol>
    </main>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);
