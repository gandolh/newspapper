/**
 * The one Chromium guard every browser-driving test file uses (brief 91).
 *
 * A pixel test that cannot launch a browser must never read as a pass. So:
 *
 * - **locally** it skips, with a boxed banner on stderr naming what went
 *   unverified and how to fix it (`npx playwright install chromium`);
 * - **under `CI`**, where Chromium is installed on purpose, a missing browser
 *   is a failure: `orSkip` throws instead of skipping.
 *
 * Two of the four Chromium suites used to `console.warn(...); return;`, which
 * reports *passed* while asserting nothing. That is the "green because nothing
 * ran" pattern, in the files closest to what the product outputs.
 */
import { closeBrowser, getBrowser } from '../browser.js';

export interface ChromiumGuard {
  readonly available: boolean;
  /**
   * In a test body: `if (!chromium.orSkip((note) => ctx.skip(note))) return;`.
   * True when the browser is there. Otherwise prints the banner, then throws
   * under CI or calls `skip` locally.
   */
  orSkip(skip: (note?: string) => void): boolean;
  /** For `afterAll`: closes the browser, or repeats the banner on stderr, where
   * Vitest's reporter can't swallow it. */
  close(): Promise<void>;
}

/**
 * Probe once per test file. `suite` labels the banner; `unverified` says what a
 * skipped run did not check ("rendered slides are set in Inter").
 */
export async function probeChromium(suite: string, unverified: string): Promise<ChromiumGuard> {
  let available = true;
  let cause = '';
  try {
    const browser = await getBrowser();
    if (!browser.isConnected()) throw new Error('browser not connected');
  } catch (err) {
    available = false;
    cause = (err as Error).message.split('\n')[0] ?? String(err);
  }

  const note = `Chromium unavailable — ${unverified} was NOT verified`;
  const banner = (): string => {
    const rule = '='.repeat(78);
    return [
      '',
      rule,
      `[${suite}] CHROMIUM UNAVAILABLE — THESE BROWSER TESTS DID NOT RUN.`,
      `[${suite}] Unverified: ${unverified}.`,
      `[${suite}] Run \`npx playwright install chromium\` before trusting this run.`,
      `[${suite}] cause: ${cause}`,
      rule,
      '',
    ].join('\n');
  };

  return {
    available,
    orSkip(skip) {
      if (available) return true;
      console.error(banner());
      if (process.env['CI']) {
        throw new Error(`${note}. In CI that is a failure, not a skip.${banner()}`);
      }
      skip(note);
      return false;
    },
    async close() {
      if (available) {
        await closeBrowser();
        return;
      }
      process.stderr.write(banner());
    },
  };
}
