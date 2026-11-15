import { useEffect, useRef } from 'react';
import { useMap } from 'react-map-gl/maplibre';
import { FireBan } from '../types/ban';
import { LatLng } from '../types/geo';
import { focusBounds } from '../utils/bounds';
import { logger } from '../utils/logger';

interface Props {
  target: LatLng | null;
  bans: FireBan[];
}

const POINT_ZOOM = 12;
const TOP_PADDING = 70;
const SIDE_PADDING = 30;
/** Share of the map's height the results panel can cover at the bottom. */
const PANEL_SHARE = 0.55;
const MIN_VISIBLE_HEIGHT = 120;

/** Moves the map each time `target` is a new object: fits the view to the bans covering it, or flies to the point when none do. Draws nothing. */
export function MapFocus({ target, bans }: Props) {
  const { current: map } = useMap();
  const latest = useRef(bans);
  latest.current = bans;

  useEffect(() => {
    if (!target || !map) return;
    const covering = latest.current;
    if (covering.length === 0) {
      logger.log('[MapFocus] flying to the point, no bans cover it');
      map.flyTo({ center: [target.longitude, target.latitude], zoom: POINT_ZOOM });
      return;
    }
    const { west, south, east, north } = focusBounds(covering, target);
    const height = map.getContainer().clientHeight;
    const bottom = Math.max(0, Math.min(height * PANEL_SHARE, height - TOP_PADDING - MIN_VISIBLE_HEIGHT));
    logger.log('[MapFocus] fitting the view to', covering.length, 'bans');
    map.fitBounds([[west, south], [east, north]], {
      padding: { top: TOP_PADDING, left: SIDE_PADDING, right: SIDE_PADDING, bottom: Math.round(bottom) },
      maxZoom: POINT_ZOOM,
    });
  }, [target, map]);

  return null;
}
