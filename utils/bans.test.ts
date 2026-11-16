import { describe, expect, it } from 'bun:test';
import { makeBan, makeSource } from '../test/fixtures';
import { Period, Permission } from '../types/ban';
import { currentPeriod, failedSources, isFireBan, permissionAt, prohibitedFrom, restricts, isSourceStatus, parseBansResponse, validBans } from './bans';

describe('permissionAt', () => {
  const noon = (iso: string) => new Date(`${iso}T12:00:00`);
  const prohibited = (period: Omit<Period, 'permission'> = {}): Period => ({ permission: 'prohibited', ...period });
  const ban = (otherwise: Permission, ...periods: Period[]) => makeBan({ otherwise, periods });

  it('gives `otherwise` when there are no periods', () => {
    expect(permissionAt(ban('allowed'), noon('2026-07-01'))).toBe('allowed');
    expect(permissionAt(ban('by-permit-only'), noon('2026-07-01'))).toBe('by-permit-only');
    expect(permissionAt(ban('prohibited'), noon('2026-07-01'))).toBe('prohibited');
  });

  it('gives a period with no limits at all times', () => {
    expect(permissionAt(ban('allowed', prohibited()), noon('2026-07-01'))).toBe('prohibited');
  });

  it('is allowed before the `from` date and prohibited from that day on', () => {
    const b = ban('allowed', prohibited({ from: '2026-07-01' }));
    expect(permissionAt(b, noon('2026-06-30'))).toBe('allowed');
    expect(permissionAt(b, new Date(2026, 6, 1, 0, 1))).toBe('prohibited');
    expect(permissionAt(b, noon('2026-07-02'))).toBe('prohibited');
  });

  it('counts a date-only `until` through the whole day and a timestamp to the exact time', () => {
    const byDay = ban('allowed', prohibited({ until: '2026-09-30' }));
    expect(permissionAt(byDay, new Date(2026, 8, 30, 23, 59))).toBe('prohibited');
    expect(permissionAt(byDay, noon('2026-10-01'))).toBe('allowed');
    const byTime = ban('allowed', prohibited({ until: '2026-09-30T10:00:00Z' }));
    expect(permissionAt(byTime, new Date('2026-09-30T09:59:00Z'))).toBe('prohibited');
    expect(permissionAt(byTime, new Date('2026-09-30T10:01:00Z'))).toBe('allowed');
  });

  it('ignores dates it cannot read', () => {
    expect(permissionAt(ban('allowed', prohibited({ from: 'soon' })), noon('2026-07-01'))).toBe('prohibited');
    expect(permissionAt(ban('allowed', prohibited({ until: 'sometime' })), noon('2026-07-01'))).toBe('prohibited');
  });

  it('follows a yearly range, including one that wraps the new year', () => {
    const summer = ban('allowed', prohibited({ annual: { start: '06-01', end: '09-30' } }));
    expect([noon('2026-07-01'), noon('2026-12-01')].map(d => permissionAt(summer, d))).toEqual(['prohibited', 'allowed']);
    const winter = ban('prohibited', { permission: 'allowed', annual: { start: '10-01', end: '05-31' } });
    expect([noon('2026-01-10'), noon('2026-11-15'), noon('2026-07-01')].map(d => permissionAt(winter, d))).toEqual(['allowed', 'allowed', 'prohibited']);
  });

  it('applies the yearly range only inside the from/until dates', () => {
    const b = ban('allowed', prohibited({ until: '2026-01-01', annual: { start: '01-01', end: '12-31' } }));
    expect(permissionAt(b, noon('2026-07-01'))).toBe('allowed');
  });

  it('gives by permit only in several windows and prohibited between them', () => {
    const langford = ban(
      'prohibited',
      { permission: 'by-permit-only', annual: { start: '11-01', end: '11-30' } },
      { permission: 'by-permit-only', annual: { start: '03-15', end: '04-15' } },
    );
    const at = (iso: string) => permissionAt(langford, noon(iso));
    expect([at('2026-11-01'), at('2026-11-30'), at('2026-03-15'), at('2026-04-15')]).toEqual(Array(4).fill('by-permit-only'));
    expect([at('2026-12-01'), at('2026-03-14'), at('2026-04-16'), at('2026-07-01')]).toEqual(Array(4).fill('prohibited'));
  });

  it('uses the first period that covers the day', () => {
    const b = ban('allowed', { permission: 'by-permit-only', annual: { start: '06-01', end: '06-30' } }, prohibited());
    expect(permissionAt(b, noon('2026-06-15'))).toBe('by-permit-only');
    expect(permissionAt(b, noon('2026-07-15'))).toBe('prohibited');
  });
});

describe('currentPeriod and restricts', () => {
  it('returns the covering period, or nothing', () => {
    const period = { permission: 'prohibited' as const, from: '2026-07-01' };
    const b = makeBan({ otherwise: 'allowed', periods: [period] });
    expect(currentPeriod(b, new Date(2026, 7, 1))).toBe(period);
    expect(currentPeriod(b, new Date(2026, 5, 1))).toBeUndefined();
  });

  it('treats everything but allowed as a restriction', () => {
    expect(['prohibited', 'by-permit-only', 'allowed-with-conditions', 'allowed'].map(p => restricts(p as Permission))).toEqual([true, true, true, false]);
  });

  it('builds prohibited-from-a-date periods', () => {
    expect(prohibitedFrom('2026-07-01')).toEqual({ periods: [{ permission: 'prohibited', from: '2026-07-01' }], otherwise: 'allowed' });
  });
});

describe('isFireBan', () => {
  it('accepts a complete ban, with or without the optional fields', () => {
    expect(isFireBan(makeBan())).toBe(true);
    expect(isFireBan(makeBan({ title: 'T', url: 'https://example.gov', periods: [{ permission: 'allowed', from: '2026-01-01', until: '2026-09-01', annual: { start: '06-01', end: '09-30' } }] }))).toBe(true);
    expect(isFireBan(makeBan({ title: undefined, url: undefined, periods: [] }))).toBe(true);
  });

  it('accepts a MultiPolygon geometry', () => {
    const geometry = { type: 'MultiPolygon' as const, coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] };
    expect(isFireBan(makeBan({ geometry }))).toBe(true);
  });

  it.each([
    ['null', null],
    ['a string', 'ban'],
    ['a missing id', { ...makeBan(), id: undefined }],
    ['a numeric id', { ...makeBan(), id: 7 }],
    ['an unknown level', { ...makeBan(), level: 'federal' }],
    ['an unknown activity', { ...makeBan(), activity: 'fireworks' }],
    ['an unknown otherwise', { ...makeBan(), otherwise: 'maybe' }],
    ['a missing otherwise', { ...makeBan(), otherwise: undefined }],
    ['periods that are not a list', { ...makeBan(), periods: 'always' }],
    ['a period with an unknown permission', { ...makeBan(), periods: [{ permission: 'sometimes' }] }],
    ['a period with a numeric from date', { ...makeBan(), periods: [{ permission: 'allowed', from: 5 }] }],
    ['a period with a malformed yearly range', { ...makeBan(), periods: [{ permission: 'allowed', annual: { start: 'June', end: '09-30' } }] }],
    ['a missing region', { ...makeBan(), region: undefined }],
    ['a missing description', { ...makeBan(), description: undefined }],
    ['a numeric title', { ...makeBan(), title: 3 }],
    ['a non-https url', { ...makeBan(), url: 'javascript:alert(1)' }],
    ['a plain http url', { ...makeBan(), url: 'http://example.gov' }],
    ['no geometry', { ...makeBan(), geometry: undefined }],
    ['a point geometry', { ...makeBan(), geometry: { type: 'Point', coordinates: [0, 0] } }],
    ['geometry without coordinates', { ...makeBan(), geometry: { type: 'Polygon' } }],
  ])('rejects %s', (_case, value) => {
    expect(isFireBan(value)).toBe(false);
  });
});

describe('isSourceStatus', () => {
  it('accepts a complete source status', () => {
    expect(isSourceStatus(makeSource())).toBe(true);
  });

  it.each([
    ['null', null],
    ['a missing name', { ...makeSource(), name: undefined }],
    ['an unknown status', { ...makeSource(), status: 'loading' }],
    ['a string updatedAt', { ...makeSource(), updatedAt: '12:00' }],
  ])('rejects %s', (_case, value) => {
    expect(isSourceStatus(value)).toBe(false);
  });
});

describe('validBans', () => {
  it('keeps the valid bans and drops the rest', () => {
    const bans = validBans([makeBan({ id: 'good' }), { id: 'bad' }, null], 'test');
    expect(bans.map(ban => ban.id)).toEqual(['good']);
  });

  it.each([[undefined], [null], [{}], ['bans']])('throws when the result is not a list: %p', value => {
    expect(() => validBans(value, 'test')).toThrow('test returned bans that are not a list');
  });
});

describe('parseBansResponse', () => {
  it('returns a well-formed response unchanged', () => {
    const body = { bans: [makeBan()], sources: [makeSource()] };
    expect(parseBansResponse(body)).toEqual(body);
  });

  it('drops invalid bans and sources but keeps the valid ones', () => {
    const body = { bans: [makeBan({ id: 'good' }), { id: 'bad' }], sources: [makeSource({ id: 'ok' }), { id: 'broken' }] };
    const parsed = parseBansResponse(body);
    expect(parsed.bans.map(ban => ban.id)).toEqual(['good']);
    expect(parsed.sources.map(source => source.id)).toEqual(['ok']);
  });

  it.each([
    ['null', null],
    ['a string', '<html>Bad Gateway</html>'],
    ['an empty object', {}],
    ['an error object', { error: 'rate limited' }],
    ['bans that are not a list', { bans: {}, sources: [] }],
    ['sources that are not a list', { bans: [], sources: 'none' }],
  ])('throws on %s', (_case, body) => {
    expect(() => parseBansResponse(body)).toThrow();
  });
});

describe('failedSources', () => {
  it('returns only the sources that failed to load', () => {
    const sources = [
      makeSource({ id: 'ok' }),
      makeSource({ id: 'loading', status: 'pending' }),
      makeSource({ id: 'down', status: 'error' }),
    ];
    expect(failedSources(sources).map(source => source.id)).toEqual(['down']);
  });

  it('returns nothing when there are no sources', () => {
    expect(failedSources([])).toEqual([]);
  });
});
