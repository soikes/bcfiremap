import { makeBan, makeZone } from '../test/fixtures';
import {
  bansToFeatureCollection,
  pointToFeatureCollection,
  zoneLabelsToFeatureCollection,
  zonesToFeatureCollection,
} from './geojson';

describe('zonesToFeatureCollection', () => {
  const [feature] = zonesToFeatureCollection([makeZone()]).features;

  it('makes one MultiPolygon feature per zone with its id and properties', () => {
    expect(feature.id).toBe('zone-0');
    expect(feature.geometry.type).toBe('MultiPolygon');
    expect(feature.properties).toEqual({ name: 'Test Zone', centre: 'Test Centre' });
  });

  it('writes positions as [longitude, latitude]', () => {
    expect(feature.geometry.coordinates[0][0][0]).toEqual([-120, 49]);
  });

  it('puts the outer ring first and keeps holes after it', () => {
    const [polygon] = feature.geometry.coordinates;
    expect(polygon).toHaveLength(2);
    expect(polygon[0]).toHaveLength(3);
    expect(polygon[1][0]).toEqual([-119.9, 49.1]);
  });

  it('returns an empty collection for no zones', () => {
    expect(zonesToFeatureCollection([]).features).toEqual([]);
  });
});

describe('zoneLabelsToFeatureCollection', () => {
  it('makes a point at the zone centroid carrying the zone name', () => {
    const [feature] = zoneLabelsToFeatureCollection([makeZone()]).features;
    expect(feature.geometry).toEqual({ type: 'Point', coordinates: [-119.6, 49.3] });
    expect(feature.properties).toEqual({ name: 'Test Zone' });
  });
});

describe('bansToFeatureCollection', () => {
  it('closes an open ring by repeating the first position', () => {
    const [feature] = bansToFeatureCollection([makeBan()]).features;
    const [ring] = feature.geometry.coordinates;
    expect(ring).toHaveLength(5);
    expect(ring[4]).toEqual(ring[0]);
  });

  it('leaves an already closed ring alone', () => {
    const open = makeBan().polygon;
    const [feature] = bansToFeatureCollection([makeBan({ polygon: [...open, open[0]] })]).features;
    expect(feature.geometry.coordinates[0]).toHaveLength(5);
  });

  it('carries id, level and region as properties', () => {
    const [feature] = bansToFeatureCollection([
      makeBan({ id: 'rd-1', level: 'regional-district', region: 'Some District' }),
    ]).features;
    expect(feature.id).toBe('rd-1');
    expect(feature.properties).toEqual({ id: 'rd-1', level: 'regional-district', region: 'Some District' });
  });
});

describe('pointToFeatureCollection', () => {
  it('makes a single point as [longitude, latitude]', () => {
    const { features } = pointToFeatureCollection({ latitude: 50.67, longitude: -120.33 });
    expect(features).toHaveLength(1);
    expect(features[0].geometry).toEqual({ type: 'Point', coordinates: [-120.33, 50.67] });
  });
});
