import { describe, expect, it } from 'bun:test';
import { ACTIVITIES, PERMISSIONS } from './ban';
import { ACTIVITY_LABEL, LEVEL_LABEL, PERMISSION_STYLE, permissionColor } from './banStyle';

describe('permissionColor', () => {
  it.each(['fill', 'stroke'] as const)('picks the %s colour of the feature\'s permission', kind => {
    expect(permissionColor(kind)).toEqual([
      'match',
      ['get', 'permission'],
      'prohibited', PERMISSION_STYLE.prohibited[kind],
      'by-permit-only', PERMISSION_STYLE['by-permit-only'][kind],
      PERMISSION_STYLE.allowed[kind],
    ]);
  });

  it('uses red for prohibited, amber for by permit only and grey for allowed', () => {
    expect(PERMISSION_STYLE.prohibited.stroke).toMatch(/^rgba\(220,50,50/);
    expect(PERMISSION_STYLE['by-permit-only'].stroke).toMatch(/^rgba\(230,140,0/);
    expect(PERMISSION_STYLE.allowed.stroke).toMatch(/^rgba\(120,120,120/);
  });
});

describe('ban style tables', () => {
  it('has a label for every ban level', () => {
    expect(Object.keys(LEVEL_LABEL).sort()).toEqual(['municipal', 'provincial', 'regional-district']);
  });

  it('has a label for every activity, including the fallback', () => {
    expect(Object.keys(ACTIVITY_LABEL).sort()).toEqual([...ACTIVITIES].sort());
  });

  it('has a style for every permission, named as the permission is', () => {
    expect(Object.keys(PERMISSION_STYLE).sort()).toEqual([...PERMISSIONS].sort());
    expect(PERMISSIONS.map(permission => PERMISSION_STYLE[permission].label)).toEqual(['Prohibited', 'By permit only', 'Allowed']);
  });
});
