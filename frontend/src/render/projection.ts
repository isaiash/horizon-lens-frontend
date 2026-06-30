/**
 * Projection
 * ==========
 * Maps (azimuth, elevationAngle) pairs to screen (x, y) coordinates given
 * the device's current heading (yaw) and pitch, and the display's horizontal
 * field of view.
 *
 * Coordinate conventions
 * ----------------------
 * - azimuth: 0–360°, 0 = North, clockwise (same as compass bearing)
 * - elevationAngle: radians; positive = above horizontal
 * - heading: 0–360°, direction the device points (North = 0, East = 90)
 * - pitch: degrees; 0 = horizontal, +90 = pointing straight up
 * - hFov: horizontal field of view in degrees (default 70° for mobile portrait)
 *
 * Screen mapping
 * --------------
 * Horizontal:
 *   deltaAz = angleDiff(azimuth, heading)   — positive = right of centre
 *   x = width/2 + (deltaAz / hFov) * width
 *
 * Vertical:
 *   vFov = hFov * (height / width)
 *   deltaEl = elevationAngle (rad → deg) − pitch
 *   y = height/2 − (deltaEl / vFov) * height
 *   (y increases downward; lower elevation = higher y)
 */

import { appConfig, DEFAULT_HFOV_DEG } from "../config";

export { DEFAULT_HFOV_DEG };

/** Shortest signed angular difference a→b in [−180, 180] degrees. */
export function angleDiff(a: number, b: number): number {
  let d = ((a - b + 180) % 360 + 360) % 360 - 180;
  return d;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  /** Whether the point is within the visible viewport. */
  visible: boolean;
}

export function project(
  azimuthDeg: number,
  elevationRad: number,
  headingDeg: number,
  pitchDeg: number,
  width: number,
  height: number,
  hFovDeg: number = DEFAULT_HFOV_DEG
): ProjectedPoint {
  const elevDeg = (elevationRad * 180) / Math.PI;
  const vFovDeg = hFovDeg * (height / width);

  const dAz = angleDiff(azimuthDeg, headingDeg);
  const dEl = elevDeg - pitchDeg;

  const x = width / 2 + (dAz / hFovDeg) * width;
  const y = height / 2 - (dEl / vFovDeg) * height;

  const margin = appConfig.depthOfField.offScreenMarginPx;
  const visible =
    x >= -margin && x <= width + margin &&
    y >= -margin && y <= height + margin;

  return { x, y, visible };
}

/**
 * Build a screen-space polyline for the full 360° skyline.
 * Handles the wrap-around at 0°/360° by splitting into segments
 * when a large horizontal jump is detected.
 */
export interface ScreenSegment {
  points: { x: number; y: number }[];
  isSea: boolean;
}

export function buildSkylineSegments(
  skyline: {
    azimuth: number;
    elevation_angle: number | null;
    is_sea?: boolean;
  }[],
  headingDeg: number,
  pitchDeg: number,
  width: number,
  height: number,
  hFovDeg: number = DEFAULT_HFOV_DEG
): ScreenSegment[] {
  if (skyline.length === 0) return [];

  const segments: ScreenSegment[] = [];
  let current: { x: number; y: number }[] = [];
  let currentIsSea = false;

  const flush = () => {
    if (current.length > 1) segments.push({ points: current, isSea: currentIsSea });
    current = [];
  };

  for (let i = 0; i < skyline.length; i++) {
    const pt = skyline[i];
    if (pt.elevation_angle === null) {
      flush();
      continue;
    }

    const isSea = pt.is_sea ?? false;

    const { x, y } = project(
      pt.azimuth,
      pt.elevation_angle,
      headingDeg,
      pitchDeg,
      width,
      height,
      hFovDeg
    );

    if (current.length > 0) {
      const prev = current[current.length - 1];
      if (Math.abs(x - prev.x) > width * 0.8 || isSea !== currentIsSea) {
        flush();
      }
    }

    if (current.length === 0) {
      currentIsSea = isSea;
    }

    current.push({ x, y });
  }

  flush();
  return segments;
}
