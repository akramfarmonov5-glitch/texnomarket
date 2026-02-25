import { describe, expect, it } from 'vitest';
import { formatCurrency } from '../../utils/format';

describe('formatCurrency', () => {
  it('formats amount and appends som suffix', () => {
    const value = formatCurrency(15000000);
    expect(value.endsWith(" so'm")).toBe(true);
    expect(value.replace(/\D/g, '')).toBe('15000000');
  });

  it('formats zero without decimals', () => {
    const value = formatCurrency(0);
    expect(value.endsWith(" so'm")).toBe(true);
    expect(value.replace(/\D/g, '')).toBe('0');
  });
});

