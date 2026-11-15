export interface LatLng {
  latitude: number;
  longitude: number;
}

/** A named place found by a search. */
export interface Place {
  name: string;
  location: LatLng;
}

/** A box on the map, in degrees. */
export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}
