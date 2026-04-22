"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import { logoutUser } from "@/features/auth/auth-service";
import styles from "./page.module.css";

export default function AdminPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logoutUser();
    router.replace("/login");
  }

  const displayName = profile?.nombre || user?.email || "usuario";

  return (
    <AdminGuard>
      <main className={styles.page}>
        <section className={styles.card}>
          <h1 className={styles.title}>Hola {displayName}</h1>
          <button
            type="button"
            className={styles.button}
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
          </button>
        </section>
      </main>
    </AdminGuard>
  );
}
