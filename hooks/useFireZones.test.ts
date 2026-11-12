import { renderHook } from '@testing-library/react-native';
import { useFireZones } from './useFireZones';

describe('useFireZones', () => {
  it('parses the 32 bundled BC fire zones', async () => {
    const { result } = await renderHook(() => useFireZones());
    expect(result.current.zones).toHaveLength(32);
  });

  it('gives every zone a unique id, a name and a fire centre', async () => {
    const { zones } = (await renderHook(() => useFireZones())).result.current;
    expect(new Set(zones.map(zone => zone.id)).size).toBe(zones.length);
    zones.forEach(zone => {
      expect(zone.name).toBeTruthy();
      expect(zone.centre).toBeTruthy();
    });
  });

  it('gives every zone at least one polygon with a usable outer ring', async () => {
    const { zones } = (await renderHook(() => useFireZones())).result.current;
    zones.forEach(zone => {
      expect(zone.polygons.length).toBeGreaterThan(0);
      zone.polygons.forEach(polygon => expect(polygon.outer.length).toBeGreaterThanOrEqual(3));
    });
  });

  it('puts every centroid inside British Columbia', async () => {
    const { zones } = (await renderHook(() => useFireZones())).result.current;
    zones.forEach(({ centroid }) => {
      expect(centroid.latitude).toBeGreaterThan(48);
      expect(centroid.latitude).toBeLessThan(61);
      expect(centroid.longitude).toBeGreaterThan(-140);
      expect(centroid.longitude).toBeLessThan(-113);
    });
  });

  it('returns the same zones on re-render', async () => {
    const { result, rerender } = await renderHook(() => useFireZones());
    const first = result.current.zones;
    await rerender({});
    expect(result.current.zones).toBe(first);
  });
});
