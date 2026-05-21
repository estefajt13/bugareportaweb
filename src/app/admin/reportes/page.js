"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import {
  fetchAdminReports,
} from "@/features/reports/admin-api";
import styles from "../../funcionario/reportes/page.module.css";
import adminStyles from "./page.module.css";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "en_proceso", label: "En proceso" },
  { value: "resuelto", label: "Resuelto" },
];

const ESTADO_LABELS = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
};

function EstadoBadge({ estado }) {
  return (
    <span className={styles.badge}>
      {ESTADO_LABELS[estado] || estado}
    </span>
  );
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString("es-CO") : "—";
}

function groupReportsByCluster(reportes) {
  const clusters = new Map();
  const individuales = [];

  for (const reporte of reportes) {
    if (reporte.clusterId === null || reporte.clusterId === undefined) {
      individuales.push(reporte);
      continue;
    }

    const key = String(reporte.clusterId);
    const current = clusters.get(key) || [];
    current.push(reporte);
    clusters.set(key, current);
  }

  const sortByDateDesc = (a, b) => {
    const fa = a.fechaReporte ? new Date(a.fechaReporte) : new Date(0);
    const fb = b.fechaReporte ? new Date(b.fechaReporte) : new Date(0);
    return fb - fa;
  };

  const clusterGroups = Array.from(clusters.entries())
    .map(([clusterId, items]) => ({
      clusterId,
      items: [...items].sort(sortByDateDesc),
      latestDate: items.reduce((latest, item) => {
        const itemDate = item.fechaReporte ? new Date(item.fechaReporte) : new Date(0);
        return itemDate > latest ? itemDate : latest;
      }, new Date(0)),
    }))
    .sort((a, b) => b.latestDate - a.latestDate);

  return {
    clusterGroups,
    individuales: individuales.sort(sortByDateDesc),
  };
}

function ReportRow({ reporte }) {
  return (
    <tr>
      <td>
        <Link href={`/admin/reportes/${reporte.id}`} className={styles.asuntoLink}>
          {reporte.asunto || "Sin asunto"}
        </Link>
      </td>
      <td><EstadoBadge estado={reporte.estado} /></td>
      <td>{reporte.tipoReporte?.nombre || "—"}</td>
      <td>{formatDate(reporte.fechaReporte)}</td>
      <td>
        <Link href={`/admin/reportes/${reporte.id}`} className={styles.viewButton}>
          Ver
        </Link>
      </td>
    </tr>
  );
}

function ClusterCard({ clusterId, items }) {
  return (
    <article className={adminStyles.clusterCard}>
      <div className={adminStyles.clusterHeader}>
        <div>
          <p className={adminStyles.clusterLabel}>Cluster</p>
          <h3 className={adminStyles.clusterTitle}>#{clusterId}</h3>
        </div>
        <div className={adminStyles.clusterMeta}>
          <span className={adminStyles.clusterCount}>{items.length} reportes</span>
          <span className={adminStyles.clusterHint}>Agrupados por clusterId</span>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Asunto</th>
              <th>Estado</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((reporte) => (
              <ReportRow key={reporte.id} reporte={reporte} />
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export default function AdminReportesPage() {
  const { user } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ estado: "", fechaDesde: "", fechaHasta: "", area: "" });

  async function cargarReportes() {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = await user.getIdToken();
      const data = await fetchAdminReports(token, filters);
      const ordenados = Array.isArray(data) ? [...data] : (data?.items ? [...data.items] : []);
      ordenados.sort((a, b) => {
        const fa = a.fechaReporte ? new Date(a.fechaReporte) : new Date(0);
        const fb = b.fechaReporte ? new Date(b.fechaReporte) : new Date(0);
        return fb - fa;
      });
      setReportes(ordenados);
    } catch (err) {
      const message =
        err?.message ||
        "No se pudieron cargar los reportes. Verifica la conexion con el microservicio.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarReportes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, filters]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function handleLimpiarFiltros() {
    setFilters({ estado: "", fechaDesde: "", fechaHasta: "", area: "" });
  }

  const { clusterGroups, individuales } = useMemo(
    () => groupReportsByCluster(reportes),
    [reportes]
  );

  return (
    <AdminGuard>
      <main className={styles.page}>
        <AdminShell activeSection="reportes" breadcrumb="Admin / Reportes">
          <section className={styles.header}>
            <h1 className={styles.title}>Reportes (Administrador)</h1>
            <p className={styles.subtitle}>Ver y gestionar todos los reportes del sistema</p>
          </section>

          <section className={styles.filters}>
            <div className={styles.filterRow}>
              <label className={styles.filterField}>
                Estado
                <select name="estado" value={filters.estado} onChange={handleFilterChange} className={styles.select}>
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>{estado.label}</option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                Fecha desde
                <input type="date" name="fechaDesde" value={filters.fechaDesde} onChange={handleFilterChange} className={styles.input} />
              </label>

              <label className={styles.filterField}>
                Fecha hasta
                <input type="date" name="fechaHasta" value={filters.fechaHasta} onChange={handleFilterChange} className={styles.input} />
              </label>

              <label className={styles.filterField}>
                Área
                <input type="text" name="area" value={filters.area} onChange={handleFilterChange} className={styles.input} placeholder="Nombre de área (opcional)" />
              </label>

              <button type="button" className={styles.clearButton} onClick={handleLimpiarFiltros}>Limpiar</button>
            </div>
          </section>

          {isLoading ? (
            <p className={styles.loading}>Cargando reportes...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : reportes.length === 0 ? (
            <p className={styles.empty}>No hay reportes con esos filtros.</p>
          ) : (
            <div className={adminStyles.groupedResults}>
              {clusterGroups.length > 0 && (
                <section className={adminStyles.sectionBlock}>
                  <div className={adminStyles.sectionHeader}>
                    <h2 className={adminStyles.sectionTitle}>Reportes en clusters</h2>
                    <p className={adminStyles.sectionHint}>
                      Los reportes que comparten clusterId se muestran agrupados.
                    </p>
                  </div>

                  <div className={adminStyles.clusterList}>
                    {clusterGroups.map((cluster) => (
                      <ClusterCard
                        key={cluster.clusterId}
                        clusterId={cluster.clusterId}
                        items={cluster.items}
                      />
                    ))}
                  </div>
                </section>
              )}

              {individuales.length > 0 && (
                <section className={adminStyles.sectionBlock}>
                  <div className={adminStyles.sectionHeader}>
                    <h2 className={adminStyles.sectionTitle}>Reportes individuales</h2>
                    <p className={adminStyles.sectionHint}>
                      Reportes sin clusterId, mostrados uno por uno.
                    </p>
                  </div>

                  <div className={styles.tableContainer}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Asunto</th>
                          <th>Estado</th>
                          <th>Tipo</th>
                          <th>Fecha</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {individuales.map((reporte) => (
                          <ReportRow key={reporte.id} reporte={reporte} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          )}

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}
