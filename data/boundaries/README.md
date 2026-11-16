# Municipal boundaries

`municipalities.json` holds the boundaries of the 13 municipalities in the Capital Regional District. The server uses them to place each municipality's standing fire rules.

- **Source:** [Municipalities - Legally Defined Administrative Areas of BC](https://catalogue.data.gov.bc.ca/dataset/e3c3c580-996a-4668-8bc5-6aa7c7dc4932) (`WHSE_LEGAL_ADMIN_BOUNDARIES.ABMS_MUNICIPALITIES_SP`), from the BC Geographic Warehouse ArcGIS service, simplified to about 50 m.
- **Licence:** [Open Government Licence – British Columbia](https://www2.gov.bc.ca/gov/content?id=A519A56BC2BF44E4A008B33FCF527F61). Attribution: "Contains information licensed under the Open Government Licence – British Columbia." The app shows this in each municipality's source attribution.
- **Refresh:** `mise run boundaries` fetches a new copy and rewrites the file. The file records the query URL and the time it was fetched.
