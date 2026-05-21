"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import {
  fetchAdminReport,
  fetchAdminReportHistory,
  updateAdminReport,
  addAdminComment,
  fetchAdminFuncionarios,
  reassignAdminReport,
} from "@/features/reports/admin-api";
import styles from "../../../funcionario/reportes/[id]/page.module.css";

const ESTADO_LABELS = {
  pendiente: "Pendiente",
  en_revision: "En revisión",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
};

export default function AdminReporteDetallePage() {
  const params = useParams();
  const { user } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [comentario, setComentario] = useState("");
  const [funcionarios, setFuncionarios] = useState([]);
  const [reassignTo, setReassignTo] = useState("");

  useEffect(() => {
    async function cargar() {
      if (!user || !params?.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const token = await user.getIdToken();
        const data = await fetchAdminReport(token, parseInt(params.id, 10));
        setReporte(data);
        setNuevoEstado(data?.estado || "");

        const history = await fetchAdminReportHistory(token, parseInt(params.id, 10));
        setHistorial(Array.isArray(history) ? history : (history?.items || []));

        // cargar lista de funcionarios para reasignar
        try {
          const funcs = await fetchAdminFuncionarios(token);
          setFuncionarios(Array.isArray(funcs) ? funcs : (funcs?.items || []));
        } catch (e) {
          console.warn("No se pudieron cargar funcionarios:", e);
        }
      } catch (err) {
        const message =
          err?.message ||
          "No se pudo cargar el reporte. Verifica la conexion con el microservicio.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    cargar();
  }, [user, params?.id]);

  async function handleActualizarEstado() {
    if (!user || !reporte) return;
    setActualizando(true);
    try {
      const token = await user.getIdToken();
      const data = await updateAdminReport(token, reporte.id, { estado: nuevoEstado, comentario });
      setReporte(data);

      const history = await fetchAdminReportHistory(token, reporte.id);
      setHistorial(Array.isArray(history) ? history : (history?.items || []));
      setComentario("");
    } catch (err) {
      alert("No se pudo actualizar el reporte: " + (err?.message || "Error de conexion"));
    } finally {
      setActualizando(false);
    }
  }

  async function handleAgregarComentario() {
    if (!user || !reporte || !comentario.trim()) return;
    setActualizando(true);
    try {
      const token = await user.getIdToken();
      await addAdminComment(token, reporte.id, comentario, false);
      const history = await fetchAdminReportHistory(token, reporte.id);
      setHistorial(Array.isArray(history) ? history : (history?.items || []));
      setComentario("");
    } catch (err) {
      alert("No se pudo agregar el comentario: " + (err?.message || "Error de conexion"));
    } finally {
      setActualizando(false);
    }
  }

  async function handleReassign() {
    if (!user || !reporte || !reassignTo) return;
    setActualizando(true);
    try {
      const token = await user.getIdToken();
      const data = await reassignAdminReport(token, reporte.id, reassignTo);
      setReporte(data);
      const history = await fetchAdminReportHistory(token, reporte.id);
      setHistorial(Array.isArray(history) ? history : (history?.items || []));
    } catch (err) {
      alert("No se pudo reasignar el reporte: " + (err?.message || "Error de conexion"));
    } finally {
      setActualizando(false);
    }
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <main className={styles.page}>
          <AdminShell activeSection="reportes" breadcrumb="Admin / Reportes / Detalle">
            <p className={styles.loading}>Cargando reporte...</p>
          </AdminShell>
        </main>
      </AdminGuard>
    );
  }

  if (error || !reporte) {
    return (
      <AdminGuard>
        <main className={styles.page}>
          <AdminShell activeSection="reportes" breadcrumb="Admin / Reportes / Detalle">
            <p className={styles.error}>{error || "Reporte no encontrado"}</p>
            <Link href="/admin/reportes" className={styles.backLink}>← Volver a reportes</Link>
          </AdminShell>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className={styles.page}>
        <AdminShell activeSection="reportes" breadcrumb="Admin / Reportes / Detalle">
          <div className={styles.header}>
            <Link href="/admin/reportes" className={styles.backLink}>← Volver a reportes</Link>
            <h1 className={styles.title}>{reporte.asunto || "Sin asunto"}</h1>
            <div className={styles.headerMeta}>
              <span className={styles.metaItem}>{reporte.tipoReporte?.nombre || "Sin tipo"}</span>
              <span className={styles.metaItem}>{reporte.fechaReporte ? new Date(reporte.fechaReporte).toLocaleDateString("es-CO") : "—"}</span>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.mainColumn}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Descripción</h2>
                <p className={styles.descripcion}>{reporte.descripcion || "Sin descripción"}</p>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Ubicación</h2>
                <div className={styles.ubicacion}>
                  <p><strong>Dirección:</strong> {reporte.direccion || "No especificada"}</p>
                </div>
              </section>
            </div>

            <div className={styles.sidebar}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Información</h2>
                <dl className={styles.dl}>
                  <dt>Tipo de reporte</dt>
                  <dd>{reporte.tipoReporte?.nombre || "—"}</dd>
                  <dt>Estado</dt>
                  <dd>{ESTADO_LABELS[reporte.estado] || reporte.estado}</dd>
                  <dt>Prioridad</dt>
                  <dd>{reporte.prioridad || "Normal"}</dd>
                  <dt>Reportado por</dt>
                  <dd>Ciudadano #{reporte.uidCiudadano?.slice(-6) || "—"}</dd>
                </dl>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Acciones</h2>

                <label className={styles.estadoLabel}>
                  Cambiar estado:
                  <select value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} className={styles.select} disabled={actualizando}>
                    {Object.entries(ESTADO_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentario (opcional)" className={styles.textarea} rows={3} />
                <button className={styles.actionButton} onClick={handleActualizarEstado} disabled={actualizando || nuevoEstado === reporte.estado}>{actualizando ? "Guardando..." : "💾 Guardar cambio"}</button>

                <div style={{ marginTop: 12 }}>
                  <label>Reasignar a:</label>
                  <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)} className={styles.select}>
                    <option value="">Seleccionar funcionario</option>
                    {funcionarios.map((f) => (
                      <option key={f.uid} value={f.uid}>{f.nombre || f.email || f.uid}</option>
                    ))}
                  </select>
                  <button className={styles.actionButton} onClick={handleReassign} disabled={actualizando || !reassignTo} style={{ marginLeft: 8 }}>{actualizando ? "Guardando..." : "Reasignar"}</button>
                </div>

                <div style={{ marginTop: 12 }}>
                  <h3>Agregar comentario</h3>
                  <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} placeholder="Comentario..." className={styles.textarea} rows={3} />
                  <div className={styles.commentActions}>
                    <button className={styles.cancelButton} onClick={() => setComentario("")}>Cancelar</button>
                    <button className={styles.actionButton} onClick={handleAgregarComentario} disabled={actualizando || !comentario.trim()}>{actualizando ? "Guardando..." : "Guardar comentario"}</button>
                  </div>
                </div>
              </section>

              {historial.length > 0 && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Historial de Cambios</h2>
                  <div className={styles.historyList}>
                    {historial.map((item) => (
                      <div key={item.id} className={styles.historyItem}>
                        <div className={styles.historyHeader}>
                          <span className={styles.historyType}>{item.tipo || "evento"}</span>
                          <span className={styles.historyDate}>{new Date(item.fechaCambio).toLocaleString("es-CO")}</span>
                        </div>
                        <p className={styles.historyDesc}>{item.descripcion}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}
