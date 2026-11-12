import { renderHook } from '@testing-library/react-native';
import { LatLng } from './useFireZones';
import { useFireBans } from './useFireBans';

const KAMLOOPS = { latitude: 50.67, longitude: -120.33 };
const KELOWNA = { latitude: 49.89, longitude: -119.5 };
const NORTHERN_BC = { latitude: 58, longitude: -125 };

const idsAt = async (location: LatLng | null) => {
  const { result } = await renderHook(() => useFireBans(location));
  return result.current.map(ban => ban.id);
};

describe('useFireBans', () => {
  it('returns no bans when there is no location', async () => {
    expect(await idsAt(null)).toEqual([]);
  });

  it('returns no bans outside every jurisdiction', async () => {
    expect(await idsAt(NORTHERN_BC)).toEqual([]);
  });

  it('returns every ban covering Kamloops, broadest first', async () => {
    expect(await idsAt(KAMLOOPS)).toEqual([
      'provincial-kamloops-fc',
      'provincial-okanagan-fc',
      'rd-thompson-nicola',
      'muni-kamloops',
    ]);
  });

  it('returns every ban covering Kelowna, broadest first', async () => {
    expect(await idsAt(KELOWNA)).toEqual([
      'provincial-okanagan-fc',
      'rd-thompson-nicola',
      'muni-kelowna',
    ]);
  });

  it('keeps the same result while the location is unchanged', async () => {
    const { result, rerender } = await renderHook(
      ({ location }: { location: LatLng }) => useFireBans(location),
      { initialProps: { location: KAMLOOPS } },
    );
    const first = result.current;
    await rerender({ location: KAMLOOPS });
    expect(result.current).toBe(first);
  });

  it('updates when the location changes', async () => {
    const { result, rerender } = await renderHook(
      ({ location }: { location: LatLng | null }) => useFireBans(location),
      { initialProps: { location: KAMLOOPS as LatLng | null } },
    );
    expect(result.current).not.toHaveLength(0);
    await rerender({ location: null });
    expect(result.current).toEqual([]);
  });
});
