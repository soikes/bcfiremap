import { useMemo } from "react";
import zonesGeoJson from "../data/fireZones.json";
import { logger } from "../utils/logger";

type Coord = [number, number]; // [lng, lat]

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface FireZonePolygon {
  outer: LatLng[];
  holes: LatLng[][];
}

export interface FireZone {
  id: string;
  name: string;
  centre: string;
  polygons: FireZonePolygon[];
  centroid: LatLng;
}

function toLatLng([lng, lat]: Coord): LatLng {
  return { latitude: lat, longitude: lng };
}

function centroid(coords: LatLng[]): LatLng {
  let area = 0;
  let lat = 0;
  let lng = 0;
  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const a = coords[i];
    const b = coords[(i + 1) % n];
    const cross = a.longitude * b.latitude - b.longitude * a.latitude;
    area += cross;
    lat += (a.latitude + b.latitude) * cross;
    lng += (a.longitude + b.longitude) * cross;
  }
  area /= 2;
  return { latitude: lat / (6 * area), longitude: lng / (6 * area) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFeature(feature: any, index: number): FireZone {
  const { geometry, properties } = feature;

  const rings: Coord[][][] =
    geometry.type === "MultiPolygon"
      ? geometry.coordinates
      : [geometry.coordinates];

  const polygons: FireZonePolygon[] = rings.map((poly) => ({
    outer: poly[0].map(toLatLng),
    holes: poly.slice(1).map((ring: Coord[]) => ring.map(toLatLng)),
  }));

  // Use the largest polygon's outer ring for the centroid
  const largest = polygons.reduce((a, b) =>
    a.outer.length >= b.outer.length ? a : b,
  );

  return {
    id: `zone-${index}`,
    name: properties.MOF_FIRE_ZONE_NAME,
    centre: properties.MOF_FIRE_CENTRE_NAME,
    polygons,
    centroid: centroid(largest.outer),
  };
}

/** Parses the bundled fire zone GeoJSON once and returns the zones. */
export function useFireZones(): { zones: FireZone[] } {
  const zones = useMemo(() => {
    const parsed = zonesGeoJson.features.map(parseFeature);
    logger.log("[useFireZones] parsed zones", parsed.length);
    return parsed;
  }, []);
  return { zones };
}
