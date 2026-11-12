import { LatLng } from '../types/geo';

/**
 * Ray-casting point-in-polygon test.
 *
 * Casts a ray from `point` in the +longitude direction and counts
 * how many edges of `polygon` it crosses. An odd count means inside.
 */
export function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  const { latitude: py, longitude: px } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { latitude: iy, longitude: ix } = polygon[i];
    const { latitude: jy, longitude: jx } = polygon[j];
    if (
      (iy > py) !== (jy > py) &&
      px < ((jx - ix) * (py - iy)) / (jy - iy) + ix
    ) {
      inside = !inside;
    }
  }
  return inside;
}
