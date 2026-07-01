/**
 * useDeviceOrientation
 * ====================
 * Reads compass heading (yaw) and tilt (pitch) from the device orientation API.
 *
 * On iOS 13+, the DeviceOrientationEvent requires explicit permission.
 * This hook exposes a `requestPermission()` function that must be called
 * from a user gesture (e.g. a tap) before orientation data is available.
 *
 * Heading convention
 * ------------------
 * - heading: 0–360°, 0 = North (magnetic north via compass), clockwise.
 *   Source: event.webkitCompassHeading (iOS) or, for absolute orientation
 *   events, derived from event.alpha.
 * - pitch: −90 to +90°, positive = looking up.
 *   Derived from event.beta (device tilt forward/back).
 */

import { useState, useEffect, useCallback } from "react";

export interface OrientationState {
  heading: number;        // 0–360°, 0 = North
  pitch: number;          // degrees, positive = looking up
  hasPermission: boolean;
  permissionError: string | null;
  requestPermission: () => Promise<void>;
}

// Extend the DeviceOrientationEvent type for iOS
interface IOSDeviceOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  requestPermission?: () => Promise<"granted" | "denied">;
}

function alphaToHeading(alpha: number | null): number {
  if (alpha === null) return 0;
  // alpha: compass bearing = (360 - alpha) % 360 for absolute orientation
  return (360 - alpha) % 360;
}

export function useDeviceOrientation(): OrientationState {
  const [heading, setHeading] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    const e = event as IOSDeviceOrientationEvent;

    // Prefer webkitCompassHeading (iOS) for accurate magnetic north
    let h: number;
    if (e.webkitCompassHeading !== undefined) {
      h = e.webkitCompassHeading;
    } else if (event.absolute && event.alpha !== null) {
      h = alphaToHeading(event.alpha);
    } else if (event.alpha !== null) {
      // Non-absolute: still useful for relative rotation tracking
      h = alphaToHeading(event.alpha);
    } else {
      return;
    }

    setHeading(h);

    // pitch: beta is tilt of the device relative to horizontal (−180 to 180°)
    // When held vertically (portrait AR-style), beta ≈ 90° and we map that to 0° pitch.
    const beta = event.beta ?? 90;
    const p = beta - 90; // −90=down, 0=horizontal, +90=up
    setPitch(p);
  }, []);

  const attachListener = useCallback(() => {
    window.addEventListener("deviceorientation", handleOrientation, true);
    window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    setHasPermission(true);
    setPermissionError(null);
  }, [handleOrientation]);

  const requestPermission = useCallback(async () => {
    const DeviceOrientation = DeviceOrientationEvent as unknown as IOSDeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };

    if (typeof DeviceOrientation.requestPermission === "function") {
      try {
        const result = await DeviceOrientation.requestPermission();
        if (result === "granted") {
          attachListener();
        } else {
          setPermissionError("Orientation permission denied.");
        }
      } catch (err) {
        setPermissionError(`Permission error: ${String(err)}`);
      }
    } else {
      // Android / desktop – no explicit permission needed
      attachListener();
    }
  }, [attachListener]);

  useEffect(() => {
    // Auto-attach on non-iOS platforms
    const DeviceOrientation = DeviceOrientationEvent as unknown as IOSDeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof DeviceOrientation.requestPermission !== "function") {
      attachListener();
    }
    return () => {
      window.removeEventListener("deviceorientation", handleOrientation, true);
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
    };
  }, [attachListener, handleOrientation]);

  return {
    heading,
    pitch,
    hasPermission,
    permissionError,
    requestPermission,
  };
}
