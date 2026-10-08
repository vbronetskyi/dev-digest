/** SPEC-01 AC-5: a previewed document is cut at 256 KB of UTF-8, counted in bytes. */
export const MAX_DOC_BYTES = 256 * 1024;
export const DOC_CUT_MARKER = '\n\n[… document cut at 256 KB]';
