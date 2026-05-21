"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import { fetchAdminDashboardData, checkApiHealth } from "@/features/reports/reports-api";
import { EMPTY_ADMIN_DASHBOARD_DATA } from "@/features/reports/types";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import MetricCard from "@/components/dashboard/MetricCard";
import MapboxReportMap from "@/components/dashboard/MapboxReportMap";
import { fetchMapPoints } from "@/features/maps/maps-api";
import styles from "./page.module.css";

function formatMetricValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  // Redondear a 2 decimales si es un número con muchos decimales
  const numValue = Number(value);
  const formatted = Number.isInteger(numValue) ? numValue : Math.round(numValue * 100) / 100;
  return `${formatted}${suffix}`;
}

// Colores para la leyenda del donut
const legendColors = ["#c66c1e", "#f2bc85", "#f7dfc4", "#e8a854"];

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [reportScope, setReportScope] = useState("todos");
  const [selectedArea, setSelectedArea] = useState("todas");
  const [period, setPeriod] = useState("semanal");
  const [dashboardData, setDashboardData] = useState(EMPTY_ADMIN_DASHBOARD_DATA);
  const [mapPoints, setMapPoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'connected' | 'error'

  const displayName = profile?.nombre || user?.email || "usuario";
  const isPlaceholderMode = dashboardData.isUsingPlaceholder;

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setLoadError("");

      try {
        // Verificar conexión con el microservicio
        const healthCheck = await checkApiHealth();
        if (!healthCheck.ok) {
          console.warn("Advertencia de conexión:", healthCheck.message);
          setConnectionStatus('error');
        } else {
          setConnectionStatus('connected');
        }

        const token = await user.getIdToken();
        const data = await fetchAdminDashboardData(token);
        if (isMounted) {
          setDashboardData(data);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setConnectionStatus('error');
        if (isMounted) {
          setDashboardData(EMPTY_ADMIN_DASHBOARD_DATA);
          setLoadError("No fue posible consultar reportes. Verifica la conexión con el microservicio.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    async function loadMapPoints() {
      if (!user) {
        setMapLoading(false);
        return;
      }

      setMapLoading(true);
      setMapError("");

      try {
        const points = await fetchMapPoints({
          estado: reportScope,
          area: selectedArea,
        });

        if (isMounted) {
          setMapPoints(points);
        }
      } catch (error) {
        console.error("Error cargando mapa:", error);
        if (isMounted) {
          setMapPoints([]);
          setMapError("No se pudo cargar el mapa de reportes.");
        }
      } finally {
        if (isMounted) {
          setMapLoading(false);
        }
      }
    }

    loadMapPoints();

    return () => {
      isMounted = false;
    };
  }, [user, reportScope, selectedArea]);

  const areaTopPercentage = useMemo(() => {
    if (!dashboardData.reportsByArea.length) {
      return null;
    }
    return dashboardData.reportsByArea[0]?.percentage ?? null;
  }, [dashboardData.reportsByArea]);

  return (
    <AdminGuard>
      <main className={styles.page}>
        <div className={styles.backgroundGlow} />

        <AdminShell activeSection="dashboard" breadcrumb="Admin / Dashboard">
          <section className={styles.filtersBar}>
            <label className={styles.filterLabel}>
              Estado de reportes
              <select
                className={styles.select}
                value={reportScope}
                onChange={(event) => setReportScope(event.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En revisión</option>
                <option value="en_proceso">En proceso</option>
                <option value="resuelto">Resuelto</option>
              </select>
            </label>

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

            <label className={styles.filterLabel}>
              Periodo
              <select
                className={styles.select}
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
              >
                <option value="semanal">Semanal</option>
                <option value="mensual">Mensual</option>
                <option value="anual">Anual</option>
              </select>
            </label>
          </section>

          <section className={styles.welcomeCard}>
            <h1 className={styles.title}>Hola, {displayName}</h1>
            <p className={styles.subtitle}>
              {isPlaceholderMode
                ? "Este dashboard usa placeholders mientras se integra el microservicio de reportes."
                : "Visualiza métricas y estadísticas de todos los reportes de la plataforma."}
            </p>
            {isLoading ? <p className={styles.info}>Cargando datos...</p> : null}
            {loadError ? <p className={styles.error}>{loadError}</p> : null}
            {connectionStatus === 'connected' && !isPlaceholderMode && (
              <p style={{ color: '#2E7D32', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ✓ Conectado al microservicio de reportes
              </p>
            )}
            {connectionStatus === 'error' && (
              <p style={{ color: '#C62828', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠ Error de conexión con el microservicio
              </p>
            )}
          </section>

          <section className={styles.metricsGrid}>
            <MetricCard
              title="Total de reportes"
              value={formatMetricValue(dashboardData.metrics.totalReports)}
              helper={isPlaceholderMode ? "Dato pendiente" : "Conectado"}
              trend="+12.5% vs semana anterior"
              trendDirection="up"
              emphasis="primary"
            />
            <MetricCard
              title="Reportes en proceso"
              value={formatMetricValue(dashboardData.metrics.inProgressReports)}
              helper={isPlaceholderMode ? "Dato pendiente" : "Conectado"}
              trend="+8.1% vs semana anterior"
              trendDirection="up"
              emphasis="primary"
            />
            <MetricCard
              title="Reportes resueltos"
              value={formatMetricValue(dashboardData.metrics.solvedReports)}
              helper={isPlaceholderMode ? "Dato pendiente" : "Conectado"}
              trend="+18.3% vs semana anterior"
              trendDirection="up"
              emphasis="success"
            />
            <MetricCard
              title="Tiempo promedio de resolucion"
              value={formatMetricValue(
                dashboardData.metrics.averageResolutionHours,
                " h"
              )}
              helper={isPlaceholderMode ? "Dato pendiente" : "Conectado"}
              trend="-6.7% vs semana anterior"
              trendDirection="down"
              emphasis="primary"
            />
          </section>

          <section className={styles.chartGrid}>
            <article className={styles.panel}>
              <h2 className={styles.panelTitle}>Procesos diarios</h2>
              <p className={styles.panelHint}>
                {dashboardData.dailyProcesses.length > 0
                  ? `${dashboardData.dailyProcesses.length} días con actividad`
                  : `Vista ${period} (placeholder)`}
              </p>
              <div className={styles.fakeLineChart}>
                {dashboardData.dailyProcesses.length > 0 ? (
                  dashboardData.dailyProcesses.slice(0, 12).map((item, index) => {
                    // El backend puede devolver "date" o "fecha", "total" o "creados"
                    const value = item.total ?? item.creados ?? 0;
                    const maxValue = Math.max(...dashboardData.dailyProcesses.map(d => d.total ?? d.creados ?? 0), 1);
                    const height = Math.max((value / maxValue) * 100, 10);
                    return (
                      <span
                        key={index}
                        className={styles.bar}
                        style={{ height: `${height}%` }}
                        title={item.date || item.fecha}
                      />
                    );
                  })
                ) : (
                  // Placeholder bars
                  <>
                    <span className={styles.bar} style={{ height: '45%' }} />
                    <span className={styles.bar} style={{ height: '70%' }} />
                    <span className={styles.bar} style={{ height: '55%' }} />
                    <span className={styles.bar} style={{ height: '85%' }} />
                    <span className={styles.bar} style={{ height: '60%' }} />
                    <span className={styles.bar} style={{ height: '90%' }} />
                    <span className={styles.bar} style={{ height: '75%' }} />
                    <span className={styles.bar} style={{ height: '50%' }} />
                    <span className={styles.bar} style={{ height: '65%' }} />
                    <span className={styles.bar} style={{ height: '80%' }} />
                    <span className={styles.bar} style={{ height: '95%' }} />
                    <span className={styles.bar} style={{ height: '60%' }} />
                  </>
                )}
              </div>
            </article>

            <article className={styles.panel}>
              <h2 className={styles.panelTitle}>Reportes por area</h2>
              <p className={styles.panelHint}>
                {dashboardData.reportsByArea.length
                  ? `Top area: ${dashboardData.reportsByArea[0]?.name || dashboardData.reportsByArea[0]?.areaNombre || "N/A"}`
                  : "Porcentaje por categoria (placeholder)"}
              </p>
              <div className={styles.fakeDonut}>
                <div className={styles.donutCenter}>
                  {formatMetricValue(areaTopPercentage, "%")}
                </div>
              </div>
              {dashboardData.reportsByArea.length > 0 && (
                <div className={styles.legendContainer}>
                  {dashboardData.reportsByArea.slice(0, 4).map((area, index) => (
                    <div key={index} className={styles.legendItem}>
                      <span 
                        className={styles.legendDot} 
                        style={{ backgroundColor: legendColors[index] }}
                      />
                      <span className={styles.legendLabel}>
                        {area.name || area.areaNombre}
                      </span>
                      <span className={styles.legendValue}>
                        {area.total ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className={styles.mapPanel}>
            <div className={styles.mapHeader}>
              <div>
                <h2 className={styles.panelTitle}>Mapa de reportes</h2>
                <p className={styles.panelHint}>
                  Reportes filtrados por área y estado. Si forman cluster, se muestra el centroide.
                </p>
              </div>
            </div>

            <MapboxReportMap
              accessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
              points={mapPoints}
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
