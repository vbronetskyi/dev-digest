/** Skill import and versioning constants. */

/** A body this long is still allowed, but the preview warns about its prompt cost. */
export const LONG_BODY_WARNING_CHARS = 8000;

export const INITIAL_SKILL_VERSION = 1;

/** Phrases that try to steer a reviewer. Shown to a human before import — not a defence. */
export const STEERING_PATTERNS: RegExp[] = [
  /ignore (?:all |any )?(?:previous|prior|above|earlier) (?:instructions|rules)/i,
  /\bsystem prompt\b/i,
  /\b(?:do not|don't|never) (?:report|flag|mention)\b/i,
  /\bapprove (?:this|the|every) (?:pr|pull request|change)/i,
  /\b(?:curl|wget)\s+https?:\/\//i,
];
