/**
 * useGeolocation
 * ==============
 * Watches the device GPS position using the Geolocation API.
 * Returns the current position or an error string.
 *
 * The hook only triggers a new skyline request when the observer
 * has moved more than RECOMPUTE_THRESHOLD_M metres since the last
 * computation, preventing unnecessary API calls.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { appConfig } from "../config";

const { recomputeThresholdM: RECOMPUTE_THRESHOLD_M } = appConfig.gps;

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;   // metres
  altitude: number | null;
}

interface UseGeolocationResult {
  position: GeoPosition | null;
  error: string | null;
  /** Position that has actually moved beyond the threshold */
  triggeredPosition: GeoPosition | null;
  /**
   * Explicitly triggers a one-shot geolocation request from within a user
   * gesture, so browsers (notably iOS Safari) reliably show the permission
   * prompt instead of relying on the implicit watchPosition on mount.
   */
  requestLocation: () => void;
}

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useGeolocation(): UseGeolocationResult {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [triggeredPosition, setTriggeredPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastTriggeredRef = useRef<GeoPosition | null>(null);

  const handlePosition = useCallback((pos: GeolocationPosition) => {
    const next: GeoPosition = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      altitude: pos.coords.altitude,
    };
    setPosition(next);
    setError(null);

    const last = lastTriggeredRef.current;
    if (
      last === null ||
      haversineM(last.latitude, last.longitude, next.latitude, next.longitude) >=
        RECOMPUTE_THRESHOLD_M
    ) {
      lastTriggeredRef.current = next;
      setTriggeredPosition(next);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    const id = navigator.geolocation.watchPosition(handlePosition, (err) => {
      setError(`GPS error (${err.code}): ${err.message}`);
    }, {
      enableHighAccuracy: appConfig.gps.enableHighAccuracy,
      maximumAge: appConfig.gps.maximumAgeMs,
      timeout: appConfig.gps.timeoutMs,
    });

    return () => navigator.geolocation.clearWatch(id);
  }, [handlePosition]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(handlePosition, (err) => {
      setError(`GPS error (${err.code}): ${err.message}`);
    }, {
      enableHighAccuracy: appConfig.gps.enableHighAccuracy,
      maximumAge: appConfig.gps.maximumAgeMs,
      timeout: appConfig.gps.timeoutMs,
    });
  }, [handlePosition]);

  return { position, error, triggeredPosition, requestLocation };
}
