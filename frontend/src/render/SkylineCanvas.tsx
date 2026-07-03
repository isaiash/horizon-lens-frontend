/**
 * SkylineCanvas
 * =============
 * Full-screen HTML5 Canvas component that renders the horizon skyline,
 * peak labels (upward leaders), and city labels (downward leaders).
 */

import React, {
  useRef,
  useEffect,
  useCallback,
  useState,
  type FC,
  type ReactNode,
} from "react";
import { SkylineResponse } from "../api/client";
import { appConfig } from "../config";
import {
  buildSkylineSegments,
  DEFAULT_HFOV_DEG,
} from "./projection";
import {
  computePeakLabels,
  computeCityLabels,
  LABEL_FONT_SIZE,
  LABEL_LINE_HEIGHT,
  LABEL_PADDING,
  LABEL_WIDTH,
  type CityLabelInput,
} from "./labels";

interface Props {
  skylineData: SkylineResponse | null;
  cities: CityLabelInput[];
  headingDeg: number;
  pitchDeg: number;
  headingReady: boolean;
  viewResetKey?: string;
  showLoadingBar: boolean;
  loadingPhase: "gps" | "computing";
  error: string | null;
  gpsAccuracy: number | null;
  fg: string;
  bg: string;
}

const {
  seaColor: SEA_COLOR,
  panStepDeg: PAN_STEP_DEG,
  compassSizePx: COMPASS_SIZE,
  leaderLineWidthPx: LEADER_LINE_WIDTH,
} = appConfig.ui;
const {
  lineWidthNearPx: SKYLINE_LINE_WIDTH_NEAR,
  lineWidthFarPx: SKYLINE_LINE_WIDTH_FAR,
  distanceMinM: DEPTH_DISTANCE_MIN_M,
} = appConfig.depthOfField;
const {
  minHFovDeg: ZOOM_MIN_HFOV,
  maxHFovDeg: ZOOM_MAX_HFOV,
  stepFactor: ZOOM_STEP_FACTOR,
  wheelStepFactor: ZOOM_WHEEL_STEP_FACTOR,
} = appConfig.zoom;

function clampHFov(deg: number): number {
  return Math.max(ZOOM_MIN_HFOV, Math.min(ZOOM_MAX_HFOV, deg));
}

function pointerDistance(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number }
): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.hypot(dx, dy);
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const SkylineCanvas: FC<Props> = ({
  skylineData,
  cities,
  headingDeg,
  pitchDeg,
  headingReady,
  viewResetKey,
  showLoadingBar,
  loadingPhase,
  error,
  gpsAccuracy,
  fg,
  bg,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [panOffsetDeg, setPanOffsetDeg] = useState(0);
  const [hFovDeg, setHFovDeg] = useState(DEFAULT_HFOV_DEG);
  const hFovRef = useRef(hFovDeg);
  const panOffsetRef = useRef(panOffsetDeg);
  const pointersRef = useRef(
    new Map<
      number,
      {
        clientX: number;
        clientY: number;
        startX: number;
        startOffset: number;
      }
    >()
  );
  const pinchRef = useRef<{
    initialDist: number;
    initialHFov: number;
  } | null>(null);

  useEffect(() => {
    hFovRef.current = hFovDeg;
  }, [hFovDeg]);

  useEffect(() => {
    panOffsetRef.current = panOffsetDeg;
  }, [panOffsetDeg]);

  useEffect(() => {
    if (viewResetKey === undefined) return;
    setPanOffsetDeg(0);
    panOffsetRef.current = 0;
  }, [viewResetKey]);

  const setZoom = useCallback((next: number | ((prev: number) => number)) => {
    setHFovDeg((prev) =>
      clampHFov(typeof next === "function" ? next(prev) : next)
    );
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((prev) => prev / ZOOM_STEP_FACTOR);
  }, [setZoom]);

  const zoomOut = useCallback(() => {
    setZoom((prev) => prev * ZOOM_STEP_FACTOR);
  }, [setZoom]);

  const effectiveHeading =
    ((((headingDeg + panOffsetDeg) % 360) + 360) % 360);

  const panBy = useCallback((deltaDeg: number) => {
    setPanOffsetDeg((prev) => prev + deltaDeg);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    pointersRef.current.set(e.pointerId, {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: e.clientX,
      startOffset: panOffsetRef.current,
    });
    e.currentTarget.setPointerCapture(e.pointerId);

    if (pointersRef.current.size === 2) {
      const pts = [...pointersRef.current.values()];
      pinchRef.current = {
        initialDist: pointerDistance(pts[0], pts[1]),
        initialHFov: hFovRef.current,
      };
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const ptr = pointersRef.current.get(e.pointerId);
    if (!ptr) return;

    ptr.clientX = e.clientX;
    ptr.clientY = e.clientY;

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = pointerDistance(pts[0], pts[1]);
      if (dist > 0 && pinchRef.current.initialDist > 0) {
        setZoom(
          pinchRef.current.initialHFov *
            (pinchRef.current.initialDist / dist)
        );
      }
      return;
    }

    if (pointersRef.current.size === 1) {
      const W = window.innerWidth || 1;
      const deltaX = e.clientX - ptr.startX;
      const degPerPx = hFovRef.current / W;
      setPanOffsetDeg(ptr.startOffset - deltaX * degPerPx);
    }
  }, [setZoom]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
      if (pointersRef.current.size === 1) {
        const remaining = [...pointersRef.current.values()][0];
        remaining.startX = remaining.clientX;
        remaining.startOffset = panOffsetRef.current;
      }
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may not be captured */
    }
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      setZoom(
        (prev) => prev * Math.pow(ZOOM_WHEEL_STEP_FACTOR, e.deltaY)
      );
    },
    [setZoom]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (skylineData && skylineData.skyline.length > 0 && headingReady) {
      const layers = skylineData.layers ?? [];
      const distanceMinM =
        layers[0]?.distance_min_m ?? DEPTH_DISTANCE_MIN_M;
      const distanceMaxM =
        layers[layers.length - 1]?.distance_max_m ??
        skylineData.meta.radius_m;

      if (layers.length > 0) {
        const sorted = [...layers].sort((a, b) => b.index - a.index);
        const n = sorted.length;

        for (const layer of sorted) {
          const segments = buildSkylineSegments(
            layer.skyline,
            effectiveHeading,
            pitchDeg,
            W,
            H,
            hFovDeg
          );
          if (segments.length === 0) continue;

          const depthT = (n - 1 - layer.index) / Math.max(n - 1, 1);
          const lineWidth =
            SKYLINE_LINE_WIDTH_FAR +
            depthT * (SKYLINE_LINE_WIDTH_NEAR - SKYLINE_LINE_WIDTH_FAR);

          for (const seg of segments) {
            if (seg.points.length < 2) continue;
            ctx.beginPath();
            ctx.strokeStyle = seg.isSea ? SEA_COLOR : fg;
            ctx.lineWidth = lineWidth;
            ctx.lineJoin = "round";
            ctx.moveTo(seg.points[0].x, seg.points[0].y);
            for (let i = 1; i < seg.points.length; i++) {
              ctx.lineTo(seg.points[i].x, seg.points[i].y);
            }
            ctx.stroke();
          }
        }
      } else {
        const segments = buildSkylineSegments(
          skylineData.skyline,
          effectiveHeading,
          pitchDeg,
          W,
          H,
          hFovDeg
        );
        for (const seg of segments) {
          if (seg.points.length < 2) continue;
          ctx.beginPath();
          ctx.strokeStyle = seg.isSea ? SEA_COLOR : fg;
          ctx.lineWidth = SKYLINE_LINE_WIDTH_NEAR;
          ctx.lineJoin = "round";
          ctx.moveTo(seg.points[0].x, seg.points[0].y);
          for (let i = 1; i < seg.points.length; i++) {
            ctx.lineTo(seg.points[i].x, seg.points[i].y);
          }
          ctx.stroke();
        }
      }

      if (skylineData.peaks.length > 0) {
        const peakLabels = computePeakLabels(
          skylineData.peaks,
          effectiveHeading,
          pitchDeg,
          W,
          H,
          fg,
          hFovDeg
        );
        _drawLabels(ctx, peakLabels);
      }
    }

    if (cities.length > 0) {
      const cityLabels = computeCityLabels(
        cities,
        effectiveHeading,
        pitchDeg,
        W,
        H,
        fg,
        hFovDeg
      );
      _drawLabels(ctx, cityLabels);
    }

    _drawHud(ctx, W, H, gpsAccuracy, error, fg);

    if (showLoadingBar || (skylineData && skylineData.skyline.length > 0 && !headingReady)) {
      _drawLoadingBar(ctx, W, H, performance.now(), loadingPhase, fg, bg);
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [
    skylineData,
    cities,
    effectiveHeading,
    pitchDeg,
    showLoadingBar,
    loadingPhase,
    error,
    gpsAccuracy,
    fg,
    bg,
    hFovDeg,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [draw]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        touchAction: "none",
        userSelect: "none",
        background: bg,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "block",
          background: bg,
        }}
      />

      <PanButton
        side="left"
        label="Pan left"
        fg={fg}
        bg={bg}
        onPress={() => panBy(-PAN_STEP_DEG)}
      />
      <PanButton
        side="right"
        label="Pan right"
        fg={fg}
        bg={bg}
        onPress={() => panBy(PAN_STEP_DEG)}
      />

      <Compass headingDeg={effectiveHeading} fg={fg} bg={bg} />

      <ZoomControls fg={fg} bg={bg} onZoomIn={zoomIn} onZoomOut={zoomOut} />
    </div>
  );
};

function _drawLabels(
  ctx: CanvasRenderingContext2D,
  labels: ReturnType<typeof computePeakLabels>
): void {
  ctx.font = `${LABEL_FONT_SIZE}px "SF Mono", "Consolas", monospace`;

  for (const lbl of labels) {
    const lw = LEADER_LINE_WIDTH * lbl.lineWidthMultiplier;
    ctx.strokeStyle = lbl.color;
    ctx.lineWidth = lw;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(lbl.anchorX, lbl.anchorY);
    if (lbl.direction === "up") {
      ctx.lineTo(lbl.boxX + lbl.boxW / 2, lbl.boxY + lbl.boxH);
    } else {
      ctx.lineTo(lbl.boxX + lbl.boxW / 2, lbl.boxY);
    }
    ctx.stroke();

    ctx.fillStyle = lbl.color;
    ctx.globalAlpha = 1;
    let ty = lbl.boxY + LABEL_PADDING + LABEL_FONT_SIZE;
    for (const line of lbl.lines) {
      ctx.fillText(line, lbl.boxX, ty, LABEL_WIDTH - 2);
      ty += LABEL_LINE_HEIGHT;
    }
  }
  ctx.globalAlpha = 1;
}

const PanButton: FC<{
  side: "left" | "right";
  label: string;
  fg: string;
  bg: string;
  onPress: () => void;
}> = ({ side, label, fg, bg, onPress }) => (
  <button
    type="button"
    aria-label={label}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onPress();
    }}
    style={{
      position: "absolute",
      top: "50%",
      left: side === "left" ? 0 : undefined,
      right: side === "right" ? 0 : undefined,
      transform: "translateY(-50%)",
      width: 52,
      height: 96,
      border: "none",
      background:
        side === "left"
          ? `linear-gradient(to right, ${withAlpha(bg, 0.55)}, transparent)`
          : `linear-gradient(to left, ${withAlpha(bg, 0.55)}, transparent)`,
      color: fg,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 0,
      opacity: 0.75,
      zIndex: 2,
    }}
  >
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {side === "left" ? (
        <polyline points="15 6 9 12 15 18" />
      ) : (
        <polyline points="9 6 15 12 9 18" />
      )}
    </svg>
  </button>
);

const ZoomControls: FC<{
  fg: string;
  bg: string;
  onZoomIn: () => void;
  onZoomOut: () => void;
}> = ({ fg, bg, onZoomIn, onZoomOut }) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      bottom: 14,
      transform: "translateX(-50%)",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      zIndex: 2,
    }}
  >
    <ZoomButton label="Zoom in" fg={fg} bg={bg} onPress={onZoomIn}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="18 15 12 9 6 15" />
      </svg>
    </ZoomButton>
    <ZoomButton label="Zoom out" fg={fg} bg={bg} onPress={onZoomOut}>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </ZoomButton>
  </div>
);

const ZoomButton: FC<{
  label: string;
  fg: string;
  bg: string;
  onPress: () => void;
  children: ReactNode;
}> = ({ label, fg, bg, onPress, children }) => (
  <button
    type="button"
    aria-label={label}
    onPointerDown={(e) => e.stopPropagation()}
    onClick={(e) => {
      e.stopPropagation();
      onPress();
    }}
    style={{
      width: 40,
      height: 36,
      border: `1px solid ${withAlpha(fg, 0.45)}`,
      background: withAlpha(bg, 0.75),
      color: fg,
      cursor: "pointer",
      fontFamily: '"SF Mono", "Consolas", monospace',
      fontSize: 18,
      lineHeight: 1,
      padding: 0,
      opacity: 0.9,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {children}
  </button>
);

const Compass: FC<{ headingDeg: number; fg: string; bg: string }> = ({
  headingDeg,
  fg,
  bg,
}) => {
  const cx = COMPASS_SIZE / 2;
  const cy = COMPASS_SIZE / 2;
  const r = COMPASS_SIZE / 2 - 6;

  return (
    <div
      style={{
        position: "absolute",
        right: 14,
        bottom: 14,
        width: COMPASS_SIZE,
        height: COMPASS_SIZE + 18,
        zIndex: 2,
        pointerEvents: "none",
      }}
    >
      <svg
        width={COMPASS_SIZE}
        height={COMPASS_SIZE}
        viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}
        aria-label={`Compass heading ${Math.round(headingDeg)} degrees`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={withAlpha(bg, 0.45)}
          stroke={withAlpha(fg, 0.55)}
          strokeWidth="1"
        />
        <g transform={`rotate(${-headingDeg} ${cx} ${cy})`}>
          {(["N", "E", "S", "W"] as const).map((label, i) => {
            const angle = i * 90;
            const rad = ((angle - 90) * Math.PI) / 180;
            const tx = cx + Math.cos(rad) * (r - 14);
            const ty = cy + Math.sin(rad) * (r - 14);
            return (
              <text
                key={label}
                x={tx}
                y={ty}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={label === "N" ? fg : withAlpha(fg, 0.65)}
                fontSize={label === "N" ? 11 : 9}
                fontFamily='"SF Mono", "Consolas", monospace'
                fontWeight={label === "N" ? 700 : 400}
              >
                {label}
              </text>
            );
          })}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - r + 8}
            stroke={withAlpha(fg, 0.35)}
            strokeWidth="1"
          />
        </g>
        <polygon
          points={`${cx},${cy - r + 4} ${cx - 5},${cy - r + 16} ${cx + 5},${cy - r + 16}`}
          fill={fg}
        />
      </svg>
      <div
        style={{
          marginTop: 4,
          textAlign: "center",
          fontSize: 10,
          fontFamily: '"SF Mono", "Consolas", monospace',
          color: withAlpha(fg, 0.75),
          letterSpacing: "0.06em",
        }}
      >
        {Math.round(headingDeg).toString().padStart(3, "0")}° {_cardinalDir(headingDeg)}
      </div>
    </div>
  );
};

function _drawHud(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  gpsAccuracy: number | null,
  error: string | null,
  fg: string
): void {
  ctx.font = '11px "SF Mono", "Consolas", monospace';
  ctx.fillStyle = fg;
  ctx.globalAlpha = 0.7;

  if (gpsAccuracy !== null) {
    ctx.fillText(`GPS ±${Math.round(gpsAccuracy)} m`, 12, 22);
  }

  if (error) {
    ctx.fillStyle = "#FF4444";
    ctx.globalAlpha = 0.9;
    ctx.fillText(error.slice(0, 60), 12, H - 52);
  }

  ctx.globalAlpha = 1.0;
}

function _drawLoadingBar(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  timeMs: number,
  phase: "gps" | "computing",
  fg: string,
  bg: string
): void {
  const barW = W * 0.6;
  const barH = 3;
  const x = (W - barW) / 2;
  const y = H / 2;

  const label =
    phase === "gps" ? "Acquiring GPS…" : "Computing skyline…";

  ctx.fillStyle = withAlpha(bg, 0.85);
  ctx.fillRect(x - 2, y - 14, barW + 4, barH + 28);

  ctx.strokeStyle = withAlpha(fg, 0.35);
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, barW, barH);

  ctx.fillStyle = withAlpha(fg, 0.08);
  ctx.fillRect(x, y, barW, barH);

  const pulseW = barW * 0.35;
  const travel = barW + pulseW;
  const offset = ((timeMs / 1200) % 1) * travel - pulseW;

  const grad = ctx.createLinearGradient(x + offset, y, x + offset + pulseW, y);
  grad.addColorStop(0, withAlpha(fg, 0.2));
  grad.addColorStop(0.5, withAlpha(fg, 0.75));
  grad.addColorStop(1, withAlpha(fg, 0.95));

  ctx.fillStyle = grad;
  ctx.fillRect(x, y, barW, barH);

  ctx.font = '11px "SF Mono", "Consolas", monospace';
  ctx.fillStyle = withAlpha(fg, 0.85);
  ctx.textAlign = "center";
  ctx.fillText(label, W / 2, y + 22);
  ctx.textAlign = "left";
}

function _cardinalDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
