/**
 * App
 * ===
 * Root component.  Wires together:
 *   - GPS geolocation (useGeolocation)
 *   - Device orientation / compass (useDeviceOrientation)
 *   - Skyline API fetch (triggered on significant GPS movement or manual pick)
 *   - Canvas renderer (SkylineCanvas)
 *   - Minimap + light mode
 */

import React, { useCallback, useEffect, useMemo, useRef, useState, type FC } from "react";
import { SkylineCanvas } from "./render/SkylineCanvas";
import { MapPickerOverlay, Minimap } from "./render/Minimap";
import { useGeolocation } from "./sensors/useGeolocation";
import { useDeviceOrientation } from "./sensors/useDeviceOrientation";
import { fetchSkyline, fetchPlaces } from "./api/client";
import type { SkylineResponse, City, PlacesResponse } from "./api/client";
import { appConfig } from "./config";
import { isSecureContext } from "./env/secureContext";
import {
  setCachedSkyline,
  getCachedSkyline,
} from "./state/skylineCache";
import {
  haversineM,
  initialBearingDeg,
  isSantiago,
} from "./geo/geom";
import type { CityLabelInput } from "./render/labels";

type Theme = "dark" | "light";

const THEME_KEY = "horizon-lens-theme";

const mono = '"SF Mono", "Consolas", monospace';

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return "dark";
}

function deriveArCities(
  cities: City[],
  observerLat: number,
  observerLon: number,
  radiusM: number
): CityLabelInput[] {
  return cities
    .map((c) => {
      const distance_m = haversineM(observerLat, observerLon, c.lat, c.lon);
      const azimuth = initialBearingDeg(observerLat, observerLon, c.lat, c.lon);
      const forceVisible = isSantiago(c.name) || isSantiago(c.name_es);
      return {
        name: c.name,
        name_es: c.name_es,
        azimuth,
        distance_m,
        elevation_m: c.elevation_m,
        forceVisible,
        withinRadius: distance_m <= radiusM,
      };
    })
    .filter((c) => c.withinRadius || c.forceVisible)
    .map(({ name, name_es, azimuth, distance_m, elevation_m, forceVisible }) => ({
      name,
      name_es,
      azimuth,
      distance_m,
      elevation_m,
      forceVisible,
    }));
}

const actionButtonStyle = (
  fg: string,
  bg: string
): React.CSSProperties => ({
  fontFamily: mono,
  fontSize: 12,
  letterSpacing: "0.06em",
  padding: "14px 24px",
  border: `1px solid ${fg}`,
  background: bg,
  color: fg,
  cursor: "pointer",
  minWidth: 220,
});

const App: FC = () => {
  const {
    position,
    triggeredPosition,
    error: gpsError,
    requestLocation,
  } = useGeolocation();
  const {
    heading,
    pitch,
    hasPermission,
    permissionError,
    requestPermission,
  } = useDeviceOrientation();

  const [skylineData, setSkylineData] = useState<SkylineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [manualPosition, setManualPosition] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [places, setPlaces] = useState<PlacesResponse | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [manualMode, setManualMode] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const fetchingRef = useRef(false);
  const secure = isSecureContext();

  const activePosition = manualPosition ?? triggeredPosition;
  const fg = theme === "dark" ? "#FFFFFF" : "#000000";
  const bg = theme === "dark" ? "#000000" : "#FFFFFF";
  const showMain = hasPermission || manualMode;

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  useEffect(() => {
    fetchPlaces()
      .then(setPlaces)
      .catch(() => {
        /* non-fatal */
      });
  }, []);

  useEffect(() => {
    if (!activePosition) return;
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setLoading(true);
    setApiError(null);

    fetchSkyline({
      latitude: activePosition.latitude,
      longitude: activePosition.longitude,
      radius: appConfig.skyline.defaultRadiusM,
    })
      .then((data) => {
        setSkylineData(data);
        setCachedSkyline(
          data,
          activePosition.latitude,
          activePosition.longitude
        );
        setApiError(null);
      })
      .catch((err: unknown) => {
        const cached = getCachedSkyline();
        if (cached) setSkylineData(cached);
        setApiError(String(err instanceof Error ? err.message : err));
      })
      .finally(() => {
        setLoading(false);
        fetchingRef.current = false;
      });
  }, [activePosition]);

  const arCities = useMemo(() => {
    if (!activePosition || !places) return [];
    return deriveArCities(
      places.cities,
      activePosition.latitude,
      activePosition.longitude,
      appConfig.skyline.defaultRadiusM
    );
  }, [activePosition, places]);

  const handleMapPick = useCallback((lat: number, lon: number) => {
    setManualPosition({ latitude: lat, longitude: lon });
    setManualMode(true);
    setMapPickerOpen(false);
  }, []);

  const displayError = permissionError ?? gpsError ?? apiError;
  const showLoadingBar = (!skylineData && !displayError) || loading;
  const loadingPhase: "gps" | "computing" =
    position === null ? "gps" : "computing";
  const showGpsFallback =
    showMain && !!gpsError && !manualPosition && !activePosition;

  const mapPicker = mapPickerOpen ? (
    <MapPickerOverlay
      gpsPosition={position}
      activePosition={activePosition}
      cities={places?.cities ?? []}
      peaks={places?.peaks ?? []}
      fg={fg}
      bg={bg}
      onPick={handleMapPick}
      onClose={() => setMapPickerOpen(false)}
    />
  ) : null;

  if (!showMain) {
    return (
      <>
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: bg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: mono,
            color: fg,
            gap: 20,
            padding: 32,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 15, letterSpacing: "0.1em", opacity: 0.95 }}>
            HORIZON LENS
          </div>
          <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.7, maxWidth: 320 }}>
            Enable the compass for AR-style horizon tracking, or pick a location on the map.
          </div>

          {!secure && (
            <div
              style={{
                fontSize: 11,
                lineHeight: 1.6,
                color: "#ffaa44",
                maxWidth: 320,
                padding: "10px 14px",
                border: "1px solid #ffaa44",
                opacity: 0.95,
              }}
            >
              HTTPS is required on iPhone for GPS and compass. Use{" "}
              <strong>https://&lt;your-ip&gt;:5173</strong> (not http).
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              marginTop: 8,
            }}
          >
            <button
              type="button"
              style={actionButtonStyle(fg, bg)}
              onClick={() => {
                void requestPermission();
                requestLocation();
              }}
            >
              Enable compass and location
            </button>
            <button
              type="button"
              style={actionButtonStyle(fg, bg)}
              onClick={() => setMapPickerOpen(true)}
            >
              Pick location on map
            </button>
          </div>

          {permissionError && (
            <div style={{ fontSize: 11, color: "#ff4444", marginTop: 4, maxWidth: 320 }}>
              {permissionError}
            </div>
          )}
        </div>
        {mapPicker}
      </>
    );
  }

  return (
    <>
      <SkylineCanvas
        skylineData={skylineData}
        cities={arCities}
        headingDeg={heading}
        pitchDeg={pitch}
        showLoadingBar={showLoadingBar}
        loadingPhase={loadingPhase}
        error={displayError}
        gpsAccuracy={position?.accuracy ?? null}
        fg={fg}
        bg={bg}
      />

      <Minimap
        gpsPosition={position}
        activePosition={activePosition}
        cities={places?.cities ?? []}
        peaks={places?.peaks ?? []}
        fg={fg}
        bg={bg}
        onPick={handleMapPick}
        onRecenter={() => setManualPosition(null)}
        expanded={mapPickerOpen}
        onExpandedChange={setMapPickerOpen}
      />

      {showGpsFallback && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 64,
            transform: "translateX(-50%)",
            zIndex: 20,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            maxWidth: "90vw",
            padding: "14px 18px",
            border: `1px solid ${fg}`,
            background: bg,
            fontFamily: mono,
            textAlign: "center",
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: 11, color: fg, opacity: 0.9, lineHeight: 1.5 }}>
            {secure
              ? "GPS unavailable. Pick a location on the map to load the skyline."
              : "GPS requires HTTPS on iPhone. Pick a location on the map, or open https://<your-ip>:5173."}
          </div>
          <button
            type="button"
            style={{
              ...actionButtonStyle(fg, bg),
              minWidth: 200,
              padding: "10px 18px",
              fontSize: 11,
            }}
            onClick={() => setMapPickerOpen(true)}
          >
            Pick location on map
          </button>
        </div>
      )}

      <button
        type="button"
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        style={{
          position: "fixed",
          left: 12,
          bottom: 12,
          zIndex: 10,
          width: 40,
          height: 40,
          border: `1px solid ${fg}`,
          background: bg,
          color: fg,
          cursor: "pointer",
          fontFamily: mono,
          fontSize: 10,
          letterSpacing: "0.04em",
          opacity: 0.92,
        }}
      >
        {theme === "dark" ? "LIGHT" : "DARK"}
      </button>
    </>
  );
};

export default App;
