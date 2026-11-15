import { afterEach, describe, expect, it, mock } from "bun:test";
import { isFireBan, permissionAt } from "../utils/bans";
import { Collector } from "../types/collector";
import { saanichCollector } from "./saanich";
import { OAK_BAY_AUTHORITY } from "../constants/authority";
import { buildStandingBan } from "./standingBan";
import { oakBayCollector } from "./oakBay";
import { victoriaCollector } from "./victoria";
import { metchosinCollector } from "./metchosin";
import { langfordCollector } from "./langford";
import { sookeCollector } from "./sooke";
import { highlandsCollector } from "./highlands";
import { northSaanichCollector } from "./northSaanich";
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
  const config = {
    authority: OAK_BAY_AUTHORITY,
    municipalityName: "X",
    abmsName: "X",
    description: "d",
    rulesUrl: "https://example.com",
  };

  it("builds a valid municipal all-fires ban, prohibited all year, with no BCWS applicability rule", () => {
    const ban = buildStandingBan(config, polygon as never);
    expect(isFireBan(ban)).toBe(true);
    expect(ban).toMatchObject({
      level: "municipal",
      activity: "all-fires",
      authorityId: "oak-bay",
      periods: [],
      otherwise: "prohibited",
    });
    expect(ban.applicability).toBeUndefined();
  });

  it("takes the activity, key, periods and otherwise from the config", () => {
    const ban = buildStandingBan(
      {
        ...config,
        key: "beach-fires",
        activity: "beach-fire",
        otherwise: "allowed",
        periods: [{ permission: "prohibited", annual: { start: "05-01", end: "10-15" } }],
      },
      polygon as never,
    );
    expect(ban).toMatchObject({
      id: "oak-bay:beach-fires",
      activity: "beach-fire",
      otherwise: "allowed",
      periods: [{ permission: "prohibited", annual: { start: "05-01", end: "10-15" } }],
    });
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

describe("what each municipality permits through the year", () => {
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
  const DATES = [[1, 15], [3, 20], [4, 20], [5, 20], [7, 15], [10, 20], [11, 15]] as const;
  const calendar = async (collector: Collector, name: string) => {
    answerWith(name);
    const bans = await collector.collect();
    expect(bans.every(isFireBan)).toBe(true);
    return bans.map((ban) => [
      ban.id,
      ban.activity,
      DATES.map(([m, d]) => permissionAt(ban, new Date(2026, m - 1, d, 12))),
    ]);
  };
  const P = "prohibited", B = "by-permit-only", C = "allowed-with-conditions", A = "allowed";

  it("Metchosin prohibits beach fires all year, allows campfires with conditions, and allows backyard burning with conditions from October to May", async () => {
    expect(await calendar(metchosinCollector, "Metchosin")).toEqual([
      ["metchosin:beach-fires", "beach-fire", [P, P, P, P, P, P, P]],
      ["metchosin:campfires", "campfire", [C, C, C, C, C, C, C]],
      ["metchosin:backyard-burning", "backyard-burning", [C, C, C, C, P, C, C]],
    ]);
  });

  it("Langford allows campfires by permit all year and open burning by permit only in November and from March 15 to April 15", async () => {
    expect(await calendar(langfordCollector, "Langford")).toEqual([
      ["langford:campfires", "campfire", [B, B, B, B, B, B, B]],
      ["langford:open-fires", "open-burning", [P, B, P, P, P, P, B]],
    ]);
  });

  it("Highlands requires a permit for every open fire all year", async () => {
    expect(await calendar(highlandsCollector, "Highlands")).toEqual([
      ["highlands:open-fires", "all-fires", [B, B, B, B, B, B, B]],
    ]);
  });

  it("North Saanich requires a permit for appliances all year and for open burning from November to mid-May", async () => {
    expect(await calendar(northSaanichCollector, "North Saanich")).toEqual([
      ["north-saanich:campfires", "campfire", [B, B, B, B, B, B, B]],
      ["north-saanich:open-burning", "open-burning", [B, B, B, P, P, P, B]],
    ]);
  });

  it("Central Saanich allows recreational campfires all year", async () => {
    expect(await calendar(centralSaanichCollector, "Central Saanich")).toEqual([
      ["central-saanich:campfires", "campfire", [A, A, A, A, A, A, A]],
    ]);
  });

  it("Sooke allows backyard burning with conditions from November to April", async () => {
    expect(await calendar(sookeCollector, "Sooke")).toEqual([
      ["sooke:open-fires", "backyard-burning", [C, C, C, P, P, P, C]],
    ]);
  });

  it("Saanich prohibits campfires, fire pits and beach fires all year", async () => {
    expect(await calendar(saanichCollector, "Saanich")).toEqual([
      ["saanich:open-fires", "campfire", [P, P, P, P, P, P, P]],
    ]);
  });

  it.each([
    [colwoodCollector, "Colwood"],
    [viewRoyalCollector, "View Royal"],
    [victoriaCollector, "Victoria"],
    [oakBayCollector, "Oak Bay"],
  ])("%#: prohibits all fires all year", async (collector, name) => {
    const [[, activity, permissions]] = await calendar(collector, name);
    expect(activity).toBe("all-fires");
    expect(permissions).toEqual(Array(7).fill(P));
  });
});
