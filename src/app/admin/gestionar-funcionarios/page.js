"use client";

import { useEffect, useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import { getFuncionarios, deactivateFuncionario } from "@/features/auth/auth-service";
import styles from "./page.module.css";

export default function GestionarFuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deactivating, setDeactivating] = useState(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);

  useEffect(() => {
    loadFuncionarios();
  }, []);

  async function loadFuncionarios() {
    try {
      setLoading(true);
      setError("");
      const data = await getFuncionarios();
      setFuncionarios(data);
    } catch (err) {
      setError("No fue posible cargar los funcionarios. Intente nuevamente.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate(uid, nombre) {
    setConfirmDeactivate({ uid, nombre });
  }

  async function confirmDeactivation() {
    if (!confirmDeactivate) return;
    
    try {
      setDeactivating(confirmDeactivate.uid);
      setError("");
      setSuccess("");
      
      await deactivateFuncionario(confirmDeactivate.uid);
      
      setSuccess(`El funcionario ${confirmDeactivate.nombre} ha sido desactivado exitosamente.`);
      setConfirmDeactivate(null);
      
      // Refresh the list
      await loadFuncionarios();
    } catch (err) {
      setError("No fue posible desactivar el funcionario. Intente nuevamente.");
      console.error(err);
    } finally {
      setDeactivating(null);
    }
  }

  function cancelDeactivation() {
    setConfirmDeactivate(null);
  }

  return (
    <AdminGuard>
      <main className={styles.page}>
        <AdminShell 
          activeSection="gestionar-funcionarios" 
          breadcrumb="Admin / Gestionar funcionarios"
        >
          <section className={styles.card}>
            <div className={styles.header}>
              <h1 className={styles.title}>Gestionar Funcionarios</h1>
              <p className={styles.subtitle}>
                Lista de funcionarios registrados. Puede desactivar funcionarios que ya no requieran acceso al sistema.
              </p>
            </div>

            {error && <div className={styles.errorAlert}>{error}</div>}
            {success && <div className={styles.successAlert}>{success}</div>}

            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando funcionarios...</p>
              </div>
            ) : funcionarios.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No hay funcionarios registrados en el sistema.</p>
              </div>
            ) : (
              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Correo</th>
                      <th>Cargo</th>
                      <th>Área</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funcionarios.map((funcionario) => (
                      <tr key={funcionario.uid}>
                        <td>
                          <div className={styles.nameCell}>
                            {funcionario.photoURL && funcionario.photoURL !== "/avatar_placeholder.svg" ? (
                              <img 
                                src={funcionario.photoURL} 
                                alt={funcionario.nombre} 
                                className={styles.avatar}
                              />
                            ) : (
                              <div className={styles.avatarPlaceholder}>
                                {funcionario.nombre.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <span className={styles.name}>{funcionario.nombre}</span>
                              <span className={styles.id}>{funcionario.id}</span>
                            </div>
                          </div>
                        </td>
                        <td>{funcionario.correo}</td>
                        <td>{funcionario.cargo || "—"}</td>
                        <td>{funcionario.area || "—"}</td>
                        <td>
                          <span className={`${styles.badge} ${styles.badgeActivo}`}>
                            {funcionario.estado || "ACTIVO"}
                          </span>
                        </td>
                        <td>
                          <button
                            className={styles.deactivateBtn}
                            onClick={() => handleDeactivate(funcionario.uid, funcionario.nombre)}
                            disabled={deactivating === funcionario.uid}
                          >
                            {deactivating === funcionario.uid ? "Desactivando..." : "Desactivar"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Confirmation Modal */}
          {confirmDeactivate && (
            <div className={styles.modalOverlay} onClick={cancelDeactivation}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}>Confirmar desactivación</h2>
                <p className={styles.modalText}>
                  ¿Está seguro que desea desactivar al funcionario <strong>{confirmDeactivate.nombre}</strong>?
                </p>
                <p className={styles.modalWarning}>
                  Esta acción eliminará al usuario de la base de datos y no podrá acceder al sistema. 
                  Esta acción no se puede deshacer.
                </p>
                <div className={styles.modalActions}>
                  <button 
                    className={styles.cancelBtn} 
                    onClick={cancelDeactivation}
                    disabled={deactivating !== null}
                  >
                    Cancelar
                  </button>
                  <button 
                    className={styles.confirmBtn} 
                    onClick={confirmDeactivation}
                    disabled={deactivating !== null}
                  >
                    {deactivating === confirmDeactivate.uid ? "Desactivando..." : "Sí, desactivar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}