import { describe, it, expect, vi, afterEach } from 'vitest';
import { withDeadline } from '../src/modules/_shared/deadline.js';

afterEach(() => vi.useRealTimers());

// The 90 s limit on the intent and onboarding calls (SPEC-02 AC-14) is this helper.
describe('withDeadline', () => {
  it('passes the result through when the work finishes in time', async () => {
    await expect(withDeadline(Promise.resolve('ok'), 1000, 'Work')).resolves.toBe('ok');
  });

  it('rejects with a 502-class error naming the step once the deadline passes', async () => {
    vi.useFakeTimers();
    const pending = withDeadline(new Promise(() => {}), 90_000, 'Writing the onboarding tour');
    const check = expect(pending).rejects.toMatchObject({ statusCode: 502, message: 'Writing the onboarding tour took longer than 90s' });
    await vi.advanceTimersByTimeAsync(90_000);
    await check;
  });
});
