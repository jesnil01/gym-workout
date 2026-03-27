import { describe, expect, it } from 'vitest';
import { parsePaceMmSs } from './utils';

describe('parsePaceMmSs', () => {
  it('parses M:SS to decimal minutes per km', () => {
    expect(parsePaceMmSs('5:10')).toBeCloseTo(5 + 10 / 60, 10);
    expect(parsePaceMmSs('12:00')).toBe(12);
    expect(parsePaceMmSs('0:45')).toBeCloseTo(0.75, 10);
  });

  it('trims whitespace', () => {
    expect(parsePaceMmSs('  5:10  ')).toBeCloseTo(5 + 10 / 60, 10);
  });

  it('returns null for empty input', () => {
    expect(parsePaceMmSs('')).toBeNull();
    expect(parsePaceMmSs('   ')).toBeNull();
  });

  it('returns null without exactly one colon', () => {
    expect(parsePaceMmSs('5')).toBeNull();
    expect(parsePaceMmSs('5.5')).toBeNull();
    expect(parsePaceMmSs('1:2:3')).toBeNull();
  });

  it('returns null for non-integer minute or second parts', () => {
    expect(parsePaceMmSs('5.5:10')).toBeNull();
    expect(parsePaceMmSs('5:10.5')).toBeNull();
  });

  it('returns null for seconds out of range', () => {
    expect(parsePaceMmSs('5:60')).toBeNull();
  });

  it('returns null for zero pace', () => {
    expect(parsePaceMmSs('0:00')).toBeNull();
  });
});
