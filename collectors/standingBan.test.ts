import { afterEach, describe, expect, it, mock } from 'bun:test';
import { isFireBan } from '../utils/bans';
import { OAK_BAY_AUTHORITY } from '../constants/authority';
import { buildStandingBan } from './standingBan';
import { oakBayCollector } from './oakBay';
import { victoriaCollector } from './victoria';

const polygon = { type: 'Polygon', coordinates: [[[-123.4, 48.4], [-123.3, 48.4], [-123.3, 48.5], [-123.4, 48.4]]] };

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('buildStandingBan', () => {
  it('builds a valid municipal all-fires ban with no BCWS applicability rule', () => {
    const ban = buildStandingBan(
      { authority: OAK_BAY_AUTHORITY, municipalityName: 'X', abmsName: 'X', title: 't', description: 'd', rulesUrl: 'https://example.com' },
      polygon as never,
    );
    expect(isFireBan(ban)).toBe(true);
    expect(ban).toMatchObject({ level: 'municipal', type: 'all-fires', authorityId: 'oak-bay' });
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

describe('municipal collectors', () => {
  it('query their own boundary by ABMS name and tag the ban with their own id', async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (url: string) => {
      urls.push(new URL(String(url)).searchParams.get('where') ?? '');
      return Response.json({ features: [{ properties: { LGL_ADMIN_AREA_ID: 1, ADMIN_AREA_ABBREVIATION: 'x' }, geometry: polygon }] });
    }) as never;
    const [victoria] = await victoriaCollector.collect();
    const [oakBay] = await oakBayCollector.collect();
    expect(urls[0]).toContain("ADMIN_AREA_ABBREVIATION='Victoria'");
    expect(urls[1]).toContain("ADMIN_AREA_ABBREVIATION='Oak Bay'");
    expect([victoria.id, oakBay.id]).toEqual(['victoria:open-fires', 'oak-bay:open-fires']);
    expect(oakBay.source).toBe(oakBayCollector.id);
  });
});
