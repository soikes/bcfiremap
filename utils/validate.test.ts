import { describe, expect, it } from 'bun:test';
import { makeBan, makeSource } from '../test/fixtures';
import { isFireBan, isSourceStatus, parseBansResponse, validBans } from './validate';

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
