const loadCollectorIds = (flag?: string) => {
  const previous = process.env.EXPO_PUBLIC_EXAMPLE_BANS;
  if (flag === undefined) delete process.env.EXPO_PUBLIC_EXAMPLE_BANS;
  else process.env.EXPO_PUBLIC_EXAMPLE_BANS = flag;
  try {
    let ids: string[] = [];
    jest.isolateModules(() => {
      ids = require('./index').COLLECTORS.map((collector: { id: string }) => collector.id);
    });
    return ids;
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_EXAMPLE_BANS;
    else process.env.EXPO_PUBLIC_EXAMPLE_BANS = previous;
  }
};

describe('COLLECTORS', () => {
  it('has only the BC Wildfire Service collector by default', () => {
    expect(loadCollectorIds()).toEqual(['bcws']);
  });

  it('ignores any value other than "true"', () => {
    expect(loadCollectorIds('false')).toEqual(['bcws']);
    expect(loadCollectorIds('1')).toEqual(['bcws']);
  });

  it('adds the example collector when the flag is "true"', () => {
    expect(loadCollectorIds('true')).toEqual(['bcws', 'example']);
  });
});
