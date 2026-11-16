# Fire Ban Data Model

Goal: one model that holds every fire ban in BC, whoever issued it, so a tapped point can answer "what is banned here?". Lower Vancouver Island is the worked example.

Status column legend: **Verified** = checked against a live source or official page while writing this; **Likely** = standard BC practice but not checked against a source here; **Open** = needs research before building.

## 1. The core idea

Three separate questions get mixed together under "jurisdiction". The model keeps them apart:

1. **Who issues the ban?** (an _Authority_, e.g. a Fire Centre or a municipality)
2. **Where is it declared?** (an _Area_, e.g. a fire zone polygon or a municipal boundary)
3. **Where does it actually bind?** (an _Applicability rule_: the Area minus exclusions, optionally limited to certain land types)

Question 3 is what makes BC hard. A BC Wildfire Service (BCWS) order is declared for a whole Fire Centre or Zone, but it usually does **not** apply inside municipalities, except in provincial parks, recreation sites, wildlife management areas and private managed forest land (Verified, [BC gov fire bans page](https://www2.gov.bc.ca/gov/content/safety/wildfire-status/fire-bans-and-restrictions)). So "point is inside the fire zone polygon" is not enough to say the ban applies.

A point lookup is therefore two steps:

1. **Resolve context**: find every Area that contains the point (fire zone, regional district, municipality or electoral area, park, reserve, ...).
2. **Match bans**: keep a ban when its declared Area is in the point's context **and** its applicability rule doesn't exclude any of the point's other contexts.

## 2. Terms

### 2.1 Provincial wildfire management (BCWS, Ministry of Forests)

| Term                                 | Level      | Meaning                                                                                                                                                                                                                                                                                             | Example data source                                                                                                        | Status                                   |
| ------------------------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **BC Wildfire Service (BCWS)**       | Provincial | The provincial agency that manages wildfire response and issues fire prohibitions under the _Wildfire Act_.                                                                                                                                                                                         | [BCWS bulletins blog](https://blog.gov.bc.ca/bcwildfire)                                                                   | Verified                                 |
| **Fire Centre**                      | Provincial | One of 6 regional BCWS operating areas: Cariboo, Coastal, Kamloops, Northwest, Prince George, Southeast. Each centre decides when and where to impose prohibitions. A ban can cover a whole centre.                                                                                                 | `FIRE_CENTRE` field of the Fire Zone Boundaries ArcGIS layer (already used in `constants/map.ts`)                          | Verified                                 |
| **Fire Zone**                        | Provincial | A subdivision of a Fire Centre with its own code and headquarters (31 in the ArcGIS copy, e.g. `V6` South Island Fire Zone, HQ Cobble Hill). Bans are often issued per zone. Codes skip numbers (no V2, V4, V7), so the layer may be missing zones that BCWS orders still name (e.g. "Mid Island"). | `British_Columbia_Fire_Zone_Boundaries` ArcGIS FeatureServer: `FIRE_ZONE`, `FIRE_ZONE_CODE`, `FIRE_CENTRE`, `HEADQUARTERS` | Verified (layer); Open (zone-name drift) |
| **Open fire prohibition**            | Provincial | A _Wildfire Act_ s.10 order banning some or all open fire categories in a named area. This is what people call a "fire ban".                                                                                                                                                                        | BCWS bulletins; "Bans and Prohibition Areas" ArcGIS layer (used by `collectors/provincial.ts`)                             | Verified                                 |
| **Equipment / activity prohibition** | Provincial | _Wildfire Act_ s.12 order banning named equipment, activities or substances (e.g. fireworks, binary exploding targets, sky lanterns, burn barrels).                                                                                                                                                 | BCWS bulletins                                                                                                             | Verified                                 |
| **Area restriction**                 | Provincial | _Wildfire Act_ s.11 order limiting access to an area where suppression is underway. Not a fire ban, but a related restriction.                                                                                                                                                                      | BCWS bulletins; wildfire situation map                                                                                     | Verified                                 |
| **Leave area order**                 | Provincial | _Wildfire Act_ s.13 order requiring people to leave a specified area.                                                                                                                                                                                                                               | BCWS bulletins                                                                                                             | Verified                                 |
| **Category 1 fire (campfire)**       | Provincial | Smallest open fire class: a campfire up to about 0.5 m high and wide.                                                                                                                                                                                                                               | _Wildfire Regulation_; BCWS bulletins                                                                                      | Verified                                 |
| **Category 2 fire**                  | Provincial | One pile up to 2 m high and 3 m wide. Typical "open burning" or backyard-pile class.                                                                                                                                                                                                                | _Wildfire Regulation_                                                                                                      | Verified                                 |
| **Category 3 fire**                  | Provincial | Several piles of that size, or any larger pile. Must be registered with BCWS.                                                                                                                                                                                                                       | _Wildfire Regulation_                                                                                                      | Verified                                 |

The BC Data Catalogue lists both ArcGIS sources as Access Only, so per the repo rules they are fetched in the browser, never by the server (see `CLAUDE.md`, Fire bans).

### 2.2 Local government

| Term                                                    | Level              | Meaning                                                                                                                                                                                                                                                        | Example data source                                                                                                                                                                                              | Status                                          |
| ------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| **Regional District (RD)**                              | Regional           | Upper-tier local government covering a large area. Provides services (often fire protection) to unincorporated land through electoral areas and sets rules by bylaw. Lower Vancouver Island: Capital RD (CRD), Cowichan Valley RD (CVRD), RD of Nanaimo (RDN). | BC Data Catalogue: _Regional Districts - Legally Defined Administrative Areas of BC_ (`ABMS_REGIONAL_DISTRICTS_SP`)                                                                                              | Verified (layer); Likely (RD list)              |
| **Electoral Area**                                      | Regional           | The unincorporated part of a regional district, represented by one director. RD fire bylaws mainly apply here. E.g. CRD: Juan de Fuca, Salt Spring Island, Southern Gulf Islands.                                                                              | BC Data Catalogue: _Electoral Areas - Legally Defined Administrative Areas of BC_                                                                                                                                | Verified (layer)                                |
| **Regional district fire regulation**                   | Regional           | A bylaw covering open burning and fire rules in electoral areas. E.g. CRD Fire Regulation No. 2, 2022 covers Juan de Fuca and Southern Gulf Islands. Sits on top of BCWS orders.                                                                               | [CRD Open Burning](https://www.crd.ca/node/4830); [RDN notices](https://rdn.bc.ca/notice-2024-07-09-0); [CVRD notice (PDF)](https://cvrd.ca/wp-content/uploads/2026/05/2026-05-08-IMPORTANT-NOTICE-Fire-Ban.pdf) | Verified                                        |
| **Municipality**                                        | Municipal          | An incorporated city, district, town or village with its own boundary, fire department and bylaws. BCWS orders usually don't apply inside, so the municipality's own bylaw governs. E.g. Victoria, Saanich, Langford, Sooke, Duncan, Nanaimo.                  | BC Data Catalogue: _Municipalities - Legally Defined Administrative Areas of BC_ (`ABMS_MUNICIPALITIES_SP`); each municipality's website for bans                                                                | Verified (layer); Open (per-municipality feeds) |
| **Municipal fire / open burning bylaw**                 | Municipal          | The municipality's own rules, which may match, exceed or ignore BCWS prohibitions. Some ban backyard burning year round (e.g. Sidney, Duncan, Ladysmith, per older coverage).                                                                                  | Municipality bylaw pages; local news                                                                                                                                                                             | Verified (existence); Open (current text)       |
| **Fire protection area / fire department service area** | Local              | The area a fire department or fire protection district serves. Often bylaws and burn rules attach to this, and it doesn't always match an electoral area or municipal boundary. No province-wide boundary layer turned up in the catalogue search.             | Regional district GIS portals; fire department sites (e.g. [Otter Point Fire](https://otterpointfire.bc.ca/burning-regulations/))                                                                                | Open                                            |
| **Improvement district**                                | Local              | A small special-purpose local government, sometimes providing fire protection and setting its own orders.                                                                                                                                                      | Individual district sites                                                                                                                                                                                        | Likely; Open                                    |
| **Islands Trust area**                                  | Regional (special) | Land-use planning body for the Gulf Islands. Fire rules there come from the CRD or other service providers, not the Trust, but the Trust areas help name places. Lower priority.                                                                               | BC Data Catalogue                                                                                                                                                                                                | Likely                                          |

### 2.3 Protected areas and land managers

| Term                                                           | Level                | Meaning                                                                                                                                                                                                                         | Example data source                                                                                                    | Status                                       |
| -------------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| **Provincial park / conservancy / recreation area (BC Parks)** | Provincial           | BC Parks land. BCWS prohibitions apply even where the park lies inside a municipality. BC Parks may add its own rules.                                                                                                          | BC Data Catalogue: _BC Parks, Ecological Reserves, and Protected Areas_ (`TA_PARK_ECORES_PA_SVW`); BC Parks advisories | Likely (layer name); Verified (BCWS applies) |
| **Recreation site / trail (RSTBC)**                            | Provincial           | Crown recreation sites run by Recreation Sites and Trails BC. BCWS prohibitions apply inside municipalities too.                                                                                                                | RSTBC alerts and closures pages; Forest Tenure recreation polygons                                                     | Verified (applies); Open (layer)             |
| **Wildlife management area**                                   | Provincial           | Provincial land managed for wildlife. BCWS prohibitions apply even inside municipalities.                                                                                                                                       | BC Data Catalogue                                                                                                      | Verified (applies); Open (layer)             |
| **Private managed forest land (PMFL)**                         | Provincial           | Private forest land regulated by the Private Managed Forest Land Council. BCWS prohibitions apply even inside municipalities. Large on Vancouver Island.                                                                        | PMFL Council; BC Data Catalogue                                                                                        | Verified (applies); Open (layer)             |
| **Regional park**                                              | Regional             | Park owned by a regional district (CRD Regional Parks, CVRD parks and trails). The RD can cover them in its own notice (CVRD's 2026 notice covers "all CVRD parks and trails").                                                 | RD notices; RD park pages                                                                                              | Verified                                     |
| **Municipal park**                                             | Municipal            | Park owned by a municipality, covered by that municipality's bylaw.                                                                                                                                                             | Municipality sites                                                                                                     | Likely                                       |
| **National park reserve (Parks Canada)**                       | Federal              | Federal land under the _Canada National Parks Act_. Parks Canada issues its own bans, separate from BCWS. Lower Island: Gulf Islands NPR, Pacific Rim NPR (incl. Broken Group Islands unit with its own ban).                   | [Parks Canada bulletins](https://www.parks.canada.ca/en/pn-np/bc/gulf/bulletins)                                       | Verified                                     |
| **First Nation reserve**                                       | Federal / Indigenous | Reserve land under the _Indian Act_; bans come from the band council or are not set at all. The BC page says reserve and Indigenous-managed lands "may have additional requirements" and doesn't say whether BCWS orders apply. | BC Data Catalogue / NRCan reserve boundaries; each Nation's site                                                       | Open (applicability)                         |
| **Treaty / Title land**                                        | Indigenous           | Land governed by a modern treaty Nation or recognized Title. Same open question as reserves.                                                                                                                                    | Nation sites; treaty land boundaries                                                                                   | Open                                         |
| **Federal lands (e.g. DND)**                                   | Federal              | Military and other federal land, with its own rules. Low priority.                                                                                                                                                              | Not researched                                                                                                         | Open                                         |

### 2.4 Related, but not fire bans

These affect how burning or access is restricted. Track them later, not in v1.

| Term                                 | Level              | Meaning                                                                                                                 | Example data source     |
| ------------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Open burning smoke control rules** | Provincial         | _Environmental Management Act_ rules on smoke from open burning (Likely, not verified here). Separate from fire danger. | BC Environment          |
| **Evacuation alert / order**         | Local / Provincial | Emergency orders by local governments or First Nations.                                                                 | EmergencyInfoBC         |
| **Fire danger rating**               | Provincial         | BCWS danger class (low to extreme). Informs bans but isn't one.                                                         | BCWS Fire Danger Rating |

## 3. Entities

Entity names in code-ready form. This extends today's `FireBan` (`types/ban.ts`), which has `level`, `region` (free text) and one geometry.

```
Authority            who can issue bans
  id, name, kind: 'province-bcws' | 'regional-district' | 'municipality'
                  | 'improvement-district' | 'bc-parks' | 'parks-canada'
                  | 'first-nation' | 'land-manager'
  governmentLevel: 'federal' | 'provincial' | 'regional' | 'municipal' | 'indigenous' | 'local'

Area                 a named place with a boundary
  id, name, kind: 'fire-centre' | 'fire-zone' | 'regional-district' | 'electoral-area'
                  | 'municipality' | 'fire-protection-area' | 'provincial-park'
                  | 'recreation-site' | 'pmfl' | 'regional-park' | 'national-park'
                  | 'reserve' | 'wma' | ...
  code?            e.g. fire zone 'V6'
  parentId?        zone -> centre; electoral area -> regional district
  authorityId?     who manages the land / area
  geometry         Polygon | MultiPolygon (or reference to the source layer)
  source           Source id

Ban                  one declared order
  id, authorityId, instrument ('Wildfire Act s.10', 'CRD Fire Regulation No. 2', ...)
  declaredAreaIds[]   the Areas the order names
  applicability       { excludeAreaKinds[], includeAreaKinds[] } (see below)
  restricts[]         'category-1' | 'category-2' | 'category-3' | 'fireworks'
                      | 'burn-barrel' | 'binary-target' | 'sky-lantern' | 'other'
  effectiveDate?, expiryDate?, status: 'active' | 'scheduled' | 'rescinded' | 'expired'
  description, url?
  sourceId, fetchedAt

Applicability        encodes "applies here, except there"
  Example BCWS order: declared = South Island Fire Zone,
    excludeAreaKinds = ['municipality'],
    includeAreaKinds (overrides the exclusion) = ['provincial-park','recreation-site','wma','pmfl']

Source               where the data came from
  id, name, url, authorityId, licence, runsIn: 'browser' | 'server', format
```

Rule for matching a point: ban matches when some `declaredAreaId` contains the point, **and** for each exclusion area kind that also contains the point, an `includeAreaKinds` override area also contains the point.

Rule for nested layers: store `parentId` so the UI can show "South Island Fire Zone, Coastal Fire Centre" without re-deriving it. Fire centre bans are stored against the Fire Centre Area; no need to copy them to each zone.

## 4. Worked example: lower Vancouver Island

Point in **Langford** (municipality in the CRD, in the South Island Fire Zone):

| Context found               | Area kind         | Authority        | Applies?                                               |
| --------------------------- | ----------------- | ---------------- | ------------------------------------------------------ |
| Coastal Fire Centre         | fire-centre       | BCWS             | Declared, but excluded: point is in a municipality     |
| South Island Fire Zone (V6) | fire-zone         | BCWS             | Same: excluded by the municipality exclusion           |
| Capital Regional District   | regional-district | CRD              | CRD fire regulation covers electoral areas only, so no |
| Langford                    | municipality      | City of Langford | Yes: Langford's bylaw governs                          |

Point in **Juan de Fuca Electoral Area** (unincorporated CRD):

| Context found                                | Authority            | Applies?                                            |
| -------------------------------------------- | -------------------- | --------------------------------------------------- |
| Coastal Fire Centre / South Island Fire Zone | BCWS                 | Yes (outside municipality)                          |
| Juan de Fuca Electoral Area                  | CRD                  | Yes: Fire Regulation No. 2, 2022 adds to BCWS rules |
| Local fire protection area                   | Fire department / RD | Maybe: bylaw may attach here (Open)                 |

Same Juan de Fuca point, but inside **East Sooke Regional Park**: adds the CRD regional parks notice. Inside **Gulf Islands National Park Reserve** (e.g. on a Gulf Island): add Parks Canada's own bulletin, which covers that land regardless of BCWS.

Point in a **provincial park inside a municipality**: municipal bylaw applies, and BCWS also applies because of the park override.

### Lower Island coverage checklist

| Level             | Authorities to collect                                                                                                                                                                                                                                                                                              | Boundary layer                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Provincial        | BCWS: Coastal Fire Centre; South Island Fire Zone (V6); North Island Mid Coast (V8) for the upper edge                                                                                                                                                                                                              | Fire Zone Boundaries ArcGIS                 |
| Regional district | CRD, CVRD, RDN (and Alberni-Clayoquot at the west edge, Open)                                                                                                                                                                                                                                                       | ABMS regional districts and electoral areas |
| Municipal         | CRD: Victoria, Saanich, Oak Bay, Esquimalt, View Royal, Colwood, Langford, Metchosin, Highlands, Central Saanich, North Saanich, Sidney, Sooke. CVRD: Duncan, North Cowichan, Ladysmith, Lake Cowichan. RDN: Nanaimo, Lantzville, Parksville, Qualicum Beach (all Likely, confirm against the municipalities layer) | ABMS municipalities                         |
| Parks             | BC Parks, CRD/CVRD/RDN regional parks, Gulf Islands NPR, Pacific Rim NPR                                                                                                                                                                                                                                            | BC Parks layer; Parks Canada boundaries     |
| Other             | PMFL, recreation sites, reserves, fire protection areas                                                                                                                                                                                                                                                             | Open                                        |

## 5. Open questions

1. **Zone name drift**: BCWS orders may name zones that the ArcGIS layer doesn't have (the repo already notes no Mid Island zone, and zone codes skip V2, V4, V7). Need a mapping from order text to Area ids, or to resolve by geometry only.
2. **Reserve and Title land applicability**: whether BCWS orders bind there isn't stated on the BCWS page.
3. **Fire protection area boundaries**: no province-wide layer found. Probably RD-by-RD GIS data.
4. **Municipal and RD feeds**: bans appear as web pages, PDFs and social posts, not APIs. Each needs its own collector or a manual entry path.
5. **Licensing**: the BC Wildfire Service sources are Access Only in the BC Data Catalogue (see `CLAUDE.md`). Municipal and RD sources need their own licence check before the server stores or re-serves them.
6. **Expiry**: many BCWS orders run to October 31 or until rescinded. The model needs `status` plus a rescinded date, and stale bans must drop off.
7. **ABMS caveat**: regional district boundaries are drawn from legal descriptions and can differ from how the RDs manage themselves.

## 6. Suggested build order

1. Add `Area` and `Authority` and resolve a tapped point to its contexts (fire zone, centre, RD, municipality) using free layers.
2. Add `Applicability` for BCWS orders and the municipality exclusion, so provincial bans stop showing inside municipalities.
3. Add CRD, CVRD and RDN as the first regional district collectors.
4. Add the first few municipalities, then parks.
