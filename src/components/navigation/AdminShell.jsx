"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { logoutUser } from "@/features/auth/auth-service";
import styles from "./AdminShell.module.css";

const NAV_ITEMS = [
  {
    section: "Principal",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin", icon: "ti-layout-dashboard" },
      { id: "perfil", label: "Mi perfil", href: "/admin/perfil", icon: "ti-user-circle" },
    ],
  },
  {
    section: "Gestión",
    items: [
      { id: "crear-usuario", label: "Crear usuario", href: "/admin/crear-usuario", icon: "ti-user-plus" },
      { id: "gestionar-funcionarios", label: "Funcionarios", href: "/admin/gestionar-funcionarios", icon: "ti-users" },
      { id: "reportes", label: "Reportes", href: "/admin/reportes", icon: "ti-clipboard-list" },
    ],
  },
  {
    section: "Próximamente",
    items: [
      { id: "mapa", label: "Mapa", href: "/admin/mapa", icon: "ti-map", disabled: false },
      { id: "config", label: "Configuración", href: "", icon: "ti-settings", disabled: true },
    ],
  },
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
      window.location.href = "/login";
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.10.0/dist/tabler-icons.min.css"
      />
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
              <p className={styles.brandSubtitle}>Panel administrador</p>
            </div>
          </div>

          <nav className={styles.sidebarNav} aria-label="Menu administrativo">
            {NAV_ITEMS.map((group) => (
              <div key={group.section} className={styles.navGroup}>
                <p className={styles.navSection}>{group.section}</p>
                {group.items.map((item) => {
                  const isActive = item.id === activeSection;
                  if (item.disabled) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={styles.navItem}
                        disabled
                      >
                        <i className={`ti ${item.icon}`} aria-hidden="true" />
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
                      <i className={`ti ${item.icon}`} aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className={styles.sidebarBottom}>
            <div className={styles.helpCard}>
              <p className={styles.helpTitle}>¿Necesitas ayuda?</p>
              <p className={styles.helpText}>Consulta nuestro centro de guías.</p>
              <button type="button" className={styles.helpButton} disabled>
                Ver guía
              </button>
            </div>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar}>
            {isMobile ? (
              <button
                type="button"
                className={styles.menuToggle}
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Abrir menu"
              >
                <i className="ti ti-menu-2" aria-hidden="true" />
              </button>
            ) : null}

            <div className={styles.topbarLeft}>
              <i className="ti ti-home" style={{ fontSize: "16px", opacity: 0.75 }} aria-hidden="true" />
              <p className={styles.breadcrumb}>{breadcrumb}</p>
            </div>

            <div className={styles.topbarRight}>
              <button type="button" className={styles.topbarIconBtn} aria-label="Notificaciones">
                <i className="ti ti-bell" aria-hidden="true" />
                <span className={styles.notifDot} aria-hidden="true" />
              </button>

              <div className={styles.profileArea}>
                <button
                  ref={triggerRef}
                  type="button"
                  className={styles.avatarButton}
                  onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                  aria-expanded={isProfileMenuOpen}
                  aria-haspopup="menu"
                >
                  <div className={styles.avatarCircle}>
                    <Image
                      src={avatarSrc}
                      alt="Foto de perfil"
                      width={26}
                      height={26}
                      className={styles.avatar}
                      unoptimized
                    />
                  </div>
                  <span className={styles.profileName}>{displayName}</span>
                  <i className="ti ti-chevron-down" style={{ fontSize: "13px", opacity: 0.8 }} aria-hidden="true" />
                </button>

                {isProfileMenuOpen ? (
                  <div ref={menuRef} className={styles.menu} role="menu">
                    <p className={styles.menuRole}>{roleLabel}</p>
                    <Link
                      href="/admin/perfil"
                      className={styles.menuLink}
                      role="menuitem"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <i className="ti ti-user-circle" aria-hidden="true" /> Mi perfil
                    </Link>
                    <button
                      type="button"
                      className={styles.menuLogout}
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      role="menuitem"
                    >
                      <i className="ti ti-logout" aria-hidden="true" />
                      {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </>
  );
}