"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import {
  fetchEstadisticasDashboard,
  checkStatisticsApiHealth,
  EMPTY_ESTADISTICAS_DASHBOARD_DATA,
} from "@/features/statistics/statistics-api";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import MetricCard from "@/components/dashboard/MetricCard";
import styles from "./page.module.css";

function formatMetricValue(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "--";
  }
  const numValue = Number(value);
  const formatted = Number.isInteger(numValue) ? numValue : Math.round(numValue * 100) / 100;
  return `${formatted}${suffix}`;
}

export default function AdminEstadisticasPage() {
  const { user, profile } = useAuth();
  const [period, setPeriod] = useState("semanal");
  const [dashboardData, setDashboardData] = useState(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [connectionStatus, setConnectionStatus] = useState(null);

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
        // Verificar conexión con el microservicio de estadísticas
        const healthCheck = await checkStatisticsApiHealth();
        if (!healthCheck.ok) {
          console.warn("Advertencia de conexión:", healthCheck.message);
          setConnectionStatus('error');
        } else {
          setConnectionStatus('connected');
        }

        const data = await fetchEstadisticasDashboard({ periodo });
        if (isMounted) {
          setDashboardData(data);
        }
      } catch (err) {
        console.error("Error cargando estadísticas:", err);
        setConnectionStatus('error');
        if (isMounted) {
          setDashboardData(EMPTY_ESTADISTICAS_DASHBOARD_DATA);
          setLoadError("No fue posible consultar estadísticas. Verifica la conexión con el microservicio.");
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

  return (
    <AdminGuard>
      <main className={styles.page}>
        <div className={styles.backgroundGlow} />

        <AdminShell activeSection="estadisticas" breadcrumb="Admin / Estadísticas">
          <section className={styles.filtersBar}>
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
            <h1 className={styles.title}>Estadísticas - Hola, {displayName}</h1>
            <p className={styles.subtitle}>
              {isPlaceholderMode
                ? "Este dashboard usa placeholders mientras se integra el microservicio de estadísticas."
                : "Visualiza estadísticas avanzadas de todos los reportes de la plataforma."}
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
                ⚠ Error de conexión con el microservicio
              </p>
            )}
          </section>

          {/* Métricas principales */}
          <section className={styles.metricsGrid}>
            <MetricCard
              title="Área más activa"
              value={dashboardData.areaMasActiva?.area || "--"}
              helper={dashboardData.areaMasActiva?.total ? `${dashboardData.areaMasActiva.total} reportes activos` : "Sin datos"}
              emphasis="warning"
            />
            <MetricCard
              title="Tipo más frecuente"
              value={dashboardData.tipoMasFrecuente?.tipo || "--"}
              helper={dashboardData.tipoMasFrecuente?.area || "Sin datos"}
              emphasis="primary"
            />
            <MetricCard
              title="Reportes resueltos"
              value={formatMetricValue(dashboardData.tiposFrecuentes.reduce((sum, t) => sum + (t.total || 0), 0))}
              helper="Última semana"
              emphasis="success"
            />
            <MetricCard
              title="Mes con más reportes"
              value={dashboardData.tendenciaMensual.length > 0 
                ? dashboardData.tendenciaMensual.reduce((max, m) => m.total > max.total ? m : max).mes 
                : "--"}
              helper="Últimos 6 meses"
              emphasis="primary"
            />
          </section>

          {/* Tipos más frecuentes */}
          <section className={styles.chartGrid}>
            <article className={styles.panel}>
              <h2 className={styles.panelTitle}>Tipos de reportes más frecuentes</h2>
              <p className={styles.panelHint}>
                {dashboardData.tiposFrecuentes.length > 0
                  ? `${dashboardData.tiposFrecuentes.length} tipos reportados esta semana`
                  : "Última semana (placeholder)"}
              </p>
              {dashboardData.tiposFrecuentes.length > 0 ? (
                <div className={styles.listContainer}>
                  {dashboardData.tiposFrecuentes.map((tipo, index) => (
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

            {/* Tendencia mensual */}
            <article className={styles.panel}>
              <h2 className={styles.panelTitle}>Tendencia mensual</h2>
              <p className={styles.panelHint}>
                {dashboardData.tendenciaMensual.length > 0
                  ? `${dashboardData.tendenciaMensual.length} meses de datos`
                  : "Últimos 6 meses (placeholder)"}
              </p>
              <div className={styles.fakeLineChart}>
                {dashboardData.tendenciaMensual.length > 0 ? (
                  dashboardData.tendenciaMensual.map((item, index) => {
                    const maxValue = Math.max(...dashboardData.tendenciaMensual.map(m => m.total || 0), 1);
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
          </section>

          {/* Procesos diarios */}
          <section className={styles.fullWidthPanel}>
            <h2 className={styles.panelTitle}>Procesos diarios</h2>
            <p className={styles.panelHint}>
              {dashboardData.dailyProcesses.length > 0
                ? `${dashboardData.dailyProcesses.length} días con actividad`
                : `Vista ${period} (placeholder)`}
            </p>
            <div className={styles.fakeLineChart}>
              {dashboardData.dailyProcesses.length > 0 ? (
                dashboardData.dailyProcesses.slice(0, 14).map((item, index) => {
                  const value = item.total || 0;
                  const maxValue = Math.max(...dashboardData.dailyProcesses.map(d => d.total || 0), 1);
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
          </section>

          {/* Distribución por área */}
          <section className={styles.areaPanel}>
            <h2 className={styles.panelTitle}>Distribución por área</h2>
            <p className={styles.panelHint}>
              {dashboardData.reportsByArea.length > 0
                ? `${dashboardData.reportsByArea.length} áreas con reportes`
                : "Distribución por área (placeholder)"}
            </p>
            {dashboardData.reportsByArea.length > 0 ? (
              <div className={styles.areaGrid}>
                {dashboardData.reportsByArea.map((area, index) => (
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
          </section>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}