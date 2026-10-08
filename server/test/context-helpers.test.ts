import { describe, it, expect } from 'vitest';
import { cutAtBytes } from '../src/modules/context/helpers.js';

const MARKER = '\n\n[… document cut at 256 KB]';

// SPEC-01 AC-5: previews are cut by UTF-8 bytes, never inside a character.
describe('cutAtBytes', () => {
  it('AC-5: leaves text within the limit alone', () => {
    expect(cutAtBytes('short', 10)).toBe('short');
  });

  it('AC-5: steps back to a character boundary instead of splitting a multi-byte character', () => {
    // '€' is 3 bytes: 10 bytes would end one byte into the fourth character.
    const out = cutAtBytes('€'.repeat(100), 10);
    expect(out).toBe('€€€' + MARKER);
    expect(out).not.toContain('\uFFFD');
  });

  it('AC-5: keeps exactly the limit when it falls on a boundary', () => {
    expect(cutAtBytes('ab'.repeat(10), 6)).toBe('ababab' + MARKER);
  });
});
