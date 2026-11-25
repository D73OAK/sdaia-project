import { describe, expect, it } from 'vitest';
import { PRINT_HEIGHT_PX, PRINT_WIDTH_PX, fitZoom } from './printFit.js';

describe('printing one week per A4 landscape page', () => {
  it('knows the space inside the 10 mm margins', () => {
    expect(PRINT_WIDTH_PX).toBe(1046);
    expect(PRINT_HEIGHT_PX).toBe(718);
  });
  it('leaves a week that fits as it is', () => {
    expect(fitZoom(610, 687)).toBe(1);
  });
  it('shrinks a taller week so it fits, with a little room to spare', () => {
    const zoom = fitZoom(1127, 687);
    expect(zoom).toBeLessThan(687 / 1127);
    expect(zoom * 1127).toBeLessThanOrEqual(687);
    expect(zoom).toBeGreaterThan(0.55);
  });
});
