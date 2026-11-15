import { FormEvent, useEffect, useRef, useState } from 'react';
import { LatLng, Place } from '../types/geo';
import { searchPlaces } from '../utils/geocode';
import { currentLocation } from '../utils/geolocation';
import { logger } from '../utils/logger';
import './LocationSearch.css';

interface Props {
  onLocate: (location: LatLng) => void;
  messageMs?: number;
}

const DEFAULT_MESSAGE_MS = 6000;

/** Search box and "My location" button over the map; reports the chosen place as a LatLng, listing the matches when a search finds several, and shows a message for a few seconds when there is nothing to pick or the lookup failed. */
export function LocationSearch({ onLocate, messageMs = DEFAULT_MESSAGE_MS }: Props) {
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), messageMs);
    return () => clearTimeout(timer);
  }, [message, messageMs]);

  /** Clears the results and message, then hands the location on. */
  function choose(location: LatLng) {
    setPlaces([]);
    setMessage(null);
    onLocate(location);
  }

  /** Searches for the typed text: goes straight to a single match, lists several, and says so when there are none or the search failed. */
  async function search(event: FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    controller.current?.abort();
    const current = (controller.current = new AbortController());
    setBusy(true);
    setPlaces([]);
    setMessage(null);
    try {
      const found = await searchPlaces(query, current.signal);
      if (current.signal.aborted) return;
      if (found.length === 1) choose(found[0].location);
      else if (found.length === 0) setMessage('No places found in British Columbia');
      else setPlaces(found);
    } catch (error) {
      if (current.signal.aborted) return;
      logger.error('[LocationSearch] search failed', error);
      setMessage('Place search isn’t available right now');
    } finally {
      if (!current.signal.aborted) setBusy(false);
    }
  }

  /** Asks the browser for the device's position and hands it on. */
  async function locateMe() {
    setBusy(true);
    setPlaces([]);
    setMessage(null);
    try {
      choose(await currentLocation());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Couldn’t find your location');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="location-search">
      <form className="location-search-form" role="search" onSubmit={search}>
        <input
          className="location-search-input"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Search for a place"
          aria-label="Search for a place"
        />
        <button type="submit" className="location-search-button" disabled={busy || !query.trim()}>
          Search
        </button>
        <button type="button" className="location-search-button" disabled={busy} onClick={locateMe}>
          My location
        </button>
      </form>
      {message ? (
        <p className="location-search-message" role="status">
          {message}
        </p>
      ) : null}
      {places.length > 0 ? (
        <ul className="location-search-results" aria-label="Search results">
          {places.map(place => (
            <li key={`${place.location.latitude},${place.location.longitude}`}>
              <button type="button" className="location-search-result" onClick={() => choose(place.location)}>
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
