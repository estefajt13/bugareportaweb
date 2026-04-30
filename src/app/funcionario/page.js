"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FuncionarioGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import FuncionarioShell from "@/components/navigation/FuncionarioShell";
import AppFooter from "@/components/layout/AppFooter";
import {
  fetchFuncionarioReports,
  fetchFuncionarioDashboardMetrics,
} from "@/features/reports/funcionario-api";
import styles from "./page.module.css";

const RECENT_LIMIT = 5;

const ESTADO_LABELS = {
  pendiente:   "Pendiente",
  en_revision: "En revisión",
  en_proceso:  "En proceso",
  resuelto:    "Resuelto",
  rechazado:   "Rechazado",
};

const ESTADO_COLORS = {
  pendiente:   { bg: "#FFF3E0", text: "#E65100" },
  en_revision: { bg: "#FFF8E1", text: "#F9A825" },
  en_proceso:  { bg: "#E3F2FD", text: "#1565C0" },
  resuelto:    { bg: "#E8F5E9", text: "#2E7D32" },
  rechazado:   { bg: "#FFEBEE", text: "#C62828" },
};

// Convierte área corta a nombre exacto usado en reportes móviles
const AREA_MAP = {
  "Infraestructura":            "Infraestructura vial y espacio público",
  "Alumbrado":                  "Alumbrado público",
  "Servicios":                  "Servicios públicos domiciliarios",
  "Medio ambiente":             "Medio ambiente y aseo urbano",
  "Seguridad":                  "Seguridad ciudadana",
  "Salud":                      "Salud pública",
  "Transito":                   "Tránsito y movilidad",
  "Tránsito":                   "Tránsito y movilidad",
  "Gobierno":                   "Gobierno y atención ciudadana",
};

function resolverArea(area) {
  if (!area) return null;
  // Si ya es el nombre largo, lo devuelve igual
  // Si es el corto, lo convierte
  return AREA_MAP[area] || area;
}

function EstadoBadge({ estado }) {
  const colors = ESTADO_COLORS[estado] || { bg: "#F0F0F0", text: "#555" };
  return (
    <span
      className={styles.badge}
      style={{ background: colors.bg, color: colors.text }}
    >
      {ESTADO_LABELS[estado] || estado}
    </span>
  );
}

export default function FuncionarioDashboard() {
  const { user, profile } = useAuth();
  const [metricas, setMetricas]   = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState("");

  const displayName = profile?.nombre?.split(" ")[0] || user?.email || "funcionario";
  const areaBruta   = profile?.area || "";
  // Nombre real del área tal como está en los reportes
  const areaQuery   = resolverArea(areaBruta);

  useEffect(() => {
    async function cargarDatos() {
      if (!user || !areaQuery) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Obtener métricas del dashboard
        const metricsData = await fetchFuncionarioDashboardMetrics(user.uid, areaQuery);
        setMetricas({
          total: metricsData.total || 0,
          pendiente: metricsData.pendiente || 0,
          en_proceso: (metricsData.en_revision || 0) + (metricsData.en_proceso || 0),
          resuelto: metricsData.resuelto || 0,
        });

        // Obtener reportes recientes
        const reportes = await fetchFuncionarioReports(user.uid, areaQuery);
        const ordenados = [...reportes].sort((a, b) => {
          const fa = a.fechaReporte ? new Date(a.fechaReporte) : new Date(0);
          const fb = b.fechaReporte ? new Date(b.fechaReporte) : new Date(0);
          return fb - fa;
        });
        setRecientes(ordenados.slice(0, RECENT_LIMIT));
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No se pudieron cargar los reportes. Verifica la conexión con el microservicio.");
      } finally {
        setIsLoading(false);
      }
    }

    if (areaQuery) {
      cargarDatos();
    }
  }, [user, areaQuery]);

  return (
    <FuncionarioGuard>
      <main className={styles.page}>
        <FuncionarioShell
          activeSection="dashboard"
          breadcrumb="Funcionario / Dashboard"
        >
          <section className={styles.welcomeCard}>
            <h1 className={styles.title}>Hola, {displayName} 👋</h1>
            <p className={styles.subtitle}>
              {areaBruta ? (
                <>Área asignada: <strong>{areaBruta}</strong></>
              ) : (
                <span style={{ color: "#E65100" }}>
                  ⚠️ Sin área asignada — mostrando todos los reportes
                </span>
              )}
            </p>
          </section>

          {isLoading ? (
            <p className={styles.loading}>Cargando datos...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : metricas ? (
            <section className={styles.metricsGrid}>
              <div className={styles.metricCard}>
                <p className={styles.metricLabel}>Total en mi área</p>
                <p className={styles.metricValue}>{metricas.total}</p>
              </div>
              <div className={`${styles.metricCard} ${styles.metricWarning}`}>
                <p className={styles.metricLabel}>Pendientes</p>
                <p className={styles.metricValue}>{metricas.pendiente}</p>
              </div>
              <div className={`${styles.metricCard} ${styles.metricInfo}`}>
                <p className={styles.metricLabel}>En proceso</p>
                <p className={styles.metricValue}>{metricas.en_proceso}</p>
              </div>
              <div className={`${styles.metricCard} ${styles.metricSuccess}`}>
                <p className={styles.metricLabel}>Resueltos</p>
                <p className={styles.metricValue}>{metricas.resuelto}</p>
              </div>
            </section>
          ) : null}

          <section className={styles.recentSection}>
            <div className={styles.recentHeader}>
              <h2 className={styles.recentTitle}>Reportes recientes del área</h2>
              <Link href="/funcionario/reportes" className={styles.verTodos}>
                Ver todos →
              </Link>
            </div>

            {!isLoading && recientes.length === 0 ? (
              <p className={styles.empty}>No hay reportes en tu área todavía.</p>
            ) : (
              <div className={styles.reportesList}>
                {recientes.map((r) => (
                  <Link
                    key={r.id}
                    href={`/funcionario/reportes/${r.id}`}
                    className={styles.reporteCard}
                  >
                    <div className={styles.reporteTop}>
                      <span className={styles.reporteAsunto}>
                        {r.asunto || "Sin asunto"}
                      </span>
                      <EstadoBadge estado={r.estado} />
                    </div>
                    <p className={styles.reporteMeta}>
                      {r.tipoReporte?.area?.nombre || r.id_area || "Sin área"} ·{" "}
                      {r.fechaReporte
                        ? new Date(r.fechaReporte).toLocaleDateString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <AppFooter />
        </FuncionarioShell>
      </main>
    </FuncionarioGuard>
  );
}