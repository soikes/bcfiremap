import { SAMPLE_BANS } from '../test/fixtures';
import { BAN_COLORS, LEVEL_LABEL, TYPE_LABEL, levelColor } from './banStyle';

describe('levelColor', () => {
  it.each(['fill', 'stroke'] as const)('matches each level to its %s colour', kind => {
    expect(levelColor(kind)).toEqual([
      'match',
      ['get', 'level'],
      'provincial', BAN_COLORS.provincial[kind],
      'regional-district', BAN_COLORS['regional-district'][kind],
      'municipal', BAN_COLORS.municipal[kind],
      'rgba(0,0,0,0)',
    ]);
  });
});

describe('ban style tables', () => {
  it('has a label for every level that has a colour', () => {
    expect(Object.keys(LEVEL_LABEL).sort()).toEqual(Object.keys(BAN_COLORS).sort());
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
