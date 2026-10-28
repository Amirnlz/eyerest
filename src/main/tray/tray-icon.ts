/**
 * Placeholder tray icon: a 32x32 PNG (blue disc with a white centre), embedded
 * so it needs no asset pipeline and works unchanged in a packaged app.
 * Used at scale factor 2, so it renders as 16x16 points. The real icon comes
 * in Step 3.2.
 */
export const TRAY_ICON_SIZE = 32;
export const TRAY_ICON_SCALE_FACTOR = 2;

export const TRAY_ICON_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABAUlEQVR42t2X0QnDIBCGM5Mz+NQBMkCfXEboAIXuUt' +
  'whtA99rl2gUEKthiuEcjVnTLhrhR+CUe/z9PRsNrtTw6nm1wB0lI1yUT6qB3mos9BmcQAT1UUFojroUw2gYGZhphyM' +
  'MQugBfeGSvUwVhFAu4DhT7VUALXQzDFPKAqAW8H4eE9kAcyKxt8yOQBSqO2Pt3C+3sOjfw5K36muIERRAD3VeXu4DM' +
  'a+lfQvtSFAaAzATnXMGR9DEAAsBuCm3E4thOVwGICvnX2BFzwGkI39tNmoJbUlnAnyANiXgH0Tsoch+0HEfhSLuIzY' +
  'r2MRCQl7SiYiKRWRlot4mIh5mv3v6/gFNiHDkEzV5MUAAAAASUVORK5CYII=';

export const TRAY_ICON_DATA_URL = `data:image/png;base64,${TRAY_ICON_PNG_BASE64}`;
