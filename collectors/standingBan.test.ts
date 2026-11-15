import { afterEach, describe, expect, it, mock } from "bun:test";
import { active, isFireBan } from "../utils/bans";
import { OAK_BAY_AUTHORITY } from "../constants/authority";
import { buildStandingBan } from "./standingBan";
import { oakBayCollector } from "./oakBay";
import { victoriaCollector } from "./victoria";
import { metchosinCollector } from "./metchosin";
import { langfordCollector } from "./langford";
import { sookeCollector } from "./sooke";
import { centralSaanichCollector } from "./centralSaanich";
import { colwoodCollector } from "./colwood";
import { viewRoyalCollector } from "./viewRoyal";

const polygon = {
  type: "Polygon",
  coordinates: [
    [
      [-123.4, 48.4],
      [-123.3, 48.4],
      [-123.3, 48.5],
      [-123.4, 48.4],
    ],
  ],
};

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("buildStandingBan", () => {
  it("builds a valid municipal all-fires ban with no BCWS applicability rule", () => {
    const ban = buildStandingBan(
      {
        authority: OAK_BAY_AUTHORITY,
        municipalityName: "X",
        abmsName: "X",
        title: "t",
        description: "d",
        rulesUrl: "https://example.com",
      },
      polygon as never,
    );
    expect(isFireBan(ban)).toBe(true);
    expect(ban).toMatchObject({
      level: "municipal",
      type: "all-fires",
      authorityId: "oak-bay",
    });
    expect(ban.applicability).toBeUndefined();
    expect(ban.annualEffectivePeriod).toEqual({ start: "01-01", end: "12-31" });
  });

  it("includes the annual time range when provided", () => {
    const ban = buildStandingBan(
      {
        authority: OAK_BAY_AUTHORITY,
        municipalityName: "X",
        abmsName: "X",
        title: "t",
        description: "d",
        rulesUrl: "https://example.com",
        annualEffectivePeriod: { start: "05-01", end: "10-15" },
      },
      polygon as never,
    );
    expect(ban.annualEffectivePeriod).toEqual({ start: "05-01", end: "10-15" });
  });
});

describe("victoriaCollector", () => {
  it("puts the standing ban on the boundary the service returns", async () => {
    globalThis.fetch = mock(async () =>
      Response.json({
        features: [
          {
            properties: {
              LGL_ADMIN_AREA_ID: 269,
              ADMIN_AREA_ABBREVIATION: "Victoria",
            },
            geometry: polygon,
          },
        ],
      }),
    ) as never;
    const bans = await victoriaCollector.collect();
    expect(bans.map((ban) => ban.id)).toEqual(["victoria:open-fires"]);
    expect(bans[0].geometry).toEqual(polygon as never);
  });

  it("fails when the boundary is missing so the source shows as failed", async () => {
    globalThis.fetch = mock(async () =>
      Response.json({ features: [] }),
    ) as never;
    await expect(victoriaCollector.collect()).rejects.toThrow(
      "boundary not found",
    );
  });
});

describe("municipal collectors", () => {
  it("query their own boundary by ABMS name and tag the ban with their own id", async () => {
    const urls: string[] = [];
    globalThis.fetch = mock(async (url: string) => {
      urls.push(new URL(String(url)).searchParams.get("where") ?? "");
      return Response.json({
        features: [
          {
            properties: { LGL_ADMIN_AREA_ID: 1, ADMIN_AREA_ABBREVIATION: "x" },
            geometry: polygon,
          },
        ],
      });
    }) as never;
    const [victoria] = await victoriaCollector.collect();
    const [oakBay] = await oakBayCollector.collect();
    expect(urls[0]).toContain("ADMIN_AREA_ABBREVIATION='Victoria'");
    expect(urls[1]).toContain("ADMIN_AREA_ABBREVIATION='Oak Bay'");
    expect([victoria.id, oakBay.id]).toEqual([
      "victoria:open-fires",
      "oak-bay:open-fires",
    ]);
    expect(oakBay.source).toBe(oakBayCollector.id);
  });
});

describe("seasonal and multi-ban municipal collectors", () => {
  const answerWith = (name: string) => {
    globalThis.fetch = mock(async () =>
      Response.json({
        features: [
          {
            properties: { LGL_ADMIN_AREA_ID: 7, ADMIN_AREA_ABBREVIATION: name },
            geometry: polygon,
          },
        ],
      }),
    ) as never;
  };

  it("gives Metchosin a year-round beach fire ban and a summer burning ban", async () => {
    answerWith("Metchosin");
    const bans = await metchosinCollector.collect();
    expect(bans.map((ban) => [ban.id, ban.type])).toEqual([
      ["metchosin:beach-fires", "campfire"],
      ["metchosin:backyard-burning", "open-burning"],
    ]);
    expect(bans.every(isFireBan)).toBe(true);
  });

  it("gives Langford one ban covering every day it does not allow open burning, and none that it does", async () => {
    answerWith("Langford");
    const bans = await langfordCollector.collect();
    expect(bans.map((ban) => ban.id)).toEqual(["langford:open-fires"]);
    const banned = (month: number, day: number) => active(bans[0], new Date(2026, month - 1, day, 12));
    expect([banned(11, 1), banned(11, 30), banned(3, 15), banned(4, 15)]).toEqual([false, false, false, false]);
    expect([banned(12, 1), banned(3, 14), banned(4, 16), banned(10, 31), banned(7, 1)]).toEqual([true, true, true, true, true]);
  });

  it("builds the single-ban municipalities with their own id, type and season", async () => {
    const cases = [
      [sookeCollector, "Sooke", "open-burning", { start: "05-01", end: "10-31" }],
      [centralSaanichCollector, "Central Saanich", "open-burning", { start: "05-16", end: "10-15" }],
      [colwoodCollector, "Colwood", "all-fires", { start: "01-01", end: "12-31" }],
      [viewRoyalCollector, "View Royal", "all-fires", { start: "01-01", end: "12-31" }],
    ] as const;
    for (const [collector, name, type, period] of cases) {
      answerWith(name);
      const [ban] = await collector.collect();
      expect(ban).toMatchObject({ source: collector.id, type, annualEffectivePeriod: period });
      expect(isFireBan(ban)).toBe(true);
    }
  });
});
