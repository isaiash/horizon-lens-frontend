/**
 * Minimap
 * =======
 * Top-right map icon button. Click opens a zoomable OpenStreetMap overlay
 * to pick observer position.
 */

import React, { useCallback, useEffect, useRef, useState, type FC } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { City, PlacePeak } from "../api/client";
import { MINIMAP_BOUNDS } from "./minimapBounds";

export interface MapPosition {
  latitude: number;
  longitude: number;
}

interface Props {
  gpsPosition: MapPosition | null;
  activePosition: MapPosition | null;
  cities: City[];
  peaks: PlacePeak[];
  fg: string;
  bg: string;
  onPick: (lat: number, lon: number) => void;
  onRecenter: () => void;
  expanded?: boolean;
  onExpandedChange?: (open: boolean) => void;
}

const chileBounds = L.latLngBounds(
  [MINIMAP_BOUNDS.south, MINIMAP_BOUNDS.west],
  [MINIMAP_BOUNDS.north, MINIMAP_BOUNDS.east]
);

interface MapPickerOverlayProps {
  gpsPosition: MapPosition | null;
  activePosition: MapPosition | null;
  cities: City[];
  peaks: PlacePeak[];
  fg: string;
  bg: string;
  onPick: (lat: number, lon: number) => void;
  onClose: () => void;
}

export const MapPickerOverlay: FC<MapPickerOverlayProps> = ({
  gpsPosition,
  activePosition,
  cities,
  peaks,
  fg,
  bg,
  onPick,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const center = activePosition ?? gpsPosition ?? { latitude: -35, longitude: -71 };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = L.map(el, {
      center: [center.latitude, center.longitude],
      zoom: 6,
      minZoom: 4,
      maxZoom: 16,
      maxBounds: chileBounds.pad(0.05),
      maxBoundsViscosity: 0.8,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    const markers = L.layerGroup().addTo(map);
    layerGroupRef.current = markers;

    map.on("click", (e: L.LeafletMouseEvent) => {
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    const t = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once per open
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    for (const c of cities) {
      const label = c.name ?? c.name_es;
      if (!label) continue;
      L.marker([c.lat, c.lon], {
        icon: L.divIcon({
          className: "",
          html: `<span style="font:9px 'SF Mono',Consolas,monospace;color:${fg};text-shadow:0 0 4px ${bg};white-space:nowrap;pointer-events:none">${label}</span>`,
          iconAnchor: [0, 10],
        }),
        interactive: false,
      }).addTo(group);
    }

    for (const p of peaks.slice(0, 40)) {
      const label = p.name ?? p.name_es;
      if (!label) continue;
      L.marker([p.lat, p.lon], {
        icon: L.divIcon({
          className: "",
          html: `<span style="font:8px 'SF Mono',Consolas,monospace;color:${fg};opacity:0.7;text-shadow:0 0 4px ${bg};white-space:nowrap;pointer-events:none">${label}</span>`,
          iconAnchor: [0, 0],
        }),
        interactive: false,
      }).addTo(group);
    }

    if (gpsPosition) {
      L.circleMarker([gpsPosition.latitude, gpsPosition.longitude], {
        radius: 6,
        color: fg,
        weight: 2,
        fillColor: bg,
        fillOpacity: 0.9,
      })
        .bindTooltip("GPS", { permanent: false, direction: "top" })
        .addTo(group);
    }

    if (activePosition) {
      L.circleMarker([activePosition.latitude, activePosition.longitude], {
        radius: 8,
        color: fg,
        weight: 2,
        fillColor: fg,
        fillOpacity: 1,
      })
        .bindTooltip("Observer", { permanent: false, direction: "top" })
        .addTo(group);
    }
  }, [activePosition, gpsPosition, cities, peaks, fg, bg]);

  useEffect(() => {
    if (activePosition && mapRef.current) {
      mapRef.current.panTo([activePosition.latitude, activePosition.longitude], {
        animate: true,
        duration: 0.4,
      });
    }
  }, [activePosition?.latitude, activePosition?.longitude]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        style={{
          position: "relative",
          width: "min(92vw, 520px)",
          height: "min(78vh, 680px)",
          border: `1px solid ${fg}`,
          background: bg,
          boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
        }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        <button
          type="button"
          aria-label="Close map"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1000,
            width: 28,
            height: 28,
            border: `1px solid ${fg}`,
            background: bg,
            color: fg,
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>

        <div
          style={{
            position: "absolute",
            bottom: 8,
            left: 8,
            zIndex: 1000,
            fontSize: 9,
            fontFamily: '"SF Mono", "Consolas", monospace',
            color: fg,
            background: bg,
            opacity: 0.9,
            padding: "4px 6px",
            pointerEvents: "none",
          }}
        >
          Tap map to reposition
        </div>
      </div>
    </div>
  );
};

export const Minimap: FC<Props> = ({
  gpsPosition,
  activePosition,
  cities,
  peaks,
  fg,
  bg,
  onPick,
  onRecenter,
  expanded: expandedProp,
  onExpandedChange,
}) => {
  const [expandedInternal, setExpandedInternal] = useState(false);
  const expanded = expandedProp ?? expandedInternal;

  const setExpanded = useCallback(
    (open: boolean) => {
      if (expandedProp === undefined) setExpandedInternal(open);
      onExpandedChange?.(open);
    },
    [expandedProp, onExpandedChange]
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Open Chile map"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          style={{
            width: 32,
            height: 32,
            border: `1px solid ${fg}`,
            background: bg,
            color: fg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            opacity: 0.92,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21" />
            <line x1="8" y1="3" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="21" />
          </svg>
        </button>

        <button
          type="button"
          aria-label="Return to GPS position"
          onClick={(e) => {
            e.stopPropagation();
            onRecenter();
          }}
          style={{
            width: 32,
            height: 32,
            border: `1px solid ${fg}`,
            background: bg,
            color: fg,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            opacity: 0.92,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
      </div>

      {expanded && (
        <MapPickerOverlay
          gpsPosition={gpsPosition}
          activePosition={activePosition}
          cities={cities}
          peaks={peaks}
          fg={fg}
          bg={bg}
          onPick={onPick}
          onClose={() => setExpanded(false)}
        />
      )}
    </>
  );
};
