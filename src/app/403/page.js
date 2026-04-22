"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { getRouteByRole, logoutUser } from "@/features/auth/auth-service";
import styles from "./page.module.css";

export default function ForbiddenPage() {
  const router = useRouter();
  const { profile, isAuthenticated } = useAuth();

  async function goToHomeByRole() {
    const targetRoute = isAuthenticated ? getRouteByRole(profile?.rol) : "/login";
    router.replace(targetRoute);
  }

  async function handleLogout() {
    await logoutUser();
    router.replace("/login");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.code}>403</p>
        <h1 className={styles.title}>Acceso denegado</h1>
        <p className={styles.message}>
          Tu cuenta está autenticada, pero no tiene permisos para ver esta
          sección.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={goToHomeByRole}
          >
            Ir a mi inicio
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
