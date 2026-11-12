// Attribute rows from the Internet Archive's 2022-08-03 capture of the BC Wildfire Service feed. The capture had no geometry, so the shape is a placeholder.
const PLACEHOLDER_SHAPE = {
  type: 'Polygon',
  coordinates: [[[-120, 49], [-119, 49], [-119, 50], [-120, 50], [-120, 49]]],
};

const BULLETIN_URL = 'https://www2.gov.bc.ca/gov/content?id=AFEC3F8B5E89438CB0AC9E970CE6EE6F';

const row = (id: number, centre: string, effectiveDate: number) => ({
  type: 'Feature',
  id,
  properties: {
    OBJECTID: id,
    PROT_BAP_SYSID: id,
    TYPE: 'Partial Prohibition',
    ACCESS_PROHIBITION_DESCRIPTION: 'Category 2, Category 3',
    ACCESS_STATUS_EFFECTIVE_DATE: effectiveDate,
    FIRE_CENTRE_NAME: centre,
    FIRE_ZONE_NAME: null,
    BULLETIN_URL,
  },
  geometry: PLACEHOLDER_SHAPE,
});

const JULY_15 = Date.UTC(2022, 6, 15);
const JULY_28 = Date.UTC(2022, 6, 28);

export const BCWS_2022_FEED = {
  type: 'FeatureCollection',
  features: [
    row(1, 'Cariboo', JULY_15),
    row(2, 'Coastal', JULY_15),
    row(3, 'Kamloops', JULY_15),
    row(4, 'Northwest', JULY_28),
    row(5, 'Prince George', JULY_28),
    row(6, 'Southeast', JULY_15),
  ],
};
