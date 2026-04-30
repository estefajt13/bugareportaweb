"use client";

import { useEffect, useState } from "react";
import { FuncionarioGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import FuncionarioShell from "@/components/navigation/FuncionarioShell";
import AppFooter from "@/components/layout/AppFooter";
import styles from "./page.module.css";

export default function FuncionarioPerfilPage() {
  const { user, profile, isLoading } = useAuth();
  const [metricasPersonales, setMetricasPersonales] = useState(null);

  // Si no hay perfil o usuario, mostrar loading
  if (isLoading) {
    return (
      <FuncionarioGuard>
        <main className={styles.page}>
          <FuncionarioShell
            activeSection="perfil"
            breadcrumb="Funcionario / Mi Perfil"
          >
            <p className={styles.loading}>Cargando perfil...</p>
          </FuncionarioShell>
        </main>
      </FuncionarioGuard>
    );
  }

  if (!user || !profile) {
    return (
      <FuncionarioGuard>
        <main className={styles.page}>
          <FuncionarioShell
            activeSection="perfil"
            breadcrumb="Funcionario / Mi Perfil"
          >
            <p className={styles.error}>No se pudo cargar el perfil.</p>
          </FuncionarioShell>
        </main>
      </FuncionarioGuard>
    );
  }

  const displayName = profile?.nombre || user?.email || "Usuario";
  const areaBruta = profile?.area || "No asignada";
  const cargo = profile?.cargo || "No especificado";

  return (
    <FuncionarioGuard>
      <main className={styles.page}>
        <FuncionarioShell
          activeSection="perfil"
          breadcrumb="Funcionario / Mi Perfil"
        >
          <section className={styles.header}>
            <div className={styles.avatarSection}>
              <div className={styles.avatar}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Foto de perfil" />
                ) : (
                  <span>{displayName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className={styles.avatarInfo}>
                <h1 className={styles.name}>{displayName}</h1>
                <p className={styles.email}>{user?.email}</p>
                <p className={styles.role}>{profile?.rol || "Funcionario"}</p>
              </div>
            </div>
          </section>

          <div className={styles.content}>
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Información Personal</h2>
              <dl className={styles.infoList}>
                <div className={styles.infoItem}>
                  <dt>Nombre completo</dt>
                  <dd>{profile?.nombre || "—"}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Correo electrónico</dt>
                  <dd>{profile?.correo || user?.email || "—"}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Teléfono</dt>
                  <dd>{profile?.telefono || "—"}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Dirección</dt>
                  <dd>{profile?.direccion || "—"}</dd>
                </div>
              </dl>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Información Laboral</h2>
              <dl className={styles.infoList}>
                <div className={styles.infoItem}>
                  <dt>Área asignada</dt>
                  <dd className={styles.areaBadge}>{areaBruta}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Cargo</dt>
                  <dd>{cargo}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Departamento</dt>
                  <dd>{profile?.departamento || "—"}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Ciudad</dt>
                  <dd>{profile?.ciudad || "—"}</dd>
                </div>
                <div className={styles.infoItem}>
                  <dt>Estado</dt>
                  <dd>
                    <span className={`${styles.statusBadge} ${profile?.estado === "ACTIVO" ? styles.active : ""}`}>
                      {profile?.estado || "—"}
                    </span>
                  </dd>
                </div>
              </dl>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Actividad Reciente</h2>
              <p className={styles.comingSoon}>
                🚧 Esta sección estará disponible próximamente. Aquí podrás ver tus reportes asignados y tu historial de gestión.
              </p>
            </section>
          </div>

          <AppFooter />
        </FuncionarioShell>
      </main>
    </FuncionarioGuard>
  );
}