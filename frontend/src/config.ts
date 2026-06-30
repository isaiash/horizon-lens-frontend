import raw from "../config.json";

export interface AppConfig {
  skyline: {
    defaultRadiusM: number;
    maxRadiusM: number;
    minHorizonDistanceM: number;
    seaLevelMaxM: number;
    azimuthStepDeg: number;
    observerHeightOffsetM: number;
    horizonLayers: number;
  };
  depthOfField: {
    horizontalFovDeg: number;
    lineWidthNearPx: number;
    lineWidthFarPx: number;
    distanceMinM: number;
    offScreenMarginPx: number;
  };
  gps: {
    recomputeThresholdM: number;
    enableHighAccuracy: boolean;
    maximumAgeMs: number;
    timeoutMs: number;
  };
  cache: {
    maxSize: number;
    gridM: number;
  };
  ui: {
    skyColor: string;
    skylineColor: string;
    seaColor: string;
    panStepDeg: number;
    compassSizePx: number;
    leaderLineWidthPx: number;
  };
  labels: {
    fontSizePx: number;
    lineHeightPx: number;
    paddingPx: number;
    widthPx: number;
    leaderStubPx: number;
  };
  api: {
    timeoutMs: number;
  };
  zoom: {
    minHFovDeg: number;
    maxHFovDeg: number;
    stepFactor: number;
    wheelStepFactor: number;
  };
}

export const appConfig = raw as AppConfig;

export const DEFAULT_HFOV_DEG = appConfig.depthOfField.horizontalFovDeg;
