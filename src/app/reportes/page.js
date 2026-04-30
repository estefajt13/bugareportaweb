"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FuncionarioGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import FuncionarioShell from "@/components/navigation/FuncionarioShell";
import AppFooter from "@/components/layout/AppFooter";
import { db } from "@/lib/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import styles from "./page.module.css";

const ESTADOS = ["todos", "pendiente", "en_revision", "en_proceso", "resuelto", "rechazado"];

const ESTADO_LABELS = {
  todos:       "Todos",
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

function EstadoBadge({ estado }) {
  const c = ESTADO_COLORS[estado] || { bg: "#F0F0F0", text: "#555" };
  return (
    <span className={styles.badge} style={{ background: c.bg, color: c.text }}>
      {ESTADO_LABELS[estado] || estado}
    </span>
  );
}

export default function ReportesArea() {
  const { profile } = useAuth();
  const [todos, setTodos]         = useState([]);
  const [filtro, setFiltro]       = useState("todos");
  const [busqueda, setBusqueda]   = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState("");

  const areaNombre = profile?.area || "";

  useEffect(() => {
    if (!areaNombre) return;

    async function cargar() {
      setIsLoading(true);
      setError("");
      try {
        const q = query(
          collection(db, "reportes"),
          where("id_area", "==", areaNombre)
        );
        const snap = await getDocs(q);
        const lista = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const fa = a.fecha_reporte?.toDate?.() ?? new Date(0);
            const fb = b.fecha_reporte?.toDate?.() ?? new Date(0);
            return fb - fa;
          });
        setTodos(lista);
      } catch {
        setError("No se pudieron cargar los reportes.");
      } finally {
        setIsLoading(false);
      }
    }

    cargar();
  }, [areaNombre]);

  // Filtrar localmente por estado y búsqueda
  const visibles = todos.filter((r) => {
    const coincideEstado  = filtro === "todos" || r.estado === filtro;
    const terminoBusqueda = busqueda.toLowerCase();
    const coincideBusqueda =
      !terminoBusqueda ||
      r.asunto?.toLowerCase().includes(terminoBusqueda) ||
      r.descripcion?.toLowerCase().includes(terminoBusqueda) ||
      r.direccion?.toLowerCase().includes(terminoBusqueda);
    return coincideEstado && coincideBusqueda;
  });

  return (
    <FuncionarioGuard>
      <main className={styles.page}>
        <FuncionarioShell
          activeSection="reportes"
          breadcrumb="Funcionario / Reportes"
        >
          <section className={styles.header}>
            <div>
              <h1 className={styles.title}>Reportes del área</h1>
              <p className={styles.subtitle}>{areaNombre}</p>
            </div>
          </section>

          {/* Buscador */}
          <div className={styles.searchBar}>
            <input
              type="text"
              placeholder="Buscar por asunto, descripción o dirección..."
              className={styles.searchInput}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>

          {/* Filtros de estado */}
          <div className={styles.filtros}>
            {ESTADOS.map((e) => (
              <button
                key={e}
                type="button"
                className={`${styles.filtroBtn} ${filtro === e ? styles.filtroActivo : ""}`}
                onClick={() => setFiltro(e)}
              >
                {ESTADO_LABELS[e]}
              </button>
            ))}
          </div>

          {/* Lista */}
          {isLoading ? (
            <p className={styles.loading}>Cargando reportes...</p>
          ) : error ? (
            <p className={styles.error}>{error}</p>
          ) : visibles.length === 0 ? (
            <p className={styles.empty}>
              {busqueda || filtro !== "todos"
                ? "No hay reportes que coincidan con los filtros."
                : "No hay reportes en esta área todavía."}
            </p>
          ) : (
            <div className={styles.lista}>
              {visibles.map((r) => (
                <Link
                  key={r.id}
                  href={`/funcionario/reportes/${r.id}`}
                  className={styles.card}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.cardAsunto}>
                      {r.asunto || "Sin asunto"}
                    </span>
                    <EstadoBadge estado={r.estado} />
                  </div>
                  <p className={styles.cardDesc}>
                    {r.descripcion?.slice(0, 100)}
                    {r.descripcion?.length > 100 ? "..." : ""}
                  </p>
                  <p className={styles.cardMeta}>
                    📍 {r.direccion || "Sin dirección"} ·{" "}
                    {r.fecha_reporte?.toDate
                      ? new Date(r.fecha_reporte.toDate()).toLocaleDateString("es-CO", {
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

          <AppFooter />
        </FuncionarioShell>
      </main>
    </FuncionarioGuard>
  );
}