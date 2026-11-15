import { renderHook } from '@testing-library/react';
import { describe, expect, it, spyOn } from 'bun:test';
import { SAMPLE_BANS, makeAllowedBan, makeBan, makePermitBan } from '../test/fixtures';
import { FireBan } from '../types/ban';
import { LatLng } from '../types/geo';
import { useBansAt } from './useBansAt';

const KAMLOOPS = { latitude: 50.67, longitude: -120.33 };
const KELOWNA = { latitude: 49.89, longitude: -119.5 };
const NORTHERN_BC = { latitude: 58, longitude: -125 };

const idsAt = (location: LatLng | null, bans: FireBan[] = SAMPLE_BANS) => {
  const { result } = renderHook(() => useBansAt(bans, location));
  return result.current.map(ban => ban.id);
};

describe('useBansAt', () => {
  it('returns no bans when there is no location', () => {
    expect(idsAt(null)).toEqual([]);
  });

  it('returns no bans outside every jurisdiction', () => {
    expect(idsAt(NORTHERN_BC)).toEqual([]);
  });

  it('returns no bans when there are no bans loaded', () => {
    expect(idsAt(KAMLOOPS, [])).toEqual([]);
  });

  it('returns every ban covering Kamloops, broadest first', () => {
    expect(idsAt(KAMLOOPS)).toEqual([
      'provincial-kamloops-fc',
      'provincial-okanagan-fc',
      'rd-thompson-nicola',
      'muni-kamloops',
    ]);
  });

  it('returns every ban covering Kelowna, broadest first', () => {
    expect(idsAt(KELOWNA)).toEqual([
      'provincial-okanagan-fc',
      'rd-thompson-nicola',
      'muni-kelowna',
    ]);
  });

  it('skips a ban whose geometry cannot be read and keeps the others', () => {
    const consoleError = spyOn(console, 'error').mockImplementation(() => {});
    const broken = { ...SAMPLE_BANS[0], id: 'broken', geometry: { type: 'Polygon', coordinates: [5] } } as unknown as FireBan;

    expect(idsAt(KELOWNA, [broken, ...SAMPLE_BANS])).toEqual(['provincial-okanagan-fc', 'rd-thompson-nicola', 'muni-kelowna']);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('keeps the same result while the inputs are unchanged', () => {
    const { result, rerender } = renderHook(
      ({ location }: { location: LatLng }) => useBansAt(SAMPLE_BANS, location),
      { initialProps: { location: KAMLOOPS } },
    );
    const first = result.current;
    rerender({ location: KAMLOOPS });
    expect(result.current).toBe(first);
  });

  it('updates when the location changes', () => {
    const { result, rerender } = renderHook(
      ({ location }: { location: LatLng | null }) => useBansAt(SAMPLE_BANS, location),
      { initialProps: { location: KAMLOOPS as LatLng | null } },
    );
    expect(result.current).not.toHaveLength(0);
    rerender({ location: null });
    expect(result.current).toEqual([]);
  });

  it('lists prohibited first, then by permit only, then allowed, each broadest first', () => {
    const bans = [
      makeAllowedBan({ id: 'allowed-provincial', level: 'provincial' }),
      makePermitBan({ id: 'permit-municipal', level: 'municipal' }),
      makeBan({ id: 'prohibited-municipal', level: 'municipal' }),
      makePermitBan({ id: 'permit-provincial', level: 'provincial' }),
    ];
    expect(idsAt({ latitude: 49.5, longitude: -119.5 }, bans)).toEqual([
      'prohibited-municipal', 'permit-provincial', 'permit-municipal', 'allowed-provincial',
    ]);
  });

  it('keeps allowed bans and lists restricted ones first', () => {
    const bans = [
      makeAllowedBan({ id: 'dormant-provincial', level: 'provincial' }),
      makeBan({ id: 'live-municipal', level: 'municipal' }),
      makeBan({ id: 'live-provincial', level: 'provincial' }),
    ];
    expect(idsAt({ latitude: 49.5, longitude: -119.5 }, bans)).toEqual(['live-provincial', 'live-municipal', 'dormant-provincial']);
  });
});
