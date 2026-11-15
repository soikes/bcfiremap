import { describe, expect, it } from 'bun:test';
import { SAMPLE_BANS } from '../test/fixtures';
import { LEVEL_LABEL, STATUS_COLORS, TYPE_LABEL, activeColor } from './banStyle';

describe('activeColor', () => {
  it.each(['fill', 'stroke'] as const)('picks red for an active ban and grey otherwise for the %s', kind => {
    expect(activeColor(kind)).toEqual(['case', ['==', ['get', 'active'], true], STATUS_COLORS.active[kind], STATUS_COLORS.inactive[kind]]);
  });

  it('uses red for active and grey for inactive', () => {
    expect(STATUS_COLORS.active.stroke).toMatch(/^rgba\(220,50,50/);
    expect(STATUS_COLORS.inactive.stroke).toMatch(/^rgba\(120,120,120/);
  });
});

describe('ban style tables', () => {
  it('has a label for every ban level', () => {
    expect(Object.keys(LEVEL_LABEL).sort()).toEqual(['municipal', 'provincial', 'regional-district']);
  });

  it('has a label for every ban type, including the fallback', () => {
    expect(Object.keys(TYPE_LABEL).sort()).toEqual(
      ['all-fires', 'campfire', 'category2-3', 'open-burning', 'other'],
    );
  });

  it('has a label for every type used by the sample bans', () => {
    SAMPLE_BANS.forEach(ban => expect(TYPE_LABEL[ban.type]).toBeDefined());
  });
});
