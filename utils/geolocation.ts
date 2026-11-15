import { LatLng } from '../types/geo';
import { logger } from './logger';

/** Asks the browser for the device's position; rejects with a message fit to show the user when it is unavailable, denied or times out. */
export function currentLocation(timeoutMs = 10000): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Your browser can’t share your location'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        logger.log('[geolocation] got a position');
        resolve({ latitude: coords.latitude, longitude: coords.longitude });
      },
      error => {
        logger.error('[geolocation] failed', error.code, error.message);
        reject(new Error(error.code === error.PERMISSION_DENIED ? 'Location access was blocked' : 'Couldn’t find your location'));
      },
      { timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}
