import { classifyBan } from './classifyBan';

describe('classifyBan', () => {
  it.each([
    ['Category 1 campfire prohibition', 'campfire'],
    ['Campfire', 'campfire'],
    ['CATEGORY 1 CAMPFIRE', 'campfire'],
    ['Category 2 open fire', 'category2-3'],
    ['Category 2 and Category 3 open fires', 'category2-3'],
    ['Campfires and Category 2 open fires', 'all-fires'],
    ['All open fires', 'all-fires'],
    ['Open fire prohibition', 'open-burning'],
    ['Fireworks and sky lanterns', 'other'],
    ['', 'other'],
  ])('classifies %p as %p', (text, expected) => {
    expect(classifyBan(text)).toBe(expected);
  });
});
