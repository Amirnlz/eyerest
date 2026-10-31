/**
 * The page every dim window shows. A static data URL: no scripts, no remote
 * content, no preload. The window is transparent; the page paints the scrim color.
 * Only opacity is animated, and only for fade-in. Hiding is immediate so Skip
 * and Postpone restore the screen at once.
 */

import { durations, easings } from '../../design/motion';
import { resolveToken, themes } from '../../design/tokens';

/**
 * The only dim color: the `scrim` token. The dim page has no theme, so the token must be the
 * same in both themes (tests/main/dim-page.test.ts enforces it). The integrated Wayland scrim in
 * the renderer reads the same token as `--er-color-scrim`.
 */
export const DIM_COLOR = resolveToken(themes.light.scrim);
/**
 * The fade-in is an enter, so it takes the `base` duration and `out` easing: the same values as
 * the overlay panel's entrance, which starts at the same moment. The page has no stylesheet access
 * to the CSS variables, so it reads the tokens here.
 */
export const DIM_FADE_IN_MS = durations.base;
export const DIM_FADE_EASING = easings.out;
/** Class toggled on `<body>` by the adapter to start the fade-in. */
export const DIM_VISIBLE_CLASS = 'on';

export const DIM_PAGE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>eyerest dim</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:transparent}
body{background:${DIM_COLOR};opacity:0;transition:opacity ${DIM_FADE_IN_MS}ms ${DIM_FADE_EASING}}
body.${DIM_VISIBLE_CLASS}{opacity:1}
@media (prefers-reduced-motion:reduce){body{transition:none}}
</style>
</head>
<body></body>
</html>`;

export const DIM_PAGE_URL = `data:text/html;charset=utf-8,${encodeURIComponent(DIM_PAGE_HTML)}`;
