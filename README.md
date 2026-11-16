# BC Fire Map

> **Disclaimer:** BC Fire Map is a work in progress and for informational purposes only. Its data may be incomplete or out of date, and it is not an official source of fire restrictions. Always check with your municipality, your local fire department or the BC Wildfire Service for up-to-date information.

Can I have a campfire here? In British Columbia the answer depends on who you ask: the province, the regional district, and the municipality can each have their own rules, and they change with the season and the fire danger.

BC Fire Map gathers fire bans and restrictions from those jurisdictions and layers them on one map. Tap anywhere, or search for a place or use your location, to see every rule that applies there.

## What you see

Each rule is about one activity (campfires, beach fires, backyard burning, and so on) in one area, and shows what is allowed there today:

|                                        | Meaning                                     |
| -------------------------------------- | ------------------------------------------- |
| ✕ **Prohibited** (red)                 | Not allowed                                 |
| ✎ **By permit only** (yellow)          | Allowed only with a permit                  |
| ! **Allowed with conditions** (yellow) | Allowed if you follow the stated conditions |
| ✓ **Allowed** (green)                  | No restriction from this jurisdiction       |

Where rules overlap, the map shows only the strictest one. Tap a spot to see the full list, with each rule's details and a link to its source.

## Where the data comes from

- **Province:** BC Wildfire Service bans and prohibitions, fetched live by your browser.
- **Municipalities:** standing local fire rules (year-round bans, burning seasons, permit requirements) for BC municipalities and regions. These are written by hand from each municipality's published bylaws and fire pages, and drawn over its official boundary.
- **Basemap, boundaries and place search:** OpenFreeMap, BC administrative boundaries and OpenStreetMap's Nominatim.

## Roadmap

- [ ] Keep municipal data current all year: browser agents regularly check each municipality's bylaws and fire pages and update its rules when they change, so they no longer depend on being written by hand.
- [ ] A service that lets municipalities publish their fire rules and bans directly.

## Run it locally

You need [mise](https://mise.jdx.dev), which installs the right versions of Bun and the other tools.

```sh
mise install --locked
mise run dev:hot    # http://localhost:8080
mise run check      # typecheck and test
```

Project notes for contributors, including the architecture and how to add a data source, are in [CLAUDE.md](CLAUDE.md) and [docs/data-model.md](docs/data-model.md).

## License

The code is [MIT licensed](LICENSE). The data it shows comes from the sources above and stays under their own terms.
