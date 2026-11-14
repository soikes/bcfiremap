import { describe, expect, it } from 'bun:test';
import { makeSource } from '../test/fixtures';
import { failedSources, joinNames } from './sourceStatus';

describe('failedSources', () => {
  it('returns only the sources that failed with no data', () => {
    const sources = [
      makeSource({ id: 'ok' }),
      makeSource({ id: 'loading', status: 'pending', hasData: false }),
      makeSource({ id: 'stale', status: 'error', hasData: true }),
      makeSource({ id: 'down', status: 'error', hasData: false }),
    ];
    expect(failedSources(sources).map(source => source.id)).toEqual(['down']);
  });

  it('returns nothing when there are no sources', () => {
    expect(failedSources([])).toEqual([]);
  });
});

describe('joinNames', () => {
  it.each([
    [[], ''],
    [['A'], 'A'],
    [['A', 'B'], 'A and B'],
    [['A', 'B', 'C'], 'A, B and C'],
  ])('joins %p as %p', (names, expected) => {
    expect(joinNames(names)).toBe(expected);
  });
});
