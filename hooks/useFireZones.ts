import { useEffect, useState } from "react";
import { logger } from "../utils/logger";

const URL =
  "https://openmaps.gov.bc.ca/geo/pub/ows" +
  "?service=WFS&version=2.0.0&request=GetFeature" +
  "&typeName=pub:WHSE_LEGAL_ADMIN_BOUNDARIES.DRP_MOF_FIRE_ZONES_SP" +
  "&outputFormat=application/json" +
  "&srsName=EPSG:4326";

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

export function useFireZones(): {
  zones: FireZone[];
  loading: boolean;
  error: Error | null;
} {
  const [zones, setZones] = useState<FireZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    logger.log("[useFireZones] fetching", URL);
    fetch(URL)
      .then((r) => {
        logger.log("[useFireZones] response status", r.status);
        return r.json();
      })
      .then((data) => {
        logger.log(
          "[useFireZones] feature count",
          data.features?.length,
          "keys",
          Object.keys(data),
        );
        const zones = data.features.map(parseFeature);
        logger.log("[useFireZones] parsed zones", zones.length);
        const sample = zones[0]?.polygons[0]?.outer[0];
        logger.log("[useFireZones] sample coord", sample);
        setZones(zones);
      })
      .catch((err) => {
        logger.error("[useFireZones] error", err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { zones, loading, error };
}
