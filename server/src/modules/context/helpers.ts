import { DOC_CUT_MARKER } from './constants.js';

/** The first `max` bytes of UTF-8 text, never ending inside a character, plus the cut marker. */
export function cutAtBytes(text: string, max: number): string {
  const bytes = Buffer.from(text, 'utf8');
  if (bytes.length <= max) return text;
  // A UTF-8 continuation byte is 10xxxxxx: step back to the start of the character it belongs to.
  let end = max;
  while (end > 0 && (bytes[end]! & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end).toString('utf8') + DOC_CUT_MARKER;
}
