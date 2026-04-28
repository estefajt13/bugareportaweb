"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { logoutUser } from "@/features/auth/auth-service";
import styles from "./AdminHeader.module.css";

export default function AdminHeader({ activeSection = "dashboard" }) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const displayName = profile?.nombre || user?.email || "Administrador";
  const roleLabel = profile?.rol || "Administrador";
  const avatarSrc = user?.photoURL || "/logobugareportamas.png";

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logoutUser();
    router.replace("/login");
  }

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <div className={styles.logoWrap}>
          <Image
            src="/logobugareportamas.png"
            alt="Logo BugaReporta+"
            fill
            className={styles.logo}
          />
        </div>
        <div>
          <p className={styles.title}>BugaReporta+</p>
          <p className={styles.subtitle}>Panel administrativo</p>
        </div>
      </div>

      <nav className={styles.centerNav} aria-label="Navegacion de administrador">
        <Link
          href="/admin"
          className={`${styles.navItem} ${
            activeSection === "dashboard" ? styles.navItemActive : ""
          }`}
        >
          Dashboard
        </Link>
        <button type="button" className={styles.navItem} disabled>
          Reportes
        </button>
        <button type="button" className={styles.navItem} disabled>
          Mapa
        </button>
      </nav>

      <div className={styles.profileArea}>
        <button
          ref={triggerRef}
          type="button"
          className={styles.avatarButton}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <Image
            src={avatarSrc}
            alt="Foto de perfil"
            width={40}
            height={40}
            className={styles.avatar}
            unoptimized
          />
          <span className={styles.profileName}>{displayName}</span>
        </button>

        {isMenuOpen ? (
          <div ref={menuRef} className={styles.menu} role="menu">
            <p className={styles.menuRole}>{roleLabel}</p>
            <Link href="/admin/perfil" className={styles.menuLink} role="menuitem">
              Mi perfil
            </Link>
            <button
              type="button"
              className={styles.menuLogout}
              onClick={handleLogout}
              disabled={isLoggingOut}
              role="menuitem"
            >
              {isLoggingOut ? "Cerrando..." : "Cerrar sesion"}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
