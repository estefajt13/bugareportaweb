"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FuncionarioGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import FuncionarioShell from "@/components/navigation/FuncionarioShell";
import AppFooter from "@/components/layout/AppFooter";
import {
  fetchFuncionarioReport,
  updateFuncionarioReportStatus,
  assignFuncionarioReport,
  fetchFuncionarioReportHistory,
  addFuncionarioComment,
} from "@/features/reports/funcionario-api";
import styles from "./page.module.css";

const ESTADO_LABELS = {
  pendiente:   "Pendiente",
  en_revision: "En revisión",
  en_proceso:  "En proceso",
  resuelto:    "Resuelto",
};

const ESTADO_COLORS = {
  pendiente:   { bg: "#FFF3E0", text: "#E65100" },
  en_revision: { bg: "#FFF8E1", text: "#F9A825" },
  en_proceso:  { bg: "#E3F2FD", text: "#1565C0" },
  resuelto:    { bg: "#E8F5E9", text: "#2E7D32" },
};

// Transiciones válidas de estado
const TRANSICIONES_VALIDAS = {
  pendiente:   ["en_revision", "en_proceso"],
  en_revision: ["en_proceso", "pendiente"],
  en_proceso:  ["resuelto", "en_revision"],
  resuelto:    [],
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

export default function ReporteDetallePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile } = useAuth();
  const [reporte, setReporte] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actualizando, setActualizando] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [comentario, setComentario] = useState("");
  const [notificarCiudadano, setNotificarCiudadano] = useState(false);
  const [showCommentBox, setShowCommentBox] = useState(false);

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

  useEffect(() => {
    async function cargarDatos() {
      if (!user || !areaQuery || !params.id) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        // Cargar reporte
        const data = await fetchFuncionarioReport(user.uid, areaQuery, parseInt(params.id));
        setReporte(data);
        setNuevoEstado(data.estado);

        // Cargar historial
        const history = await fetchFuncionarioReportHistory(user.uid, areaQuery, parseInt(params.id));
        setHistorial(history);
      } catch (err) {
        console.error("Error cargando datos:", err);
        setError("No se pudo cargar el reporte. Es posible que no pertenezca a tu área.");
      } finally {
        setIsLoading(false);
      }
    }

    cargarDatos();
  }, [user, areaQuery, params.id]);

  async function handleAsignar() {
    if (!user || !areaQuery || !reporte) return;

    setActualizando(true);
    try {
      const data = await assignFuncionarioReport(user.uid, areaQuery, reporte.id);
      setReporte(data);
      setNuevoEstado(data.estado);
    } catch (err) {
      console.error("Error asignando reporte:", err);
      alert("No se pudo asignar el reporte: " + err.message);
    } finally {
      setActualizando(false);
    }
  }

  async function handleActualizarEstado() {
    if (!user || !areaQuery || !reporte) return;

    setActualizando(true);
    try {
      const data = await updateFuncionarioReportStatus(
        user.uid, areaQuery, reporte.id, nuevoEstado, 
        comentario || null, notificarCiudadano
      );
      setReporte(data);
      
      // Recargar historial
      const history = await fetchFuncionarioReportHistory(user.uid, areaQuery, reporte.id);
      setHistorial(history);
      
      // Limpiar comentario
      setComentario("");
      setNotificarCiudadano(false);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      alert("No se pudo actualizar el estado: " + err.message);
    } finally {
      setActualizando(false);
    }
  }

  async function handleAgregarComentario() {
    if (!user || !areaQuery || !reporte || !comentario.trim()) return;

    setActualizando(true);
    try {
      await addFuncionarioComment(user.uid, areaQuery, reporte.id, comentario, notificarCiudadano);
      
      // Recargar historial
      const history = await fetchFuncionarioReportHistory(user.uid, areaQuery, reporte.id);
      setHistorial(history);
      
      // Limpiar
      setComentario("");
      setNotificarCiudadano(false);
      setShowCommentBox(false);
    } catch (err) {
      console.error("Error agregando comentario:", err);
      alert("No se pudo agregar el comentario: " + err.message);
    } finally {
      setActualizando(false);
    }
  }

  function getTransicionesPermitidas() {
    if (!reporte) return [];
    return TRANSICIONES_VALIDAS[reporte.estado] || [];
  }

  if (isLoading) {
    return (
      <FuncionarioGuard>
        <main className={styles.page}>
          <FuncionarioShell activeSection="reportes" breadcrumb="Funcionario / Reportes / Detalle">
            <p className={styles.loading}>Cargando reporte...</p>
          </FuncionarioShell>
        </main>
      </FuncionarioGuard>
    );
  }

  if (error || !reporte) {
    return (
      <FuncionarioGuard>
        <main className={styles.page}>
          <FuncionarioShell activeSection="reportes" breadcrumb="Funcionario / Reportes / Detalle">
            <p className={styles.error}>{error || "Reporte no encontrado"}</p>
            <Link href="/funcionario/reportes" className={styles.backLink}>
              ← Volver a reportes
            </Link>
          </FuncionarioShell>
        </main>
      </FuncionarioGuard>
    );
  }

  const puedeActualizar = getTransicionesPermitidas().includes(nuevoEstado);
  const esSuReporte = reporte.uidFuncionario === user?.uid;

  return (
    <FuncionarioGuard>
      <main className={styles.page}>
        <FuncionarioShell
          activeSection="reportes"
          breadcrumb="Funcionario / Reportes / Detalle"
        >
          <div className={styles.header}>
            <Link href="/funcionario/reportes" className={styles.backLink}>
              ← Volver a reportes
            </Link>
            <h1 className={styles.title}>{reporte.asunto || "Sin asunto"}</h1>
            <div className={styles.headerMeta}>
              <EstadoBadge estado={reporte.estado} />
              <span className={styles.metaItem}>
                {reporte.tipoReporte?.area?.nombre || "Sin área"}
              </span>
              <span className={styles.metaItem}>
                {reporte.fechaReporte
                  ? new Date(reporte.fechaReporte).toLocaleDateString("es-CO", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.mainColumn}>
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Descripción</h2>
                <p className={styles.descripcion}>
                  {reporte.descripcion || "Sin descripción"}
                </p>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Ubicación</h2>
                <div className={styles.ubicacion}>
                  <p>
                    <strong>Dirección:</strong> {reporte.direccion || "No especificada"}
                  </p>
                  {reporte.latitud && reporte.longitud && (
                    <p>
                      <strong>Coordenadas:</strong> {reporte.latitud}, {reporte.longitud}
                    </p>
                  )}
                  {reporte.zona && (
                    <p>
                      <strong>Zona:</strong> {reporte.zona}
                    </p>
                  )}
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
                  <dd><EstadoBadge estado={reporte.estado} /></dd>

                  <dt>Prioridad</dt>
                  <dd>{reporte.prioridad || "Normal"}</dd>

                  <dt>Reportado por</dt>
                  <dd>Ciudadano #{reporte.uidCiudadano?.slice(-6) || "—"}</dd>

                  {reporte.uidFuncionario && (
                    <>
                      <dt>Asignado a</dt>
                      <dd>Funcionario #{reporte.uidFuncionario.slice(-6)}</dd>
                    </>
                  )}
                </dl>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Acciones</h2>

                {/* Botón para asignarse el reporte */}
                {reporte.estado === "pendiente" && !reporte.uidFuncionario && (
                  <button
                    className={styles.actionButton}
                    onClick={handleAsignar}
                    disabled={actualizando}
                  >
                    {actualizando ? "Asignando..." : "📋 Asignarme este reporte"}
                  </button>
                )}

                {/* Selector de estado - solo si es su reporte */}
                {esSuReporte && (
                  <div className={styles.estadoSection}>
                    <label className={styles.estadoLabel}>
                      Cambiar estado:
                      <select
                        value={nuevoEstado}
                        onChange={(e) => setNuevoEstado(e.target.value)}
                        className={styles.select}
                        disabled={actualizando}
                      >
                        {Object.entries(ESTADO_LABELS).map(([value, label]) => {
                          const permitido = getTransicionesPermitidas().includes(value);
                          return (
                            <option
                              key={value}
                              value={value}
                              disabled={!permitido && value !== reporte.estado}
                            >
                              {label}
                              {!permitido && value !== reporte.estado ? " (no disponible)" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </label>

                    {/* Comentario opcional */}
                    <div className={styles.comentarioSection}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={notificarCiudadano}
                          onChange={(e) => setNotificarCiudadano(e.target.checked)}
                          disabled={actualizando}
                        />
                        <span>Enviar mensaje al ciudadano</span>
                      </label>

                      <textarea
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="Comentario sobre el cambio (opcional)"
                        className={styles.textarea}
                        disabled={actualizando}
                        rows={3}
                      />
                    </div>

                    <button
                      className={styles.actionButton}
                      onClick={handleActualizarEstado}
                      disabled={actualizando || !puedeActualizar || nuevoEstado === reporte.estado}
                    >
                      {actualizando ? "Guardando..." : "💾 Guardar cambio"}
                    </button>

                    {!puedeActualizar && nuevoEstado !== reporte.estado && (
                      <p className={styles.hint}>
                        Este estado no está disponible para la transición actual.
                      </p>
                    )}
                  </div>
                )}

                {/* Botón para agregar comentario sin cambiar estado */}
                {esSuReporte && (
                  <div className={styles.commentSection}>
                    {!showCommentBox ? (
                      <button
                        className={styles.commentButton}
                        onClick={() => setShowCommentBox(true)}
                        disabled={actualizando}
                      >
                        💬 Agregar comentario
                      </button>
                    ) : (
                      <div className={styles.commentBox}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={notificarCiudadano}
                            onChange={(e) => setNotificarCiudadano(e.target.checked)}
                            disabled={actualizando}
                          />
                          <span>Visible para el ciudadano</span>
                        </label>
                        <textarea
                          value={comentario}
                          onChange={(e) => setComentario(e.target.value)}
                          placeholder="Escribe un comentario..."
                          className={styles.textarea}
                          disabled={actualizando}
                          rows={3}
                        />
                        <div className={styles.commentActions}>
                          <button
                            className={styles.cancelButton}
                            onClick={() => {
                              setShowCommentBox(false);
                              setComentario("");
                              setNotificarCiudadano(false);
                            }}
                            disabled={actualizando}
                          >
                            Cancelar
                          </button>
                          <button
                            className={styles.actionButton}
                            onClick={handleAgregarComentario}
                            disabled={actualizando || !comentario.trim()}
                          >
                            {actualizando ? "Guardando..." : "Guardar comentario"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!esSuReporte && reporte.uidFuncionario && (
                  <p className={styles.hint}>
                    Este reporte está asignado a otro funcionario.
                  </p>
                )}
              </section>

              {/* Historial */}
              {historial.length > 0 && (
                <section className={styles.card}>
                  <h2 className={styles.cardTitle}>Historial de Cambios</h2>
                  <div className={styles.historyList}>
                    {historial.map((item) => (
                      <div key={item.id} className={styles.historyItem}>
                        <div className={styles.historyHeader}>
                          <span className={styles.historyType}>
                            {item.tipo === "estado" && "🔄 Cambio de estado"}
                            {item.tipo === "mensaje_ciudadano" && "📩 Mensaje al ciudadano"}
                            {item.tipo === "comentario_interno" && "📝 Comentario interno"}
                          </span>
                          <span className={styles.historyDate}>
                            {new Date(item.fechaCambio).toLocaleString("es-CO")}
                          </span>
                        </div>
                        <p className={styles.historyDesc}>{item.descripcion}</p>
                        {item.comentario && (
                          <p className={styles.historyComment}>{item.comentario}</p>
                        )}
                        {item.visibleCiudadano && (
                          <span className={styles.visibleBadge}>Visible al ciudadano</span>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          <AppFooter />
        </FuncionarioShell>
      </main>
    </FuncionarioGuard>
  );
}