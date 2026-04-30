"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { logoutUser } from "@/features/auth/auth-service";
import styles from "./AdminShell.module.css";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/admin", icon: "▦" },
  { id: "perfil", label: "Mi perfil", href: "/admin/perfil", icon: "◍" },
  { id: "crear-usuario", label: "Crear usuario", href: "/admin/crear-usuario", icon: "+" },
  { id: "gestionar-funcionarios", label: "Gestionar funcionarios", href: "/admin/gestionar-funcionarios", icon: "◉" },
  { id: "reportes", label: "Reportes", href: "", icon: "◷", disabled: true },
  { id: "mapa", label: "Mapa", href: "", icon: "⌖", disabled: true },
  { id: "config", label: "Configuracion", href: "", icon: "⚙", disabled: true },
];

export default function AdminShell({
  activeSection = "dashboard",
  breadcrumb = "Admin / Dashboard",
  children,
}) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const displayName = profile?.nombre || user?.email || "Administrador";
  const roleLabel = profile?.rol || "Administrador";
  const avatarSrc = user?.photoURL || "/avatar_placeholder.svg";

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 1060);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
  setIsLoggingOut(true);

  try {
    await logoutUser();

    // fuerza actualización completa
    window.location.href = "/login";

  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  } finally {
    setIsLoggingOut(false);
  }
}

  return (
    <div className={styles.shell}>
      {isMobile && isSidebarOpen ? (
        <button
          type="button"
          className={styles.overlay}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Cerrar menu lateral"
        />
      ) : null}

      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
        <button
          type="button"
          className={styles.sidebarClose}
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Cerrar menu"
        >
          ×
        </button>

        <div className={styles.sidebarBrand}>
          <div className={styles.logoWrap}>
            <Image
              src="/logobugareportamas.png"
              alt="Logo BugaReporta+"
              fill
              className={styles.logo}
              sizes="48px"
            />
          </div>
          <div>
            <p className={styles.brandTitle}>BugaReporta+</p>
            <p className={styles.brandSubtitle}>Panel admin</p>
          </div>
        </div>

        <nav className={styles.sidebarNav} aria-label="Menu administrativo">
          {NAV_ITEMS.map((item) => {
            const isActive = item.id === activeSection;
            if (item.disabled) {
              return (
                <button key={item.id} type="button" className={styles.navItem} disabled>
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ""}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <div className={styles.helpCard}>
            <p className={styles.helpTitle}>Necesitas ayuda?</p>
            <p className={styles.helpText}>Consulta nuestro centro de guias.</p>
            <button type="button" className={styles.helpButton} disabled>
              Ver guia
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <p className={styles.breadcrumb}>{breadcrumb}</p>
          </div>

          <div className={styles.profileArea}>
            <button
              ref={triggerRef}
              type="button"
              className={styles.avatarButton}
              onClick={() => setIsProfileMenuOpen((prev) => !prev)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
            >
              <Image
                src={avatarSrc}
                alt="Foto de perfil"
                width={38}
                height={38}
                className={styles.avatar}
                unoptimized
              />
              <span className={styles.profileName}>{displayName}</span>
            </button>

            {isProfileMenuOpen ? (
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

        <div className={styles.content}>{children}</div>
      </div>
    </div>
  );
}
