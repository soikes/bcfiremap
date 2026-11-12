export const BASEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

export const INITIAL_VIEW = { latitude: 54, longitude: -125, zoom: 4.5 };

export const FIRE_ZONES_URL =
  'https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/British_Columbia_Fire_Zone_Boundaries/FeatureServer/0/query' +
  '?where=1%3D1&outFields=FIRE_ZONE,FIRE_CENTRE&outSR=4326&f=geojson&geometryPrecision=4&maxAllowableOffset=0.005';

// Disabled pending licensing clarification.
export const SHOW_FIRE_ZONES = false;
