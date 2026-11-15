import { LatLng } from '../types/geo';
import { logger } from './logger';

const BLOCKED = 'Location access was blocked. Allow it in your browser’s settings for this site, and check that location services are on for your browser.';

/** The message to show for a failed position request, by the kind of failure the browser reported. */
function failureMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) return BLOCKED;
  if (error.code === error.POSITION_UNAVAILABLE) return 'Your device couldn’t work out where it is. Check that location services are on for your browser.';
  if (error.code === error.TIMEOUT) return 'Finding your location took too long. Try again.';
  return 'Couldn’t find your location';
}

/** Asks the browser for the device's position; rejects with a message fit to show the user when it is unavailable, denied, on an insecure page or times out. */
export function currentLocation(timeoutMs = 10000): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    logger.log('[geolocation] asking', { origin: window.location.origin, secure: window.isSecureContext });
    if (window.isSecureContext === false) return reject(new Error('Your location is only available over a secure (https) connection'));
    if (!navigator.geolocation) return reject(new Error('Your browser can’t share your location'));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        logger.log('[geolocation] got a position');
        resolve({ latitude: coords.latitude, longitude: coords.longitude });
      },
      error => {
        logger.error('[geolocation] failed', error.code, error.message);
        reject(new Error(failureMessage(error)));
      },
      { timeout: timeoutMs, maximumAge: 60000 },
    );
  });
}
