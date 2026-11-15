import { describe, expect, it } from 'bun:test';
import { makeBan, makeSource } from '../test/fixtures';
import { active, failedSources, isFireBan, isSourceStatus, parseBansResponse, validBans } from './bans';

describe('active', () => {
  const noon = (iso: string) => new Date(`${iso}T12:00:00`);

  it('is active with no expiry date', () => {
    expect(active(makeBan({ expiryDate: undefined }), noon('2026-07-01'))).toBe(true);
  });

  it('is active before and on its expiry date, and inactive after it', () => {
    const ban = makeBan({ expiryDate: '2026-09-30' });
    expect(active(ban, noon('2026-09-29'))).toBe(true);
    expect(active(ban, new Date(2026, 8, 30, 23, 59))).toBe(true);
    expect(active(ban, noon('2026-10-01'))).toBe(false);
  });

  it('compares a full timestamp expiry to the exact time', () => {
    const ban = makeBan({ expiryDate: '2026-09-30T10:00:00Z' });
    expect(active(ban, new Date('2026-09-30T09:59:00Z'))).toBe(true);
    expect(active(ban, new Date('2026-09-30T10:01:00Z'))).toBe(false);
  });

  it('ignores an expiry date it cannot read', () => {
    expect(active(makeBan({ expiryDate: 'sometime soon' }), noon('2026-07-01'))).toBe(true);
  });

  it('is inactive before its effective date and active from that day on', () => {
    const ban = makeBan({ effectiveDate: '2026-07-01' });
    expect(active(ban, noon('2026-06-30'))).toBe(false);
    expect(active(ban, new Date(2026, 6, 1, 0, 1))).toBe(true);
    expect(active(ban, noon('2026-07-02'))).toBe(true);
  });

  it('compares a full timestamp effective date to the exact time', () => {
    const ban = makeBan({ effectiveDate: '2026-07-01T10:00:00Z' });
    expect(active(ban, new Date('2026-07-01T09:59:00Z'))).toBe(false);
    expect(active(ban, new Date('2026-07-01T10:01:00Z'))).toBe(true);
  });

  it('ignores an effective date it cannot read', () => {
    expect(active(makeBan({ effectiveDate: 'soon' }), noon('2026-07-01'))).toBe(true);
  });

  it('is active only between its effective and expiry dates', () => {
    const ban = makeBan({ effectiveDate: '2026-06-01', expiryDate: '2026-08-31' });
    expect([noon('2026-05-31'), noon('2026-07-01'), noon('2026-09-01')].map(d => active(ban, d))).toEqual([false, true, false]);
  });

  it('is inactive when expired even inside its yearly period', () => {
    const ban = makeBan({ expiryDate: '2026-01-01', annualEffectivePeriod: { start: '01-01', end: '12-31' } });
    expect(active(ban, noon('2026-07-01'))).toBe(false);
  });

  it('still follows its yearly period when not expired', () => {
    const ban = makeBan({ expiryDate: '2030-01-01', annualEffectivePeriod: { start: '06-01', end: '09-30' } });
    expect(active(ban, noon('2026-07-01'))).toBe(true);
    expect(active(ban, noon('2026-12-01'))).toBe(false);
  });

  it('is active inside any of several yearly periods', () => {
    const ban = makeBan({ effectiveDate: undefined, annualEffectivePeriod: [{ start: '12-01', end: '03-14' }, { start: '04-16', end: '10-31' }] });
    expect([active(ban, noon('2026-01-10')), active(ban, noon('2026-07-01')), active(ban, noon('2026-11-15')), active(ban, noon('2026-03-20'))]).toEqual([true, true, false, false]);
  });
});

describe('isFireBan', () => {
  it('accepts a complete ban, with or without the optional fields', () => {
    expect(isFireBan(makeBan())).toBe(true);
    expect(isFireBan(makeBan({ title: 'T', url: 'https://example.gov', expiryDate: '2026-09-01' }))).toBe(true);
    expect(isFireBan(makeBan({ title: undefined, effectiveDate: undefined, url: undefined }))).toBe(true);
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
    ['an unknown type', { ...makeBan(), type: 'fireworks' }],
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
    ['a string hasData', { ...makeSource(), hasData: 'yes' }],
    ['a missing retrying flag', { ...makeSource(), retrying: undefined }],
    ['a missing fetching flag', { ...makeSource(), fetching: undefined }],
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
