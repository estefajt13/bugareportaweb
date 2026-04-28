"use client";

import { useState, useEffect } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import { useAuth } from "@/features/auth/auth-context";
import { updateUserProfile } from "@/features/auth/auth-service";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import styles from "./page.module.css";

const DEFAULT_AVATAR = "/avatar_placeholder.svg";

export default function PerfilAdminPage() {
  const { user, profile, isLoading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Campos que se pueden editar
  const editableFields = [
    "telefono",
    "direccion",
    "departamento",
    "ciudad",
    "area",
    "cargo",
  ];

  // Campos que NUNCA se pueden editar (siempre readOnly)
  const nonEditableFields = ["nombre", "id", "correo"];

  const [form, setForm] = useState({
    nombre: "",
    id: "",
    correo: "",
    telefono: "",
    direccion: "",
    departamento: "",
    ciudad: "",
    area: "",
    cargo: "",
    rol: "",
    estado: "",
  });

  // Cargar datos del perfil cuando esté disponible
  useEffect(() => {
    if (profile) {
      setForm({
        nombre: profile?.nombre || "",
        id: profile?.id || "",
        correo: user?.email || "",
        telefono: profile?.telefono || "",
        direccion: profile?.direccion || "",
        departamento: profile?.departamento || "",
        ciudad: profile?.ciudad || "",
        area: profile?.area || "",
        cargo: profile?.cargo || "",
        rol: profile?.rol || "",
        estado: profile?.estado || "",
      });
    }
  }, [profile, user?.email]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleEditToggle() {
    if (isEditing) {
      // Cancelar edición - restaurar valores originales
      if (profile) {
        setForm({
          nombre: profile?.nombre || "",
          id: profile?.id || "",
          correo: user?.email || "",
          telefono: profile?.telefono || "",
          direccion: profile?.direccion || "",
          departamento: profile?.departamento || "",
          ciudad: profile?.ciudad || "",
          area: profile?.area || "",
          cargo: profile?.cargo || "",
          rol: profile?.rol || "",
          estado: profile?.estado || "",
        });
      }
      setIsEditing(false);
      setError("");
      setMessage("");
    } else {
      // Iniciar edición
      setIsEditing(true);
      setError("");
      setMessage("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user?.uid) {
      setError("No se encontro la sesion actual.");
      return;
    }

    setIsSaving(true);
    setError("");
    setMessage("");

    try {
      // Solo enviamos los campos editables
      const updateData = {};
      editableFields.forEach((field) => {
        updateData[field] = form[field]?.trim() || "";
      });

      await updateUserProfile(user.uid, updateData);
      setMessage("Datos actualizados correctamente.");
      setIsEditing(false);
    } catch {
      setError("No fue posible actualizar el perfil. Intenta de nuevo.");
    } finally {
      setIsSaving(false);
    }
  }

  // Función para determinar si un campo debe estar deshabilitado
  function isFieldDisabled(fieldName) {
    // Los campos no editables siempre están deshabilitados
    if (nonEditableFields.includes(fieldName)) {
      return true;
    }
    // Los campos editables solo están habilitados cuando isEditing es true
    return !isEditing;
  }

  if (isLoading) {
    return (
      <AdminGuard>
        <main className={styles.page}>
          <AdminShell activeSection="perfil" breadcrumb="Admin / Mi perfil">
            <section className={styles.card}>
              <p className={styles.loading}>Cargando perfil...</p>
            </section>
            <AppFooter />
          </AdminShell>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className={styles.page}>
        <AdminShell activeSection="perfil" breadcrumb="Admin / Mi perfil">
          <section className={styles.card}>
            <div className={styles.header}>
              <div className={styles.avatarSection}>
                <img
                  src={profile?.photoURL || DEFAULT_AVATAR}
                  alt="Foto de perfil"
                  className={styles.avatar}
                />
              </div>
              <div className={styles.headerInfo}>
                <h1 className={styles.title}>{form.nombre || "Administrador"}</h1>
                <p className={styles.subtitle}>
                  {form.rol ? `${form.rol} - ${form.area}` : "Gestiona tu información personal"}
                </p>
              </div>
            </div>

            <p className={styles.description}>
              {isEditing
                ? "Edita tu información. Los campos marcados como no editables no se pueden modificar."
                : "Visualiza tu información personal. Haz clic en 'Editar' para modificar los campos permitidos."}
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Sección: Información Básica (no editable) */}
              <div className={styles.sectionTitle}>Información Básica</div>
              <div className={styles.row2}>
                <label className={styles.field}>
                  Nombre
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className={`${styles.input} ${styles.inputReadOnly}`}
                    readOnly
                    disabled
                  />
                </label>
                <label className={styles.field}>
                  ID
                  <input
                    name="id"
                    value={form.id}
                    onChange={handleChange}
                    className={`${styles.input} ${styles.inputReadOnly}`}
                    readOnly
                    disabled
                  />
                </label>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Correo Electrónico
                  <input
                    type="email"
                    name="correo"
                    value={form.correo}
                    onChange={handleChange}
                    className={`${styles.input} ${styles.inputReadOnly}`}
                    readOnly
                    disabled
                  />
                </label>
                <label className={styles.field}>
                  Teléfono
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    className={`${styles.input} ${isFieldDisabled("telefono") ? styles.inputReadOnly : ""}`}
                    disabled={isFieldDisabled("telefono")}
                    placeholder="3001234567"
                  />
                </label>
              </div>

              {/* Sección: Ubicación */}
              <div className={styles.sectionTitle}>Ubicación</div>
              <label className={styles.field}>
                Dirección
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  className={`${styles.input} ${isFieldDisabled("direccion") ? styles.inputReadOnly : ""}`}
                  disabled={isFieldDisabled("direccion")}
                  placeholder="Calle 123 #45-67"
                />
              </label>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Departamento
                  <input
                    name="departamento"
                    value={form.departamento}
                    onChange={handleChange}
                    className={`${styles.input} ${isFieldDisabled("departamento") ? styles.inputReadOnly : ""}`}
                    disabled={isFieldDisabled("departamento")}
                  />
                </label>
                <label className={styles.field}>
                  Ciudad
                  <input
                    name="ciudad"
                    value={form.ciudad}
                    onChange={handleChange}
                    className={`${styles.input} ${isFieldDisabled("ciudad") ? styles.inputReadOnly : ""}`}
                    disabled={isFieldDisabled("ciudad")}
                  />
                </label>
              </div>

              {/* Sección: Información Laboral */}
              <div className={styles.sectionTitle}>Información Laboral</div>
              <div className={styles.row2}>
                <label className={styles.field}>
                  Área
                  <input
                    name="area"
                    value={form.area}
                    onChange={handleChange}
                    className={`${styles.input} ${isFieldDisabled("area") ? styles.inputReadOnly : ""}`}
                    disabled={isFieldDisabled("area")}
                  />
                </label>
                <label className={styles.field}>
                  Cargo
                  <input
                    name="cargo"
                    value={form.cargo}
                    onChange={handleChange}
                    className={`${styles.input} ${isFieldDisabled("cargo") ? styles.inputReadOnly : ""}`}
                    disabled={isFieldDisabled("cargo")}
                  />
                </label>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Rol
                  <input
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    className={`${styles.input} ${styles.inputReadOnly}`}
                    readOnly
                    disabled
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <input
                    name="estado"
                    value={form.estado}
                    onChange={handleChange}
                    className={`${styles.input} ${styles.inputReadOnly}`}
                    readOnly
                    disabled
                  />
                </label>
              </div>

              {error ? <p className={styles.error}>{error}</p> : null}
              {message ? <p className={styles.success}>{message}</p> : null}

              <div className={styles.buttonRow}>
                {!isEditing ? (
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={handleEditToggle}
                  >
                    Editar información
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={handleEditToggle}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={styles.submit}
                      disabled={isSaving}
                    >
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </>
                )}
              </div>
            </form>
          </section>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}