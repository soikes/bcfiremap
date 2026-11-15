import { afterEach, describe, expect, it } from 'bun:test';
import { currentLocation } from './geolocation';

const setGeolocation = (value: unknown) => Object.defineProperty(navigator, 'geolocation', { value, configurable: true });

const setSecure = (value: boolean) => Object.defineProperty(window, 'isSecureContext', { value, configurable: true });

afterEach(() => {
  setGeolocation(undefined);
  setSecure(true);
});

describe('currentLocation', () => {
  it('resolves with the device position', async () => {
    setGeolocation({ getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 49.2, longitude: -123.1 } }) });
    expect(await currentLocation()).toEqual({ latitude: 49.2, longitude: -123.1 });
  });

  it('rejects with a clear message when access is blocked', async () => {
    setGeolocation({ getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1, PERMISSION_DENIED: 1, message: 'denied' }) });
    await expect(currentLocation()).rejects.toThrow('Location access was blocked');
  });

  const failWith = (code: number) =>
    setGeolocation({
      getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) =>
        fail({ code, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3, message: 'failed' }),
    });

  it('says the device could not work out its position when none is available', async () => {
    failWith(2);
    await expect(currentLocation()).rejects.toThrow('couldn’t work out where it is');
  });

  it('says it took too long on a timeout', async () => {
    failWith(3);
    await expect(currentLocation()).rejects.toThrow('took too long');
  });

  it('rejects with a general message for any other failure', async () => {
    failWith(0);
    await expect(currentLocation()).rejects.toThrow('Couldn’t find your location');
  });

  it('rejects when the browser has no geolocation', async () => {
    setGeolocation(undefined);
    await expect(currentLocation()).rejects.toThrow('can’t share your location');
  });

  it('says what to check when access is blocked', async () => {
    setGeolocation({ getCurrentPosition: (_ok: unknown, fail: (e: unknown) => void) => fail({ code: 1, PERMISSION_DENIED: 1, message: 'denied' }) });
    await expect(currentLocation()).rejects.toThrow('settings for this site');
  });

  it('rejects without asking when the page is not a secure context', async () => {
    let asked = false;
    setGeolocation({ getCurrentPosition: () => (asked = true) });
    setSecure(false);
    await expect(currentLocation()).rejects.toThrow('secure (https) connection');
    expect(asked).toBe(false);
  });
});
