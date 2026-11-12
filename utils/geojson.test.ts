import { makeBan } from '../test/fixtures';
import { bansToFeatureCollection, pointToFeatureCollection } from './geojson';

describe('bansToFeatureCollection', () => {
  it('makes one feature per ban that keeps the ban geometry', () => {
    const ban = makeBan();
    const [feature] = bansToFeatureCollection([ban]).features;
    expect(feature.geometry).toBe(ban.geometry);
  });

  it('carries id, level and region as properties', () => {
    const [feature] = bansToFeatureCollection([
      makeBan({ id: 'rd-1', level: 'regional-district', region: 'Some District' }),
    ]).features;
    expect(feature.id).toBe('rd-1');
    expect(feature.properties).toEqual({ id: 'rd-1', level: 'regional-district', region: 'Some District' });
  });

  it('keeps MultiPolygon geometries', () => {
    const geometry = {
      type: 'MultiPolygon' as const,
      coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]], [[[5, 5], [6, 5], [6, 6], [5, 5]]]],
    };
    const [feature] = bansToFeatureCollection([makeBan({ geometry })]).features;
    expect(feature.geometry.type).toBe('MultiPolygon');
  });

  it('returns an empty collection for no bans', () => {
    expect(bansToFeatureCollection([]).features).toEqual([]);
  });
});

describe('pointToFeatureCollection', () => {
  it('makes a single point as [longitude, latitude]', () => {
    const { features } = pointToFeatureCollection({ latitude: 50.67, longitude: -120.33 });
    expect(features).toHaveLength(1);
    expect(features[0].geometry).toEqual({ type: 'Point', coordinates: [-120.33, 50.67] });
  });
});
