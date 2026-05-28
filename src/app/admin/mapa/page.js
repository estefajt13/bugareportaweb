"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import MapboxReportMap from "@/components/dashboard/MapboxReportMap";
import { fetchHeatmapPoints } from "@/features/maps/maps-api";
import styles from "./page.module.css";

export default function AdminMapaPage() {
  const { user } = useAuth();
  const [selectedArea, setSelectedArea] = useState("todas");
  const [heatmapPoints, setHeatmapPoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadHeatmap() {
      if (!user) {
        setMapLoading(false);
        return;
      }

      setMapLoading(true);
      setMapError("");

      try {
        const points = await fetchHeatmapPoints({
          area: selectedArea,
          tipoReporte: "hurto",
        });

        if (isMounted) {
          setHeatmapPoints(points);
        }
      } catch (error) {
        console.error("Error cargando mapa de calor:", error);
        if (isMounted) {
          setHeatmapPoints([]);
          setMapError("No se pudo cargar el mapa de calor de hurtos.");
        }
      } finally {
        if (isMounted) {
          setMapLoading(false);
        }
      }
    }

    loadHeatmap();

    return () => {
      isMounted = false;
    };
  }, [user, selectedArea]);

  return (
    <AdminGuard>
      <main className={styles.page}>
        <AdminShell activeSection="mapa" breadcrumb="Admin / Mapa de calor">
          <section className={styles.filtersBar}>
            <label className={styles.filterLabel}>
              Area
              <select
                className={styles.select}
                value={selectedArea}
                onChange={(event) => setSelectedArea(event.target.value)}
              >
                <option value="todas">Todas las areas</option>
                <option value="alumbrado">Alumbrado publico</option>
                <option value="vias">Vias y espacio publico</option>
                <option value="aseo">Aseo y limpieza</option>
              </select>
            </label>
          </section>

          <section className={styles.mapPanel}>
            <div className={styles.mapHeader}>
              <h1 className={styles.title}>Mapa de calor de hurtos</h1>
              <p className={styles.subtitle}>
                Visualiza zonas con mayor concentración de hurtos para priorizar vigilancia.
              </p>
            </div>

            <MapboxReportMap
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              points={heatmapPoints}
              mode="heatmap"
              loading={mapLoading}
              error={mapError}
            />
          </section>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}
