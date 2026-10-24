import { describe, expect, it } from 'vitest';
import { parseDateOnly } from './date-only';

describe('parseDateOnly', () => {
  it('preserves the selected calendar day for date-only and API timestamp values', () => {
    for (const value of ['2026-10-31', '2026-10-31T00:00:00.000Z']) {
      const date = parseDateOnly(value);
      expect(date?.getFullYear()).toBe(2026);
      expect(date?.getMonth()).toBe(9);
      expect(date?.getDate()).toBe(31);
    }
  });

  it('rejects invalid calendar dates', () => {
    expect(parseDateOnly('2026-02-30')).toBeUndefined();
    expect(parseDateOnly('')).toBeUndefined();
  });
});
