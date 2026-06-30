/**
 * Frontend skyline cache
 * ======================
 * Keeps the most recently fetched skyline so orientation changes can
 * reproject the existing data without triggering a new API request.
 */

import { SkylineResponse } from "../api/client";

let _cached: SkylineResponse | null = null;
let _cachedAt: { lat: number; lon: number } | null = null;

export function setCachedSkyline(
  response: SkylineResponse,
  lat: number,
  lon: number
): void {
  _cached = response;
  _cachedAt = { lat, lon };
}

export function getCachedSkyline(): SkylineResponse | null {
  return _cached;
}

export function getCachedAt(): { lat: number; lon: number } | null {
  return _cachedAt;
}

export function clearSkylineCache(): void {
  _cached = null;
  _cachedAt = null;
}
