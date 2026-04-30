"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FuncionarioGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import FuncionarioShell from "@/components/navigation/FuncionarioShell";
import AppFooter from "@/components/layout/AppFooter";
import { db } from "@/lib/firebase/client";
import {
  doc, getDoc, updateDoc, addDoc,
  collection, serverTimestamp, query,
  where, getDocs,
} from "firebase/firestore";
import styles from "./page.module.css";

const ESTADOS_POSIBLES = [
  { value: "pendiente",   label: "Pendiente" },
  { value: "en_revision", label: "En revisión" },
  { value: "en_proceso",  label: "En proceso" },
  { value: "resuelto",    label: "Resuelto" },
  { value: "rechazado",   label: "Rechazado" },
];

const ESTADO_COLORS = {
  pendiente:   { bg: "#FFF3E0", text: "#E65100" },
  en_revision: { bg: "#FFF8E1", text: "#F9A825" },
  en_proceso:  { bg: "#E3F2FD", text: "#1565C0" },
  resuelto:    { bg: "#E8F5E9", text: "#2E7D32" },
  rechazado:   { bg: "#FFEBEE", text: "#C62828" },
};

export default function DetalleReportePage() {
  const { id } = useParams();
  const router  = useRouter();
  const { user, profile } = useAuth();

  const [reporte, setReporte]         = useState(null);
  const [urlFoto, setUrlFoto]         = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [mensaje, setMensaje]         = useState("");
  const [isLoading, setIsLoading]     = useState(true);
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState("");
  const [successMsg, setSuccessMsg]   = useState("");

  useEffect(() => {
    async function cargar() {
      setIsLoading(true);
      try {
        // Cargar reporte
        const snap = await getDoc(doc(db, "reportes", id));
        if (!snap.exists()) { router.replace("/funcionario/reportes"); return; }
        const data = { id: snap.id, ...snap.data() };
        setReporte(data);
        setNuevoEstado(data.estado);

        // Buscar foto
        const fotoSnap = await getDocs(
          query(collection(db, "fotos"), where("id_reporte", "==", id))
        );
        if (!fotoSnap.empty) {
          setUrlFoto(fotoSnap.docs[0].data().url);
        }
      } catch {
        setError("No se pudo cargar el reporte.");
      } finally {
        setIsLoading(false);
      }
    }
    if (id) cargar();
  }, [id, router]);

  async function handleGuardar() {
    if (!reporte) return;
    setIsSaving(true);
    setError("");
    setSuccessMsg("");

    try {
      const ref = doc(db, "reportes", id);

      // Actualizar estado en el reporte
      await updateDoc(ref, {
        estado: nuevoEstado,
        uid_funcionario: user?.uid || null,
      });

      // Guardar en historial_estados
      await addDoc(collection(db, "historial_estados"), {
        id_reporte:     id,
        estado_anterior: reporte.estado,
        estado_nuevo:    nuevoEstado,
        mensaje:         mensaje.trim() || null,
        uid_usuario:     user?.uid || null,
        fecha_cambio:    serverTimestamp(),
      });

      setReporte((prev) => ({ ...prev, estado: nuevoEstado }));
      setMensaje("");
      setSuccessMsg("Estado actualizado correctamente.");
    } catch {
      setError("No se pudo actualizar el estado.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <FuncionarioGuard>
        <main className={styles.page}>
          <FuncionarioShell breadcrumb="Funcionario / Reportes / Detalle">
            <p className={styles.loading}>Cargando reporte...</p>
          </FuncionarioShell>
        </main>
      </FuncionarioGuard>
    );
  }

  if (!reporte) return null;

  const colores = ESTADO_COLORS[reporte.estado] || { bg: "#F0F0F0", text: "#555" };

  return (
    <FuncionarioGuard>
      <main className={styles.page}>
        <FuncionarioShell
          activeSection="reportes"
          breadcrumb="Funcionario / Reportes / Detalle"
        >
          {/* Navegación de regreso */}
          <Link href="/funcionario/reportes" className={styles.backLink}>
            ← Volver a reportes
          </Link>

          {/* Estado actual */}
          <div className={styles.estadoActual}>
            <span className={styles.estadoLabel}>Estado actual:</span>
            <span
              className={styles.estadoBadge}
              style={{ background: colores.bg, color: colores.text }}
            >
              {ESTADOS_POSIBLES.find((e) => e.value === reporte.estado)?.label || reporte.estado}
            </span>
          </div>

          {/* Info del reporte */}
          <section className={styles.card}>
            <h1 className={styles.asunto}>{reporte.asunto || "Sin asunto"}</h1>

            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Área</span>
                <span className={styles.metaVal}>{reporte.id_area || "—"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Dirección</span>
                <span className={styles.metaVal}>{reporte.direccion || "No especificada"}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Fecha</span>
                <span className={styles.metaVal}>
                  {reporte.fecha_reporte?.toDate
                    ? new Date(reporte.fecha_reporte.toDate()).toLocaleString("es-CO")
                    : "—"}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaKey}>Coordenadas</span>
                <span className={styles.metaVal}>
                  {reporte.latitud && reporte.longitud
                    ? `${reporte.latitud.toFixed(5)}, ${reporte.longitud.toFixed(5)}`
                    : "—"}
                </span>
              </div>
            </div>

            <div className={styles.descSection}>
              <p className={styles.metaKey}>Descripción</p>
              <p className={styles.descripcion}>{reporte.descripcion || "Sin descripción."}</p>
            </div>

            {/* Foto si existe */}
            {urlFoto ? (
              <div className={styles.fotoSection}>
                <p className={styles.metaKey}>Foto adjunta</p>
                <img
                  src={urlFoto}
                  alt="Foto del reporte"
                  className={styles.foto}
                />
              </div>
            ) : null}
          </section>

          {/* Cambiar estado */}
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Actualizar estado</h2>

            <label className={styles.field}>
              Nuevo estado
              <select
                className={styles.select}
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
              >
                {ESTADOS_POSIBLES.map((e) => (
                  <option key={e.value} value={e.value}>
                    {e.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.field}>
              Mensaje o comentario (opcional)
              <textarea
                className={styles.textarea}
                placeholder="Describe la acción tomada o añade un comentario..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={3}
              />
            </label>

            {error     ? <p className={styles.error}>{error}</p>       : null}
            {successMsg ? <p className={styles.success}>{successMsg}</p> : null}

            <button
              type="button"
              className={styles.btnGuardar}
              onClick={handleGuardar}
              disabled={isSaving || nuevoEstado === reporte.estado}
            >
              {isSaving ? "Guardando..." : "Guardar cambios"}
            </button>

            {nuevoEstado === reporte.estado ? (
              <p className={styles.hint}>
                Selecciona un estado diferente al actual para guardar.
              </p>
            ) : null}
          </section>

          <AppFooter />
        </FuncionarioShell>
      </main>
    </FuncionarioGuard>
  );
}