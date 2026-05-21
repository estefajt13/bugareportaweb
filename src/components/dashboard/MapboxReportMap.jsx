"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./MapboxReportMap.module.css";

const DEFAULT_CENTER = [-76.29, 3.88];
const DEFAULT_ZOOM = 12;

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

export default function MapboxReportMap({ accessToken, points, loading = false, error = "" }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapReady, setMapReady] = useState(false);

  const validPoints = useMemo(() => (Array.isArray(points) ? points.filter(isValidPoint) : []), [points]);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      if (!containerRef.current || !accessToken) {
        return;
      }

      const { default: mapboxgl } = await import("mapbox-gl");
      mapboxgl.accessToken = accessToken;

      if (!mapRef.current) {
        mapRef.current = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/light-v11",
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          attributionControl: false,
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

        mapRef.current.on("load", () => {
          if (!cancelled) {
            setMapReady(true);
          }
        });
      }

      syncMarkers(mapboxgl);
    }

    function clearMarkers() {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    }

    function syncMarkers(mapboxgl) {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      clearMarkers();

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

    initializeMap();

    return () => {
      cancelled = true;
      clearMarkers();
    };
  }, [accessToken, validPoints]);

  if (!accessToken) {
    return <div className={styles.emptyState}>Falta configurar `NEXT_PUBLIC_MAPBOX_TOKEN`.</div>;
  }

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.mapContainer} />

      {!mapReady && !error && (
        <div className={styles.overlay}>Cargando mapa...</div>
      )}

      {error ? <div className={styles.errorState}>{error}</div> : null}
      {loading ? <div className={styles.loadingState}>Actualizando puntos...</div> : null}

      <div className={styles.legend}>
        <span className={styles.legendItem}><span className={styles.legendDotCluster} /> Cluster</span>
        <span className={styles.legendItem}><span className={styles.legendDotReport} /> Reporte</span>
      </div>
    </div>
  );
}
