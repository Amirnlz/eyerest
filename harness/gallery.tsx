/**
 * Component gallery: every primitive in every state, in one page. Dev only, not shipped.
 * Open `/gallery.html?theme=light|dark|system` on the harness server (`npm run dev:renderer`).
 * Playwright reads computed styles from this page (`npm run e2e:gallery`), which jsdom cannot.
 * Every item has a `data-testid` so a test can find it by name.
 */
import { StrictMode, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import 'virtual:eyerest-design.css';
import './gallery.css';
import type { Snapshot } from '../src/core/scheduler';
import { loadBundledFonts } from '../src/renderer/fonts-bootstrap';
import { Overlay } from '../src/renderer/components/Overlay';
import { toOverlayViewModel } from '../src/renderer/view-model';
import {
  createDomThemeController,
  isThemePreference,
} from '../src/renderer/theme';
import {
  Button,
  Countdown,
  Icon,
  Photo,
  ProgressRing,
  Surface,
  Text,
  iconNames,
  type ButtonSize,
  type IconSize,
  type ButtonVariant,
  type SurfacePadding,
  type SurfaceRadius,
  type TextTone,
  type TextVariant,
} from '../src/renderer/ui';
import { OVERLAY_SIZE } from '../src/shared/overlay-layout';

const requestedTheme = new URLSearchParams(window.location.search).get('theme');
createDomThemeController(
  window,
  isThemePreference(requestedTheme) ? requestedTheme : 'system',
).start();
void loadBundledFonts();

const variants: readonly ButtonVariant[] = ['primary', 'secondary', 'quiet'];
const sizes: readonly ButtonSize[] = ['sm', 'md'];
const textVariants: readonly TextVariant[] = ['display', 'title', 'body', 'label', 'caption'];
const tones: readonly TextTone[] = ['primary', 'secondary'];
const iconSizes: readonly IconSize[] = ['sm', 'md', 'lg'];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="gallery__section" data-testid={`section-${id}`} aria-labelledby={`h-${id}`}>
      <h2 className="gallery__title" id={`h-${id}`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Buttons() {
  return (
    <Section id="buttons" title="Button">
      {variants.flatMap((variant) =>
        sizes.map((size) => {
          const key = `${variant}-${size}`;
          return (
            <div className="gallery__row" key={key}>
              <Button data-testid={`button-${key}-default`} variant={variant} size={size}>
                Skip
              </Button>
              <Button data-testid={`button-${key}-disabled`} variant={variant} size={size} disabled>
                Skip
              </Button>
              <Button data-testid={`button-${key}-icon-start`} variant={variant} size={size} icon="skip">
                Skip
              </Button>
              <Button
                data-testid={`button-${key}-icon-end`}
                variant={variant}
                size={size}
                icon="postpone"
                iconPosition="end"
              >
                Postpone
              </Button>
              <Button data-testid={`button-${key}-static`} variant={variant} size={size} static>
                Static
              </Button>
            </div>
          );
        }),
      )}
    </Section>
  );
}

/** The concentric-radius cases from docs/design-system.md section 8. */
function Concentric() {
  const well = (radius: SurfaceRadius, padding: SurfacePadding, id: string) => (
    <div data-testid={id}>
      <Surface elevation="flat" radius={radius} padding={padding}>
        <Button>Skip</Button>
      </Surface>
    </div>
  );
  return (
    <Section id="concentric" title="Concentric radius">
      <div className="gallery__row">
        {well('md', 'xs', 'concentric-md-xs')}
        {well('lg', 'sm', 'concentric-lg-sm')}
        {well('sm', 'xs', 'concentric-sm-xs')}
        {well('lg', 'md', 'concentric-lg-md')}
        <div data-testid="concentric-nested-panel-well">
          <Surface elevation="flat" radius="lg" padding="md">
            <Surface elevation="flat" radius="md" padding="xs">
              <Button>Skip</Button>
            </Surface>
          </Surface>
        </div>
        <div data-testid="concentric-nested-well-panel">
          <Surface elevation="flat" radius="lg" padding="xs">
            <Surface elevation="flat" radius="lg" padding="md">
              <Button>Skip</Button>
            </Surface>
          </Surface>
        </div>
      </div>
    </Section>
  );
}

function Surfaces() {
  const elevations = ['flat', 'raised-sm', 'raised-md', 'raised-lg', 'inset-sm', 'inset-md'] as const;
  return (
    <Section id="surfaces" title="Surface">
      <div className="gallery__row">
        {elevations.map((elevation) => (
          <div data-testid={`surface-${elevation}`} key={elevation}>
            <Surface elevation={elevation}>
              <Text variant="label">{elevation}</Text>
            </Surface>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Typography() {
  return (
    <Section id="text" title="Text">
      {textVariants.map((variant) => (
        <div className="gallery__row" key={variant}>
          {tones.map((tone) => (
            <Text key={tone} data-testid={`text-${variant}-${tone}`} variant={variant} tone={tone}>
              {variant} {tone} 0123456789
            </Text>
          ))}
        </div>
      ))}
    </Section>
  );
}

function Numbers() {
  return (
    <Section id="numbers" title="Countdown and ProgressRing">
      <div className="gallery__row">
        <div data-testid="countdown-20">
          <Countdown seconds={20} />
        </div>
        <div data-testid="countdown-600">
          <Countdown seconds={600} />
        </div>
        {([0, 25, 50, 100] as const).map((percent) => (
          <div data-testid={`ring-${percent}`} key={percent}>
            <ProgressRing percent={percent} size="md" />
          </div>
        ))}
        {(['sm', 'md', 'lg'] as const).map((size) => (
          <div data-testid={`ring-size-${size}`} key={size}>
            <ProgressRing percent={50} size={size}>
              <Countdown seconds={10} />
            </ProgressRing>
          </div>
        ))}
      </div>
    </Section>
  );
}

function Icons() {
  return (
    <Section id="icons" title="Icon">
      {iconNames.map((name) => (
        <div className="gallery__row" key={name}>
          {iconSizes.map((size) => (
            <span data-testid={`icon-${name}-${size}`} key={size}>
              <Icon name={name} size={size} />
            </span>
          ))}
          <span data-testid={`icon-${name}-fill`}>
            <Icon name={name} variant="fill" />
          </span>
        </div>
      ))}
    </Section>
  );
}

const photoSource = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64"><rect width="96" height="64" fill="#8a8a8a"/></svg>',
)}`;

function Photos() {
  return (
    <Section id="photos" title="Photo">
      <div className="gallery__row">
        <Photo data-testid="photo-default" src={photoSource} alt="Grey photograph" width={96} height={64} />
        <Photo data-testid="photo-artwork" src={photoSource} alt="Grey artwork" artwork width={96} height={64} />
      </div>
    </Section>
  );
}

const frames: readonly { readonly id: string; readonly snapshot: Snapshot }[] = [
  {
    id: 'warning',
    snapshot: { state: { phase: 'warning', restAt: 0, restsDone: 0 }, secondsRemaining: 15 },
  },
  {
    id: 'eye-rest',
    snapshot: { state: { phase: 'resting', kind: 'eye', endsAt: 0, restsDone: 0 }, secondsRemaining: 20 },
  },
  {
    id: 'long-rest',
    snapshot: { state: { phase: 'resting', kind: 'long', endsAt: 0, restsDone: 2 }, secondsRemaining: 600 },
  },
];

/** The real overlay in a frame of the real window size, to see whether its content fits. */
function Overlays() {
  return (
    <Section id="overlay" title="Overlay at window size">
      <div className="gallery__row">
        {frames.map(({ id, snapshot }) => (
          <div
            className="gallery__frame"
            data-testid={`frame-${id}`}
            key={id}
            style={{ inlineSize: OVERLAY_SIZE.width, blockSize: OVERLAY_SIZE.height }}
          >
            <Overlay viewModel={toOverlayViewModel(snapshot)} onSkip={() => undefined} onPostpone={() => undefined} />
          </div>
        ))}
      </div>
    </Section>
  );
}

function Gallery() {
  return (
    <main className="gallery">
      <h1 className="gallery__title">eyerest component gallery</h1>
      <Buttons />
      <Concentric />
      <Surfaces />
      <Typography />
      <Numbers />
      <Icons />
      <Photos />
      <Overlays />
    </main>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('Missing #root element');

createRoot(container).render(
  <StrictMode>
    <Gallery />
  </StrictMode>,
);
