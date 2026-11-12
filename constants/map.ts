import type { StyleSpecification } from 'maplibre-gl';
import osmBright from '../assets/map-style/osm-bright.json';

const OPENFREEMAP = 'https://tiles.openfreemap.org';

const BASEMAP_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> ' +
  '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> ' +
  'Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | ' +
  'Style: <a href="https://github.com/openmaptiles/osm-bright-gl-style" target="_blank">OSM Bright</a> ' +
  '&copy; MapTiler &amp; OpenMapTiles contributors ' +
  '(<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank">CC BY 4.0</a>)';

export const BASEMAP_STYLE = {
  ...osmBright,
  sources: {
    openmaptiles: { type: 'vector', url: `${OPENFREEMAP}/planet`, attribution: BASEMAP_ATTRIBUTION },
  },
  glyphs: `${OPENFREEMAP}/fonts/{fontstack}/{range}.pbf`,
} as unknown as StyleSpecification;

export const INITIAL_VIEW = { latitude: 54, longitude: -125, zoom: 4.5 };

export const FIRE_ZONES_URL =
  'https://services6.arcgis.com/ubm4tcTYICKBpist/arcgis/rest/services/British_Columbia_Fire_Zone_Boundaries/FeatureServer/0/query' +
  '?where=1%3D1&outFields=FIRE_ZONE,FIRE_CENTRE&outSR=4326&f=geojson&geometryPrecision=4&maxAllowableOffset=0.005';

// Disabled pending licensing clarification.
export const SHOW_FIRE_ZONES = false;
