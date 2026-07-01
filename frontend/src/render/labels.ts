/**
 * Label layout
 * ============
 * Computes screen positions of peak and city labels with leader lines.
 */

import { Peak } from "../api/client";
import { project, DEFAULT_HFOV_DEG } from "./projection";
import { appConfig } from "../config";

export const LABEL_FONT_SIZE = appConfig.labels.fontSizePx;
export const LABEL_LINE_HEIGHT = appConfig.labels.lineHeightPx;
export const LABEL_PADDING = appConfig.labels.paddingPx;
export const LABEL_WIDTH = appConfig.labels.widthPx;
export const LEADER_STUB = appConfig.labels.leaderStubPx;

export interface CityLabelInput {
  name: string | null;
  name_es: string | null;
  azimuth: number;
  distance_m: number;
  elevation_m: number | null;
  /** Always render even when off-screen or occluded */
  forceVisible?: boolean;
}

export interface LabelLayout {
  anchorX: number;
  anchorY: number;
  boxX: number;
  boxY: number;
  boxW: number;
  boxH: number;
  lines: string[];
  color: string;
  direction: "up" | "down";
  lineWidthMultiplier: number;
  placed: boolean;
}

export function formatHeight(m: number | null): string | null {
  if (m === null) return null;
  return `h ${Math.round(m)} m`;
}

export function formatDistance(m: number): string {
  return `dist ${(m / 1000).toFixed(1)} km`;
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isInViewport(
  ax: number,
  ay: number,
  width: number,
  height: number
): boolean {
  return ax >= 0 && ax <= width && ay >= 0 && ay <= height;
}

function buildUnnamedPeakLine(
  elevationM: number | null,
  distanceM: number
): string {
  const distPart = `d${(distanceM / 1000).toFixed(1)}`;
  if (elevationM === null) return distPart;
  return `h${Math.round(elevationM)}/${distPart}`;
}

function buildLines(
  name: string | null | undefined,
  nameEs: string | null | undefined,
  elevationM: number | null,
  distanceM: number
): string[] {
  const lines = [name ?? nameEs ?? "—"];
  const h = formatHeight(elevationM);
  if (h) lines.push(h);
  lines.push(formatDistance(distanceM));
  return lines;
}

function labelHeight(lineCount: number): number {
  return LABEL_LINE_HEIGHT * lineCount + LABEL_PADDING * 2;
}

function resolveCollision(
  bx: number,
  by: number,
  boxW: number,
  boxH: number,
  occupied: { x: number; y: number; w: number; h: number }[],
  direction: "up" | "down",
  width: number
): { x: number; y: number } {
  let x = Math.max(4, Math.min(width - boxW - 4, bx));
  let y = by;
  let attempts = 0;
  while (attempts < 20) {
    const collision = occupied.some(
      (r) =>
        x < r.x + r.w &&
        x + boxW > r.x &&
        y < r.y + r.h &&
        y + boxH > r.y
    );
    if (!collision) break;
    y += direction === "up" ? -(boxH + 4) : boxH + 4;
    attempts++;
  }
  return { x, y };
}

export function computePeakLabels(
  peaks: Peak[],
  headingDeg: number,
  pitchDeg: number,
  width: number,
  height: number,
  fgColor: string,
  hFovDeg: number = DEFAULT_HFOV_DEG
): LabelLayout[] {
  const sorted = [...peaks].sort((a, b) => b.distance_m - a.distance_m);
  const placed: LabelLayout[] = [];
  const occupied: { x: number; y: number; w: number; h: number }[] = [];

  for (const peak of sorted) {
    const { x: ax, y: ay } = project(
      peak.azimuth,
      peak.elevation_angle,
      headingDeg,
      pitchDeg,
      width,
      height,
      hFovDeg
    );
    if (!isInViewport(ax, ay, width, height)) continue;

    const peakName = peak.name ?? peak.name_es;
    const lines = peakName
      ? buildLines(peak.name, peak.name_es, peak.elevation_m, peak.distance_m)
      : [buildUnnamedPeakLine(peak.elevation_m, peak.distance_m)];
    const color = peakName ? fgColor : withAlpha(fgColor, 0.55);
    const boxH = labelHeight(lines.length);
    let bx = ax - LABEL_WIDTH / 2;
    let by = ay - LEADER_STUB - boxH;
    const resolved = resolveCollision(bx, by, LABEL_WIDTH, boxH, occupied, "up", width);
    bx = resolved.x;
    by = resolved.y;
    occupied.push({ x: bx, y: by, w: LABEL_WIDTH, h: boxH });

    placed.push({
      anchorX: ax,
      anchorY: ay,
      boxX: bx,
      boxY: by,
      boxW: LABEL_WIDTH,
      boxH,
      lines,
      color,
      direction: "up",
      lineWidthMultiplier: 1,
      placed: true,
    });
  }

  return placed;
}

export function computeCityLabels(
  cities: CityLabelInput[],
  headingDeg: number,
  pitchDeg: number,
  width: number,
  height: number,
  fgColor: string,
  hFovDeg: number = DEFAULT_HFOV_DEG
): LabelLayout[] {
  const sorted = [...cities].sort((a, b) => b.distance_m - a.distance_m);
  const placed: LabelLayout[] = [];
  const occupied: { x: number; y: number; w: number; h: number }[] = [];

  for (const city of sorted) {
    const { x: ax, y: ay } = project(
      city.azimuth,
      0,
      headingDeg,
      pitchDeg,
      width,
      height,
      hFovDeg
    );
    if (!isInViewport(ax, ay, width, height) && !city.forceVisible) continue;

    const lines = buildLines(
      city.name,
      city.name_es,
      city.elevation_m,
      city.distance_m
    );
    const boxH = labelHeight(lines.length);
    let bx = ax - LABEL_WIDTH / 2;
    let by = ay + LEADER_STUB;
    const resolved = resolveCollision(bx, by, LABEL_WIDTH, boxH, occupied, "down", width);
    bx = resolved.x;
    by = resolved.y;
    occupied.push({ x: bx, y: by, w: LABEL_WIDTH, h: boxH });

    placed.push({
      anchorX: ax,
      anchorY: ay,
      boxX: bx,
      boxY: by,
      boxW: LABEL_WIDTH,
      boxH,
      lines,
      color: fgColor,
      direction: "down",
      lineWidthMultiplier: 2,
      placed: true,
    });
  }

  return placed;
}

/** @deprecated use computePeakLabels */
export function computeLabels(
  peaks: Peak[],
  headingDeg: number,
  pitchDeg: number,
  width: number,
  height: number,
  hFovDeg: number = DEFAULT_HFOV_DEG,
  _distanceMinM?: number,
  _distanceMaxM?: number
): LabelLayout[] {
  const fg =
    appConfig.ui.skylineColor;
  return computePeakLabels(
    peaks,
    headingDeg,
    pitchDeg,
    width,
    height,
    fg,
    hFovDeg
  );
}
