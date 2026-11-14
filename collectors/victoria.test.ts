import { afterEach, describe, expect, it, mock } from 'bun:test';
import { isFireBan } from '../utils/bans';
import { buildVictoriaBan, victoriaCollector } from './victoria';

const polygon = { type: 'Polygon', coordinates: [[[-123.4, 48.4], [-123.3, 48.4], [-123.3, 48.5], [-123.4, 48.4]]] };

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('buildVictoriaBan', () => {
  it('builds a valid municipal all-fires ban with no BCWS applicability rule', () => {
    const ban = buildVictoriaBan(polygon as never);
    expect(isFireBan(ban)).toBe(true);
    expect(ban).toMatchObject({ level: 'municipal', type: 'all-fires', authorityId: 'victoria' });
    expect(ban.applicability).toBeUndefined();
  });
});

describe('victoriaCollector', () => {
  it('puts the standing ban on the boundary the service returns', async () => {
    globalThis.fetch = mock(async () =>
      Response.json({
        features: [{ properties: { LGL_ADMIN_AREA_ID: 269, ADMIN_AREA_ABBREVIATION: 'Victoria' }, geometry: polygon }],
      }),
    ) as never;
    const bans = await victoriaCollector.collect();
    expect(bans.map(ban => ban.id)).toEqual(['victoria:open-fires']);
    expect(bans[0].geometry).toEqual(polygon as never);
  });

  it('fails when the boundary is missing so the source shows as failed', async () => {
    globalThis.fetch = mock(async () => Response.json({ features: [] })) as never;
    await expect(victoriaCollector.collect()).rejects.toThrow('boundary not found');
  });
});
