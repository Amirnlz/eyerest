import { describe, expect, it } from 'vitest';
import {
  TRAY_ICON_DATA_URL,
  TRAY_ICON_PNG_BASE64,
  TRAY_ICON_SIZE,
} from '../../src/main/tray/tray-icon';

describe('placeholder tray icon', () => {
  const bytes = Buffer.from(TRAY_ICON_PNG_BASE64, 'base64');

  it('is a PNG', () => {
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('has the declared size (IHDR width and height)', () => {
    expect(bytes.readUInt32BE(16)).toBe(TRAY_ICON_SIZE);
    expect(bytes.readUInt32BE(20)).toBe(TRAY_ICON_SIZE);
  });

  it('is RGBA, so it has transparency', () => {
    expect(bytes[25]).toBe(6);
  });

  it('is a small data URL', () => {
    expect(TRAY_ICON_DATA_URL.startsWith('data:image/png;base64,')).toBe(true);
    expect(bytes.length).toBeLessThan(2_000);
  });
});
