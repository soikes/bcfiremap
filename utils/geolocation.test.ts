import { afterEach, describe, expect, it } from 'bun:test';
import { currentLocation } from './geolocation';

const setGeolocation = (value: unknown) => Object.defineProperty(navigator, 'geolocation', { value, configurable: true });

afterEach(() => setGeolocation(undefined));

describe('currentLocation', () => {
  it('resolves with the device position', async () => {
    setGeolocation({ getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 49.2, longitude: -123.1 } }) });
    expect(await currentLocation()).toEqual({ latitude: 49.2, longitude: -123.1 });
  });

  it('rejects with a clear message when access is blocked', async () => {
    setGeolocation({ getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1, PERMISSION_DENIED: 1, message: 'denied' }) });
    await expect(currentLocation()).rejects.toThrow('Location access was blocked');
  });

  it('rejects with a general message for any other failure', async () => {
    setGeolocation({ getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 3, PERMISSION_DENIED: 1, message: 'timeout' }) });
    await expect(currentLocation()).rejects.toThrow('Couldn’t find your location');
  });

  it('rejects when the browser has no geolocation', async () => {
    setGeolocation(undefined);
    await expect(currentLocation()).rejects.toThrow('can’t share your location');
  });
});
