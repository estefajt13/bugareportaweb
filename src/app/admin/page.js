"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchAdminDashboardData,
  checkApiHealth,
} from "@/features/reports/reports-api";
import {
  fetchEstadisticasDashboard,
  checkStatisticsApiHealth,
  EMPTY_ESTADISTICAS_DASHBOARD_DATA,
} from "@/features/statistics/statistics-api";
import { EMPTY_ADMIN_DASHBOARD_DATA } from "@/features/reports/types";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import MetricCard from "@/components/dashboard/MetricCard";
import MapboxReportMap from "@/components/dashboard/MapboxReportMap";
import { fetchMapPoints } from "@/features/maps/maps-api";
import styles from "./page.module.css";
// comentario
function formatMetricValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }

  const numValue = Number(value);
  const formatted = Number.isInteger(numValue) ? numValue : Math.round(numValue * 100) / 100;
  return `${formatted}${suffix}`;
}

const legendColors = ["#c66c1e", "#f2bc85", "#f7dfc4", "#e8a854"];

export default function AdminPage() {
  const { user, profile } = useAuth();
  const [reportScope, setReportScope] = useState("todos");
  const [selectedArea, setSelectedArea] = useState("todas");
  const [period, setPeriod] = useState("semanal");
  const [dashboardData, setDashboardData] = useState(EMPTY_ADMIN_DASHBOARD_DATA);
  const [estadisticasData, setEstadisticasData] = useState(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
  const [mapPoints, setMapPoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [statsConnectionStatus, setStatsConnectionStatus] = useState(null);

  const displayName = profile?.nombre || user?.email || "usuario";
  const isPlaceholderMode = dashboardData.isUsingPlaceholder;
  const isStatsPlaceholderMode = estadisticasData.isUsingPlaceholder;

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
        const healthCheck = await checkApiHealth();
        if (!healthCheck.ok) {
          console.warn("Advertencia de conexión:", healthCheck.message);
          setConnectionStatus("error");
        } else {
          setConnectionStatus("connected");
        }

        const token = await user.getIdToken();
        const data = await fetchAdminDashboardData(token);

        if (!isMounted) {
          return;
        }

        setDashboardData(data);

      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setConnectionStatus("error");
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

    async function loadEstadisticas() {
      if (!user) {
        setEstadisticasData(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
        return;
      }

      try {
        // Verificar conexión con el microservicio de estadísticas
        const healthCheck = await checkStatisticsApiHealth();
        if (!healthCheck.ok) {
          console.warn("Advertencia de conexión estadísticas:", healthCheck.message);
          setStatsConnectionStatus('error');
        } else {
          setStatsConnectionStatus('connected');
        }

        const data = await fetchEstadisticasDashboard({ periodo: period });
        if (isMounted) {
          setEstadisticasData(data);
        }
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        setStatsConnectionStatus('error');
        if (isMounted) {
          setEstadisticasData(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
        }
      } finally {
        if (isMounted) {
          // No necesitamos un loading separado, usamos el general
        }
      }
    }

    loadEstadisticas();

    return () => {
      isMounted = false;
    };
  }, [user, period]);

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
            {connectionStatus === "connected" && !isPlaceholderMode && (
              <p style={{ color: "#2E7D32", fontSize: "0.85rem", marginTop: "0.5rem" }}>
                ✓ Conectado al microservicio de reportes
              </p>
            )}
            {connectionStatus === "error" && (
              <p style={{ color: "#C62828", fontSize: "0.85rem", marginTop: "0.5rem" }}>
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
              value={formatMetricValue(dashboardData.metrics.averageResolutionHours, " h")}
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
                    const value = item.total ?? item.creados ?? 0;
                    const maxValue = Math.max(
                      ...dashboardData.dailyProcesses.map((dailyItem) => dailyItem.total ?? dailyItem.creados ?? 0),
                      1
                    );
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
                  <>
                    <span className={styles.bar} style={{ height: "45%" }} />
                    <span className={styles.bar} style={{ height: "70%" }} />
                    <span className={styles.bar} style={{ height: "55%" }} />
                    <span className={styles.bar} style={{ height: "85%" }} />
                    <span className={styles.bar} style={{ height: "60%" }} />
                    <span className={styles.bar} style={{ height: "90%" }} />
                    <span className={styles.bar} style={{ height: "75%" }} />
                    <span className={styles.bar} style={{ height: "50%" }} />
                    <span className={styles.bar} style={{ height: "65%" }} />
                    <span className={styles.bar} style={{ height: "80%" }} />
                    <span className={styles.bar} style={{ height: "95%" }} />
                    <span className={styles.bar} style={{ height: "60%" }} />
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
                <div className={styles.donutCenter}>{formatMetricValue(areaTopPercentage, "%")}</div>
              </div>
              {dashboardData.reportsByArea.length > 0 && (
                <div className={styles.legendContainer}>
                  {dashboardData.reportsByArea.slice(0, 4).map((area, index) => (
                    <div key={index} className={styles.legendItem}>
                      <span className={styles.legendDot} style={{ backgroundColor: legendColors[index] }} />
                      <span className={styles.legendLabel}>{area.name || area.areaNombre}</span>
                      <span className={styles.legendValue}>{area.total ?? 0}</span>
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

          {/* Sección de Estadísticas Avanzadas */}
          <section className={styles.statsSection}>
            <div className={styles.statsHeader}>
              <h2 className={styles.statsTitle}>Estadísticas Avanzadas</h2>
              <p className={styles.statsSubtitle}>
                {isStatsPlaceholderMode
                  ? "Estas estadísticas usan placeholders mientras se integra el microservicio."
                  : "Visualiza estadísticas avanzadas de todos los reportes de la plataforma."}
              </p>
              {statsConnectionStatus === 'connected' && !isStatsPlaceholderMode && (
                <p style={{ color: '#2E7D32', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ✓ Conectado al microservicio de estadísticas
                </p>
              )}
              {statsConnectionStatus === 'error' && (
                <p style={{ color: '#C62828', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ⚠ Error de conexión con el microservicio de estadísticas
                </p>
              )}
            </div>

            {/* Métricas de estadísticas avanzadas */}
            <div className={styles.advancedMetricsGrid}>
              <MetricCard
                title="Área más activa"
                value={estadisticasData.areaMasActiva?.area || "--"}
                helper={estadisticasData.areaMasActiva?.total ? `${estadisticasData.areaMasActiva.total} reportes activos` : "Sin datos"}
                emphasis="warning"
              />
              <MetricCard
                title="Tipo más frecuente"
                value={estadisticasData.tipoMasFrecuente?.tipo || "--"}
                helper={estadisticasData.tipoMasFrecuente?.area || "Sin datos"}
                emphasis="primary"
              />
              <MetricCard
                title="Reportes resueltos"
                value={formatMetricValue(estadisticasData.tiposFrecuentes.reduce((sum, t) => sum + (t.total || 0), 0))}
                helper="Última semana"
                emphasis="success"
              />
              <MetricCard
                title="Mes con más reportes"
                value={estadisticasData.tendenciaMensual.length > 0 
                  ? estadisticasData.tendenciaMensual.reduce((max, m) => m.total > max.total ? m : max).mes 
                  : "--"}
                helper="Últimos 6 meses"
                emphasis="primary"
              />
            </div>

            {/* Tipos más frecuentes y tendencia mensual */}
            <div className={styles.advancedChartGrid}>
              <article className={styles.advancedPanel}>
                <h3 className={styles.advancedPanelTitle}>Tipos de reportes más frecuentes</h3>
                <p className={styles.advancedPanelHint}>
                  {estadisticasData.tiposFrecuentes.length > 0
                    ? `${estadisticasData.tiposFrecuentes.length} tipos reportados esta semana`
                    : "Última semana (placeholder)"}
                </p>
                {estadisticasData.tiposFrecuentes.length > 0 ? (
                  <div className={styles.listContainer}>
                    {estadisticasData.tiposFrecuentes.map((tipo, index) => (
                      <div key={index} className={styles.listItem}>
                        <span className={styles.listRank}>#{index + 1}</span>
                        <div className={styles.listInfo}>
                          <span className={styles.listType}>{tipo.tipo}</span>
                          <span className={styles.listArea}>{tipo.area}</span>
                        </div>
                        <span className={styles.listTotal}>{tipo.total}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.placeholderBars}>
                    <div className={styles.placeholderBar} style={{ width: '80%' }} />
                    <div className={styles.placeholderBar} style={{ width: '65%' }} />
                    <div className={styles.placeholderBar} style={{ width: '50%' }} />
                    <div className={styles.placeholderBar} style={{ width: '40%' }} />
                    <div className={styles.placeholderBar} style={{ width: '30%' }} />
                  </div>
                )}
              </article>

              <article className={styles.advancedPanel}>
                <h3 className={styles.advancedPanelTitle}>Tendencia mensual</h3>
                <p className={styles.advancedPanelHint}>
                  {estadisticasData.tendenciaMensual.length > 0
                    ? `${estadisticasData.tendenciaMensual.length} meses de datos`
                    : "Últimos 6 meses (placeholder)"}
                </p>
                <div className={styles.fakeLineChart}>
                  {estadisticasData.tendenciaMensual.length > 0 ? (
                    estadisticasData.tendenciaMensual.map((item, index) => {
                      const maxValue = Math.max(...estadisticasData.tendenciaMensual.map(m => m.total || 0), 1);
                      const height = Math.max(((item.total || 0) / maxValue) * 100, 10);
                      return (
                        <span
                          key={index}
                          className={styles.bar}
                          style={{ height: `${height}%` }}
                          title={`${item.mes}: ${item.total} reportes`}
                        />
                      );
                    })
                  ) : (
                    <>
                      <span className={styles.bar} style={{ height: '45%' }} />
                      <span className={styles.bar} style={{ height: '70%' }} />
                      <span className={styles.bar} style={{ height: '55%' }} />
                      <span className={styles.bar} style={{ height: '85%' }} />
                      <span className={styles.bar} style={{ height: '60%' }} />
                      <span className={styles.bar} style={{ height: '50%' }} />
                    </>
                  )}
                </div>
              </article>
            </div>

            {/* Procesos diarios (estadísticas) */}
            <article className={styles.fullWidthPanel}>
              <h3 className={styles.panelTitle}>Procesos diarios - Estadísticas</h3>
              <p className={styles.panelHint}>
                {estadisticasData.dailyProcesses.length > 0
                  ? `${estadisticasData.dailyProcesses.length} días con actividad`
                  : `Vista ${period} (placeholder)`}
              </p>
              <div className={styles.fakeLineChart}>
                {estadisticasData.dailyProcesses.length > 0 ? (
                  estadisticasData.dailyProcesses.slice(0, 14).map((item, index) => {
                    const value = item.total || 0;
                    const maxValue = Math.max(...estadisticasData.dailyProcesses.map(d => d.total || 0), 1);
                    const height = Math.max((value / maxValue) * 100, 10);
                    return (
                      <span
                        key={index}
                        className={styles.bar}
                        style={{ height: `${height}%` }}
                        title={item.fecha || item.date}
                      />
                    );
                  })
                ) : (
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
                    <span className={styles.bar} style={{ height: '70%' }} />
                    <span className={styles.bar} style={{ height: '55%' }} />
                  </>
                )}
              </div>
            </article>

            {/* Distribución por área */}
            <article className={styles.areaPanel}>
              <h3 className={styles.panelTitle}>Distribución por área</h3>
              <p className={styles.panelHint}>
                {estadisticasData.reportsByArea.length > 0
                  ? `${estadisticasData.reportsByArea.length} áreas con reportes`
                  : "Distribución por área (placeholder)"}
              </p>
              {estadisticasData.reportsByArea.length > 0 ? (
                <div className={styles.areaGrid}>
                  {estadisticasData.reportsByArea.map((area, index) => (
                    <div key={index} className={styles.areaCard}>
                      <span className={styles.areaName}>{area.area || area.areaNombre}</span>
                      <div className={styles.areaBarContainer}>
                        <div 
                          className={styles.areaBar} 
                          style={{ width: `${area.porcentaje || area.percentage || 0}%` }}
                        />
                      </div>
                      <span className={styles.areaTotal}>{area.total || 0} reportes</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.placeholderAreaBars}>
                  <div className={styles.placeholderAreaBar} style={{ width: '80%' }} />
                  <div className={styles.placeholderAreaBar} style={{ width: '65%' }} />
                  <div className={styles.placeholderAreaBar} style={{ width: '50%' }} />
                  <div className={styles.placeholderAreaBar} style={{ width: '35%' }} />
                </div>
              )}
            </article>
          </section>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}
