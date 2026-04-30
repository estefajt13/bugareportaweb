"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FuncionarioGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import FuncionarioShell from "@/components/navigation/FuncionarioShell";
import AppFooter from "@/components/layout/AppFooter";
import {
  fetchFuncionarioReports,
  assignFuncionarioReport,
} from "@/features/reports/funcionario-api";
import styles from "./page.module.css";

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "en_proceso", label: "En proceso" },
  { value: "resuelto", label: "Resuelto" },
];

const ESTADO_COLORS = {
  pendiente:   { bg: "#FFF3E0", text: "#E65100" },
  en_revision: { bg: "#FFF8E1", text: "#F9A825" },
  en_proceso:  { bg: "#E3F2FD", text: "#1565C0" },
  resuelto:    { bg: "#E8F5E9", text: "#2E7D32" },
};

const ESTADO_LABELS = {
  pendiente:   "Pendiente",
  en_revision: "En revisión",
  en_proceso:  "En proceso",
  resuelto:    "Resuelto",
};

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

export default function FuncionarioReportesPage() {
  const { user, profile } = useAuth();
  const [reportes, setReportes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    estado: "",
    fechaDesde: "",
    fechaHasta: "",
  });
  const [assigningId, setAssigningId] = useState(null);

  const areaBruta = profile?.area || "";
  const areaQuery = areaBruta === "Infraestructura" ? "Infraestructura vial y espacio público" :
                    areaBruta === "Alumbrado" ? "Alumbrado público" :
                    areaBruta === "Servicios" ? "Servicios públicos domiciliarios" :
                    areaBruta === "Medio ambiente" ? "Medio ambiente y aseo urbano" :
                    areaBruta === "Seguridad" ? "Seguridad ciudadana" :
                    areaBruta === "Salud" ? "Salud pública" :
                    areaBruta === "Tránsito" || areaBruta === "Transito" ? "Tránsito y movilidad" :
                    areaBruta === "Gobierno" ? "Gobierno y atención ciudadana" :
                    areaBruta;

  async function cargarReportes() {
    if (!user || !areaQuery) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const data = await fetchFuncionarioReports(user.uid, areaQuery, filters);
      const ordenados = [...data].sort((a, b) => {
        const fa = a.fechaReporte ? new Date(a.fechaReporte) : new Date(0);
        const fb = b.fechaReporte ? new Date(b.fechaReporte) : new Date(0);
        return fb - fa;
      });
      setReportes(ordenados);
    } catch (err) {
      console.error("Error cargando reportes:", err);
      setError("No se pudieron cargar los reportes.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    cargarReportes();
  }, [user, areaQuery, filters]);

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAsignar(id) {
    if (!user || !areaQuery) return;

    setAssigningId(id);
    try {
      const reporteActualizado = await assignFuncionarioReport(user.uid, areaQuery, id);
      setReportes((prev) =>
        prev.map((r) => (r.id === id ? reporteActualizado : r))
      );
    } catch (err) {
      console.error("Error asignando reporte:", err);
      alert("No se pudo asignar el reporte: " + err.message);
    } finally {
      setAssigningId(null);
    }
  }

  function handleLimpiarFiltros() {
    setFilters({
      estado: "",
      fechaDesde: "",
      fechaHasta: "",
    });
  }

  return (
    <FuncionarioGuard>
      <main className={styles.page}>
        <FuncionarioShell
          activeSection="reportes"
          breadcrumb="Funcionario / Reportes"
        >
          <section className={styles.header}>
            <h1 className={styles.title}>Reportes del Área</h1>
            <p className={styles.subtitle}>
              {areaBruta ? `Área: ${areaBruta}` : "Sin área asignada"}
            </p>
          </section>

          <section className={styles.filters}>
            <div className={styles.filterRow}>
              <label className={styles.filterField}>
                Estado
                <select
                  name="estado"
                  value={filters.estado}
                  onChange={handleFilterChange}
                  className={styles.select}
                >
                  {ESTADOS.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.filterField}>
                Fecha desde
                <input
                  type="date"
                  name="fechaDesde"
                  value={filters.fechaDesde}
                  onChange={handleFilterChange}
                  className={styles.input}
                />
              </label>

              <label className={styles.filterField}>
                Fecha hasta
                <input
                  type="date"
                  name="fechaHasta"
                  value={filters.fechaHasta}
                  onChange={handleFilterChange}
                  className={styles.input}
                />
              </label>

              <button
                type="button"
                className={styles.clearButton}
                onClick={handleLimpiarFiltros}
              >
                Limpiar
              </button>
            </div>
          </section>

          {isLoading ? (
            <p className={styles.loading}>Cargando reportes...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : reportes.length === 0 ? (
            <p className={styles.empty}>No hay reportes en tu área con esos filtros.</p>
          ) : (
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
                  {reportes.map((reporte) => (
                    <tr key={reporte.id}>
                      <td>
                        <Link
                          href={`/funcionario/reportes/${reporte.id}`}
                          className={styles.asuntoLink}
                        >
                          {reporte.asunto || "Sin asunto"}
                        </Link>
                      </td>
                      <td>
                        <EstadoBadge estado={reporte.estado} />
                      </td>
                      <td>{reporte.tipoReporte?.nombre || "—"}</td>
                      <td>
                        {reporte.fechaReporte
                          ? new Date(reporte.fechaReporte).toLocaleDateString("es-CO")
                          : "—"}
                      </td>
                      <td>
                        {reporte.estado === "pendiente" && !reporte.uidFuncionario ? (
                          <button
                            className={styles.assignButton}
                            onClick={() => handleAsignar(reporte.id)}
                            disabled={assigningId === reporte.id}
                          >
                            {assigningId === reporte.id ? "Asignando..." : "Asignar"}
                          </button>
                        ) : reporte.uidFuncionario === user?.uid ? (
                          <Link
                            href={`/funcionario/reportes/${reporte.id}`}
                            className={styles.viewButton}
                          >
                            Ver
                          </Link>
                        ) : (
                          <span className={styles.assigned}>Asignado</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <AppFooter />
        </FuncionarioShell>
      </main>
    </FuncionarioGuard>
  );
}