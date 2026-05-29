"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchEstadisticasDashboard,
  checkStatisticsApiHealth,
  EMPTY_ESTADISTICAS_DASHBOARD_DATA,
} from "@/features/statistics/statistics-api";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
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
  const [estadisticasData, setEstadisticasData] = useState(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
  const [mapPoints, setMapPoints] = useState([]);
  const [mapLoading, setMapLoading] = useState(true);
  const [mapError, setMapError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null); // null | 'connected' | 'error'

  const displayName = profile?.nombre || user?.email || "usuario";
  const isPlaceholderMode = estadisticasData.isUsingPlaceholder;

  // Cargar datos desde el microservicio de estadísticas (única fuente de verdad)
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
        // Verificar conexión con el microservicio de estadísticas
        const healthCheck = await checkStatisticsApiHealth();
        if (!healthCheck.ok) {
          console.warn("Advertencia de conexión:", healthCheck.message);
          setConnectionStatus('error');
        } else {
          setConnectionStatus('connected');
        }

        // Cargar todos los datos del dashboard desde el microservicio de estadísticas
        const data = await fetchEstadisticasDashboard({ periodo: period });
        if (isMounted) {
          setEstadisticasData(data);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setConnectionStatus('error');
        if (isMounted) {
          setEstadisticasData(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
          setLoadError("No fue posible consultar estadísticas. Verifica la conexión con el microservicio de estadísticas.");
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
    if (!estadisticasData.reportsByArea.length) {
      return null;
    }
    return estadisticasData.reportsByArea[0]?.porcentaje ?? null;
  }, [estadisticasData.reportsByArea]);

  // Calcular pendientes desde estadisticasData
  const pendingReports = useMemo(() => {
    // Total - en_proceso - en_revision - resueltos = pendientes
    const total = estadisticasData.metrics.totalReports || 0;
    const inProgress = estadisticasData.metrics.inProgressReports || 0;
    const solved = estadisticasData.metrics.solvedReports || 0;
    return Math.max(0, total - inProgress - solved);
  }, [estadisticasData.metrics]);

  return (
    <AdminGuard>
      <main className={styles.page}>
        <div className={styles.backgroundGlow} />

        <AdminShell activeSection="dashboard" breadcrumb="Admin / Dashboard">
          <section className={styles.welcomeCard}>
            <h1 className={styles.title}>Hola, {displayName}</h1>
            <p className={styles.subtitle}>
              {isPlaceholderMode
                ? "Este dashboard usa placeholders mientras se integra el microservicio de estadísticas."
                : "Visualiza métricas y estadísticas de todos los reportes de la plataforma."}
            </p>
            {isLoading ? <p className={styles.info}>Cargando datos...</p> : null}
            {loadError ? <p className={styles.error}>{loadError}</p> : null}
            {connectionStatus === 'connected' && !isPlaceholderMode && (
              <p style={{ color: '#2E7D32', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ✓ Conectado al microservicio de estadísticas
              </p>
            )}
            {connectionStatus === 'error' && (
              <p style={{ color: '#C62828', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                ⚠ Error de conexión con el microservicio de estadísticas
              </p>
            )}
          </section>

          {/* Métricas principales - estilo funcionario */}
          {isLoading ? null : (
            <section className={styles.metricsSection}>
              <div className={styles.metricsHeader}>
                <h2 className={styles.sectionTitle}>Métricas Principales</h2>
                <label className={styles.periodFilter}>
                  Período:
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
              </div>
              <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                  <p className={styles.metricLabel}>Total de reportes</p>
                  <p className={styles.metricValue}>{formatMetricValue(estadisticasData.metrics.totalReports)}</p>
                </div>
                <div className={`${styles.metricCard} ${styles.metricWarning}`}>
                  <p className={styles.metricLabel}>Pendientes</p>
                  <p className={styles.metricValue}>{formatMetricValue(pendingReports)}</p>
                </div>
                <div className={`${styles.metricCard} ${styles.metricInfo}`}>
                  <p className={styles.metricLabel}>En proceso</p>
                  <p className={styles.metricValue}>{formatMetricValue(estadisticasData.metrics.inProgressReports)}</p>
                </div>
                <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
                  <p className={styles.metricLabel}>Resueltos</p>
                  <p className={styles.metricValue}>{formatMetricValue(estadisticasData.metrics.solvedReports)}</p>
                </div>
              </div>
            </section>
          )}

          {/* Mapa de reportes */}
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


          {/* Sección de estadísticas */}
          <section className={styles.statsSection}>
            <div className={styles.statsHeader}>
              <h2 className={styles.statsTitle}>Estadísticas</h2>
              <p className={styles.statsSubtitle}>
                {isPlaceholderMode
                  ? "Estas estadísticas usan placeholders mientras se integra el microservicio."
                  : "Información detallada sobre los reportes de la plataforma."}
              </p>
              {connectionStatus === 'connected' && !isPlaceholderMode && (
                <p style={{ color: '#2E7D32', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ✓ Conectado al microservicio de estadísticas
                </p>
              )}
              {connectionStatus === 'error' && (
                <p style={{ color: '#C62828', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  ⚠ Error de conexión con el microservicio de estadísticas
                </p>
              )}
            </div>

            {/* Métricas de estadísticas - colores diferentes */}
            <div className={styles.advancedMetricsGrid}>
              <div className={styles.statMetricCard}>
                <p className={styles.metricLabel}>Área más activa</p>
                <p className={styles.metricValue}>{estadisticasData.areaMasActiva?.area || "--"}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b5a45', marginTop: '4px' }}>
                  {estadisticasData.areaMasActiva?.total ? `${estadisticasData.areaMasActiva.total} reportes` : "Sin datos"}
                </p>
              </div>
              <div className={`${styles.statMetricCard} ${styles.statMetricCardWarning}`}>
                <p className={styles.metricLabel}>Mes con más reportes</p>
                <p className={styles.metricValue}>
                  {estadisticasData.tendenciaMensual.length > 0 
                    ? estadisticasData.tendenciaMensual.reduce((max, m) => m.total > max.total ? m : max).mes 
                    : "--"}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b5a45', marginTop: '4px' }}>Últimos 6 meses</p>
              </div>
              <div className={`${styles.statMetricCard} ${styles.statMetricCardInfo}`}>
                <p className={styles.metricLabel}>Tendencia actual</p>
                <p className={styles.metricValue}>
                  {estadisticasData.tendenciaMensual.length > 0 
                    ? `${estadisticasData.tendenciaMensual[estadisticasData.tendenciaMensual.length - 1]?.total || 0}`
                    : "--"}
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b5a45', marginTop: '4px' }}>Último mes</p>
              </div>
              <div className={`${styles.statMetricCard} ${styles.statMetricCardSuccess}`}>
                <p className={styles.metricLabel}>Total tipos</p>
                <p className={styles.metricValue}>{estadisticasData.tiposFrecuentes.length || "--"}</p>
                <p style={{ fontSize: '0.75rem', color: '#6b5a45', marginTop: '4px' }}>Esta semana</p>
              </div>
            </div>

            {/* Gráficos de estadísticas */}
            <div className={styles.advancedChartGrid}>
              <article className={styles.advancedPanel}>
                <h3 className={styles.advancedPanelTitle}>Procesos diarios</h3>
                <p className={styles.advancedPanelHint}>
                  {estadisticasData.dailyProcesses.length > 0 ? (() => {
                    const data = estadisticasData.dailyProcesses;
                    const diasConActividad = data.filter(d => (d.total || 0) > 0).length;
                    const diasSinActividad = data.filter(d => (d.total || 0) === 0).length;
                    const primeraFecha = data[0]?.fecha || '';
                    const ultimaFecha = data[data.length - 1]?.fecha || '';
                    
                    // Calcular número de semana
                    const fecha = new Date(ultimaFecha);
                    const inicioAno = new Date(fecha.getFullYear(), 0, 1);
                    const numSemana = Math.ceil(((fecha - inicioAno) / 86400000 + 1) / 7);
                    
                    return (
                      <>
                        <span style={{ fontWeight: '600' }}>
                          {period === 'semanal' ? `Semana ${numSemana}` : period === 'mensal' ? 'Último mes' : 'Último año'}
                        </span>
                        <span style={{ color: '#6b5a45' }}>
                          {' '}| {diasConActividad} días con actividad{diasSinActividad > 0 ? `, ${diasSinActividad} días sin reportes` : ''}
                        </span>
                        {diasSinActividad > 0 && (
                          <span style={{ display: 'block', fontSize: '0.78rem', color: '#8f7758', marginTop: '2px' }}>
                            Días sin reportes: {data.filter(d => (d.total || 0) === 0).map(d => d.fecha).join(', ')}
                          </span>
                        )}
                      </>
                    );
                  })() : `Vista ${period} (placeholder)`}
                </p>
                <div className={styles.fakeLineChart}>
                  {estadisticasData.dailyProcesses.length > 0 ? (
                    estadisticasData.dailyProcesses.slice(0, 14).map((item, index) => {
                      const value = item.total || 0;
                      const maxValue = Math.max(...estadisticasData.dailyProcesses.map(d => d.total || 0), 1);
                      const height = Math.max((value / maxValue) * 100, 10);
                      const esCero = value === 0;
                      return (
                        <span
                          key={index}
                          className={styles.bar}
                          style={{ 
                            height: `${height}%`, 
                            background: esCero 
                              ? 'linear-gradient(180deg, #ccc 0%, #e0e0e0 100%)' 
                              : 'linear-gradient(180deg, #c66c1e 0%, #e8a854 100%)'
                          }}
                          title={`${item.fecha}: ${item.total} reportes${esCero ? ' (sin actividad)' : ''}`}
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
                {/* Leyenda de días */}
                {estadisticasData.dailyProcesses.length > 0 && (
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.78rem', color: '#6b5a45' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'linear-gradient(180deg, #c66c1e, #e8a854)', display: 'inline-block' }}></span>
                      Con actividad
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ width: '12px', height: '12px', borderRadius: '2px', background: 'linear-gradient(180deg, #ccc, #e0e0e0)', display: 'inline-block' }}></span>
                      Sin actividad
                    </span>
                  </div>
                )}
              </article>

              <article className={styles.advancedPanel}>
                <h3 className={styles.advancedPanelTitle}>Reportes por area</h3>
                <p className={styles.advancedPanelHint}>
                  {estadisticasData.reportsByArea.length
                    ? `Top area: ${estadisticasData.reportsByArea[0]?.area || estadisticasData.reportsByArea[0]?.areaNombre || "N/A"}`
                    : "Porcentaje por categoria (placeholder)"}
                </p>
                <div className={styles.fakeDonut}>
                  <div className={styles.donutCenter}>
                    {formatMetricValue(areaTopPercentage, "%")}
                  </div>
                </div>
                {estadisticasData.reportsByArea.length > 0 && (
                  <div className={styles.legendContainer}>
                    {estadisticasData.reportsByArea.slice(0, 4).map((area, index) => (
                      <div key={index} className={styles.legendItem}>
                        <span 
                          className={styles.legendDot} 
                          style={{ backgroundColor: legendColors[index] }}
                        />
                        <span className={styles.legendLabel}>
                          {area.area || area.areaNombre}
                        </span>
                        <span className={styles.legendValue}>
                          {area.total ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </article>

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
            </div>
          </section>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}
