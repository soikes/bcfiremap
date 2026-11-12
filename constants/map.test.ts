import osmBright from '../assets/map-style/osm-bright.json';
import { BASEMAP_STYLE } from './map';

const style = BASEMAP_STYLE as unknown as {
  sources: Record<string, { type: string; url: string; attribution: string }>;
  glyphs: string;
  sprite: string;
  layers: { id: string; 'source-layer'?: string; layout?: { 'text-font'?: string[] } }[];
};

// Vector layers and font stacks that OpenFreeMap serves, checked against https://tiles.openfreemap.org when the style was adopted.
const OPENFREEMAP_LAYERS = [
  'aerodrome_label', 'aeroway', 'boundary', 'building', 'housenumber', 'landcover', 'landuse',
  'mountain_peak', 'park', 'place', 'poi', 'transportation', 'transportation_name', 'water',
  'water_name', 'waterway',
];
const OPENFREEMAP_FONTS = ['Noto Sans Regular', 'Noto Sans Bold', 'Noto Sans Italic'];

describe('BASEMAP_STYLE', () => {
  it('reads tiles and fonts from OpenFreeMap, with no MapTiler key placeholders left', () => {
    expect(style.sources.openmaptiles.url).toBe('https://tiles.openfreemap.org/planet');
    expect(style.glyphs).toBe('https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf');
    const withoutCredit = JSON.stringify({ ...style, sources: { openmaptiles: { ...style.sources.openmaptiles, attribution: '' } } });
    expect(withoutCredit).not.toMatch(/maptiler\.com|\{key\}/);
  });

  it('keeps the OSM Bright layers and sprite unchanged', () => {
    expect(style.layers).toEqual(osmBright.layers);
    expect(style.sprite).toBe('https://openmaptiles.github.io/osm-bright-gl-style/sprite');
  });

  it('only uses vector layers that OpenFreeMap provides', () => {
    const used = new Set(style.layers.map(layer => layer['source-layer']).filter(Boolean));
    used.forEach(name => expect(OPENFREEMAP_LAYERS).toContain(name));
  });

  it('only uses fonts that OpenFreeMap provides', () => {
    const fonts = new Set(style.layers.flatMap(layer => layer.layout?.['text-font'] ?? []));
    fonts.forEach(font => expect(OPENFREEMAP_FONTS).toContain(font));
  });

  it('credits OpenFreeMap, OpenMapTiles, OpenStreetMap and the OSM Bright design licence', () => {
    const credit = style.sources.openmaptiles.attribution;
    ['OpenFreeMap', 'OpenMapTiles', 'OpenStreetMap', 'OSM Bright', 'CC BY 4.0'].forEach(name =>
      expect(credit).toContain(name),
    );
  });
});
