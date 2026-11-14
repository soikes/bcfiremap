import { describe, expect, it } from 'bun:test';

/** Loads the browser collector list in a fresh Bun process with the given flag and returns its ids. */
const collectorIds = (flag?: string): string[] => {
  const env = { ...process.env };
  delete env.PUBLIC_EXAMPLE_BANS;
  if (flag !== undefined) env.PUBLIC_EXAMPLE_BANS = flag;
  const script = "const { BROWSER_COLLECTORS } = require('./collectors/browser'); console.log(JSON.stringify(BROWSER_COLLECTORS.map(c => c.id)));";
  const { stdout } = Bun.spawnSync(['bun', '-e', script], { env, cwd: `${import.meta.dir}/..` });
  return JSON.parse(stdout.toString().trim().split('\n').pop()!);
};

describe('BROWSER_COLLECTORS', () => {
  it('has only the BC Wildfire Service collector by default', () => {
    expect(collectorIds()).toEqual(['bcws']);
  });

  it('ignores any value other than "true"', () => {
    expect(collectorIds('false')).toEqual(['bcws']);
    expect(collectorIds('1')).toEqual(['bcws']);
  });

  it('adds the example collector when the flag is "true"', () => {
    expect(collectorIds('true')).toEqual(['bcws', 'example']);
  });
});
