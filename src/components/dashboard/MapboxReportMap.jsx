"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MapboxReportMap.module.css";

const DEFAULT_CENTER = [-76.29, 3.88];
const DEFAULT_ZOOM = 12;
const HEAT_SOURCE_ID = "reports-heat-source";
const HEAT_LAYER_ID = "reports-heat-layer";
const HEAT_POINT_LAYER_ID = "reports-heat-point-layer";

function isValidPoint(point) {
  return Number.isFinite(Number(point?.lat)) && Number.isFinite(Number(point?.lng));
}

function buildBounds(points) {
  const validPoints = points.filter(isValidPoint);
  if (!validPoints.length) {
    return null;
  }

  const bounds = [
    [Number(validPoints[0].lng), Number(validPoints[0].lat)],
    [Number(validPoints[0].lng), Number(validPoints[0].lat)],
  ];

  for (const point of validPoints.slice(1)) {
    bounds[0][0] = Math.min(bounds[0][0], Number(point.lng));
    bounds[0][1] = Math.min(bounds[0][1], Number(point.lat));
    bounds[1][0] = Math.max(bounds[1][0], Number(point.lng));
    bounds[1][1] = Math.max(bounds[1][1], Number(point.lat));
  }

  return bounds;
}

export default function MapboxReportMap({
  accessToken,
  points,
  loading = false,
  error = "",
  mode = "markers",
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  const validPoints = useMemo(() => (Array.isArray(points) ? points.filter(isValidPoint) : []), [points]);

  useEffect(() => {
    async function initializeMap() {
      if (!containerRef.current || !accessToken || mapRef.current) {
        return;
      }

      const { default: mapboxgl } = await import("mapbox-gl");
      mapboxgl.accessToken = accessToken;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      map.on("load", () => {
        setMapReady(true);
      });

      if (map.loaded()) {
        setMapReady(true);
      }
    }

    initializeMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current = [];
      setMapReady(false);
    };
  }, [accessToken]);

  useEffect(() => {
    async function syncMapData() {
      if (!mapRef.current || !mapReady) {
        return;
      }

      const { default: mapboxgl } = await import("mapbox-gl");

      const map = mapRef.current;

      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (map.getLayer(HEAT_POINT_LAYER_ID)) map.removeLayer(HEAT_POINT_LAYER_ID);
      if (map.getLayer(HEAT_LAYER_ID)) map.removeLayer(HEAT_LAYER_ID);
      if (map.getSource(HEAT_SOURCE_ID)) map.removeSource(HEAT_SOURCE_ID);

      if (mode === "heatmap") {
        const features = validPoints.map((point) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(point.lng), Number(point.lat)],
          },
          properties: {
            weight: Number(point.weight ?? 1),
          },
        }));

        map.addSource(HEAT_SOURCE_ID, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features,
          },
        });

        map.addLayer({
          id: HEAT_LAYER_ID,
          type: "heatmap",
          source: HEAT_SOURCE_ID,
          maxzoom: 16,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 0, 0, 6, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 2, 12, 6],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33,102,172,0)",
              0.2,
              "rgb(103,169,207)",
              0.4,
              "rgb(209,229,240)",
              0.6,
              "rgb(253,219,199)",
              0.8,
              "rgb(239,138,98)",
              1,
              "rgb(178,24,43)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 16, 12, 32, 16, 48],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 10, 0.95, 16, 0.45],
          },
        });

        map.addLayer({
          id: HEAT_POINT_LAYER_ID,
          type: "circle",
          source: HEAT_SOURCE_ID,
          minzoom: 0,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 0, 3, 12, 6, 18, 10],
            "circle-color": "#8c2d04",
            "circle-opacity": 0.7,
          },
        });

        const bounds = buildBounds(validPoints);
        if (bounds) {
          map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
        }
        return;
      }

      validPoints.forEach((point) => {
        const element = document.createElement("div");
        element.className = `${styles.marker} ${point.kind === "cluster" ? styles.markerCluster : styles.markerReport}`;

        const badge = document.createElement("span");
        badge.className = styles.markerBadge;
        badge.textContent = point.kind === "cluster" ? String(point.total ?? 0) : "1";
        element.appendChild(badge);

        const marker = new mapboxgl.Marker(element)
          .setLngLat([Number(point.lng), Number(point.lat)])
          .setPopup(
            new mapboxgl.Popup({ offset: 22 }).setHTML(
              `
                <div style="min-width:180px">
                  <strong>${point.label || "Sin nombre"}</strong><br/>
                  <span>${point.kind === "cluster" ? "Cluster" : "Reporte"}</span><br/>
                  <span>Total: ${point.total ?? 1}</span>
                </div>
              `
            )
          )
          .addTo(map);

        markersRef.current.push(marker);
      });

      const bounds = buildBounds(validPoints);
      if (bounds) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 });
      }
    }

    syncMapData().catch((error) => {
      console.error("[Mapa componente] error al sincronizar datos", error);
    });
  }, [mapReady, mode, validPoints]);

  if (!accessToken) {
    return <div className={styles.emptyState}>Falta configurar `NEXT_PUBLIC_MAPBOX_TOKEN`.</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.mapContainer} />

      {error ? <div className={styles.errorState}>{error}</div> : null}
      {loading ? <div className={styles.loadingState}>Actualizando puntos...</div> : null}

      {mode === "heatmap" ? (
        <div className={styles.legend}>
          <span className={styles.legendItem}>Baja densidad</span>
          <span className={styles.legendItem}>Alta densidad</span>
        </div>
      ) : (
        <div className={styles.legend}>
          <span className={styles.legendItem}><span className={styles.legendDotCluster} /> Cluster</span>
          <span className={styles.legendItem}><span className={styles.legendDotReport} /> Reporte</span>
        </div>
      )}
    </div>
  );
}
