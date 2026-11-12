import { makeBan } from '../test/fixtures';
import { bansToFeatureCollection, pointToFeatureCollection } from './geojson';

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

  it('writes positions as [longitude, latitude]', () => {
    const [feature] = bansToFeatureCollection([makeBan()]).features;
    expect(feature.geometry.coordinates[0][0]).toEqual([-120, 49]);
  });

  it('carries id, level and region as properties', () => {
    const [feature] = bansToFeatureCollection([
      makeBan({ id: 'rd-1', level: 'regional-district', region: 'Some District' }),
    ]).features;
    expect(feature.id).toBe('rd-1');
    expect(feature.properties).toEqual({ id: 'rd-1', level: 'regional-district', region: 'Some District' });
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
