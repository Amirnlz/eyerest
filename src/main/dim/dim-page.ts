/**
 * The page every dim window shows. A static data URL: no scripts, no remote
 * content, no preload. The window is transparent; the page paints the gray.
 * Only opacity is animated, and only for fade-in. Hiding is immediate so Skip
 * and Postpone restore the screen at once.
 */

export const DIM_COLOR = 'rgba(32, 32, 32, 0.6)';
export const DIM_FADE_IN_MS = 200;
/** Class toggled on `<body>` by the adapter to start the fade-in. */
export const DIM_VISIBLE_CLASS = 'on';

export const DIM_PAGE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>eyerest dim</title>
<style>
html,body{margin:0;height:100%;overflow:hidden;background:transparent}
body{background:${DIM_COLOR};opacity:0;transition:opacity ${DIM_FADE_IN_MS}ms ease-out}
body.${DIM_VISIBLE_CLASS}{opacity:1}
@media (prefers-reduced-motion:reduce){body{transition:none}}
</style>
</head>
<body></body>
</html>`;

export const DIM_PAGE_URL = `data:text/html;charset=utf-8,${encodeURIComponent(DIM_PAGE_HTML)}`;
