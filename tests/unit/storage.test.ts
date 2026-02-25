import { beforeEach, describe, expect, it } from 'vitest';
import { storage } from '../../utils/storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('writes and reads JSON values', () => {
    const payload = { id: 'p1', qty: 2 };
    storage.set('cart', payload);
    expect(storage.get('cart', null)).toEqual(payload);
  });

  it('returns fallback when value is missing', () => {
    expect(storage.get('missing', 'fallback')).toBe('fallback');
  });

  it('returns fallback for invalid json', () => {
    localStorage.setItem('broken', '{not-json');
    expect(storage.get('broken', { ok: false })).toEqual({ ok: false });
  });

  it('removes values safely', () => {
    storage.set('lang', 'uz');
    storage.remove('lang');
    expect(localStorage.getItem('lang')).toBeNull();
  });
});

