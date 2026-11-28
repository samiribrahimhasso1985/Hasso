import type { LngLat } from './geo';
import type { Difficulty } from './stats';

export interface Place {
  name: string;
  coord: LngLat;
  /** Where the place came from: geocoder, map pick, GPS or coordinates. */
  origin: 'geocoder' | 'map' | 'gps' | 'coordinates' | 'atlas';
  detail?: string;
  category?: string;
}

/** Route types that the Valhalla pedestrian costing can actually express. */
export type RouteType = 'standard' | 'shortest' | 'easier' | 'mountain';

export interface RouteRequest {
  points: Place[]; // start, stops…, destination
  type: RouteType;
  roundTrip: boolean;
}

export interface Route {
  id: string;
  label: 'main' | 'alternative';
  coords: LngLat[];
  /** Cumulative distance per vertex (m). */
  cum: number[];
  distanceKm: number;
  /** Valhalla's own time estimate (s) for walking, informational. */
  valhallaTimeS: number;
  elevation: { d: number; h: number | null }[];
  ascent: number;
  descent: number;
  minEle: number | null;
  maxEle: number | null;
  elevationCoverage: number;
  hikingHours: number;
  difficulty: Difficulty;
  maxSac: number | null;
  surfaces: { surface: string; km: number }[];
  /** Distance along route (m) of each waypoint (start, stops, destination). */
  waypointDistances: number[];
  maneuvers: { instruction: string; lengthKm: number; beginIndex: number }[];
  provider: 'valhalla';
  computedAt: string;
}

export interface Journey {
  id: string;
  kind: 'planned' | 'recorded';
  name: string;
  createdAt: string;
  request?: RouteRequest;
  route?: Route;
  track?: TrackPoint[];
  notes?: string;
  photoIds?: string[];
  visited?: Place[];
}

export interface TrackPoint {
  t: number; // epoch ms
  lon: number;
  lat: number;
  alt: number | null;
  acc: number;
  speed: number | null;
}
