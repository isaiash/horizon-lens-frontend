/**
 * API Client
 * ==========
 * Typed wrappers around the Horizon Lens backend endpoints.
 */

import { appConfig } from "../config";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export interface SkylinePoint {
  azimuth: number;          // degrees 0–360
  elevation_angle: number | null;  // radians; null = occluded / no sample
  distance_m: number | null;
  is_sea?: boolean;
}

export interface SkylineLayer {
  index: number;
  distance_min_m: number;
  distance_max_m: number;
  skyline: SkylinePoint[];
}

export interface Peak {
  azimuth: number;
  elevation_angle: number;
  distance_m: number;
  name: string | null;
  name_es: string | null;
  elevation_m: number | null;
  prominence_m: number | null;
  lat: number;
  lon: number;
  osm_id: number | null;
}

export interface SkylineMeta {
  observer_lat: number;
  observer_lon: number;
  observer_elev: number;
  radius_m: number;
  azimuth_step_deg: number;
  n_points: number;
  n_layers: number;
  cached: boolean;
}

export interface SkylineResponse {
  skyline: SkylinePoint[];
  layers: SkylineLayer[];
  peaks: Peak[];
  meta: SkylineMeta;
}

export interface SkylineRequest {
  latitude: number;
  longitude: number;
  observer_height?: number;
  radius?: number;
}

export async function fetchSkyline(req: SkylineRequest): Promise<SkylineResponse> {
  const res = await fetch(`${API_BASE}/api/skyline`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal: AbortSignal.timeout(appConfig.api.timeoutMs),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Skyline API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<SkylineResponse>;
}

export interface Mountain {
  osm_id: number | null;
  name: string | null;
  name_es: string | null;
  lat: number;
  lon: number;
  elevation_m: number | null;
  prominence_m: number | null;
  distance_m: number;
}

export async function fetchMountains(
  lat: number,
  lon: number,
  radius?: number
): Promise<Mountain[]> {
  const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
  if (radius !== undefined) params.set("radius", String(radius));
  const res = await fetch(`${API_BASE}/api/mountains?${params}`);
  if (!res.ok) {
    throw new Error(`Mountains API error ${res.status}`);
  }
  return res.json() as Promise<Mountain[]>;
}

export interface City {
  osm_id: number | null;
  name: string | null;
  name_es: string | null;
  lat: number;
  lon: number;
  elevation_m: number | null;
  population: number | null;
  place_type: string;
}

export interface PlacePeak {
  osm_id: number | null;
  name: string | null;
  name_es: string | null;
  lat: number;
  lon: number;
  elevation_m: number | null;
  prominence_m: number | null;
}

export interface PlacesResponse {
  cities: City[];
  peaks: PlacePeak[];
}

export async function fetchPlaces(): Promise<PlacesResponse> {
  const res = await fetch(`${API_BASE}/api/places`);
  if (!res.ok) {
    throw new Error(`Places API error ${res.status}`);
  }
  return res.json() as Promise<PlacesResponse>;
}
