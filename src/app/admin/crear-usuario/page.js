"use client";

import { useState } from "react";
import { AdminGuard } from "@/features/auth/auth-guard";
import AdminShell from "@/components/navigation/AdminShell";
import AppFooter from "@/components/layout/AppFooter";
import { createAdminUser } from "@/features/auth/auth-service";
import styles from "./page.module.css";

const initialForm = {
  nombre: "",
  id: "",
  correo: "",
  telefono: "",
  direccion: "",
  departamento: "Valle",
  ciudad: "Buga",
  area: "Infraestructura",
  cargo: "",
  rol: "Administrador",
  estado: "ACTIVO",
};
const DEFAULT_AVATAR = "/avatar_placeholder.svg";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function CrearUsuarioPage() {
  const [form, setForm] = useState(initialForm);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handlePhotoChange(event) {
    const file = event.target.files[0];
    if (file) {
      // Validar tamaño (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError("La foto no puede superar los 5MB.");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function removePhoto() {
    setPhotoPreview(null);
    setPhotoFile(null);
    // Reset input file
    const fileInput = document.getElementById('photo-input');
    if (fileInput) fileInput.value = '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!isValidEmail(form.correo.trim())) {
      setError("Ingresa un correo válido.");
      return;
    }

    if (!form.id.trim()) {
      setError("El campo ID es obligatorio.");
      return;
    }

    if (!password || password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSaving(true);

    try {
      // Crear usuario (esto cerrará la sesión actual)
      const userId = await createAdminUser({
        ...form,
        password,
        photoFile,
      });

      setSuccess(`Usuario creado exitosamente. ID: ${userId}. Serás redirigido al login.`);
      
      // Limpiar formulario
      setForm(initialForm);
      setPassword("");
      setConfirmPassword("");
      setPhotoPreview(null);
      setPhotoFile(null);

      // Redirigir al login después de 3 segundos (el admin debe volver a iniciar sesión)
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);

    } catch (err) {
      setError("No fue posible crear el usuario en este momento. Verifica que el correo no esté en uso.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AdminGuard>
      <main className={styles.page}>
        <AdminShell activeSection="crear-usuario" breadcrumb="Admin / Crear usuario">
          <section className={styles.card}>
            <h1 className={styles.title}>Crear Administrador o Funcionario</h1>
            <p className={styles.subtitle}>
              Registra un nuevo usuario para el sistema. Completa todos los campos obligatorios.
            </p>

            <form className={styles.form} onSubmit={handleSubmit}>
              {/* Sección de foto de perfil */}
              <div className={styles.photoSection}>
                <div className={styles.photoPreview}>
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Vista previa" className={styles.previewImage} />
                      <button
                        type="button"
                        className={styles.removePhotoBtn}
                        onClick={removePhoto}
                        aria-label="Eliminar foto"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className={styles.placeholderAvatar}>
                      <img src="/avatar_placeholder.svg" alt="Avatar por defecto" className={styles.placeholderImage} />
                    </div>
                  )}
                </div>
                <label className={styles.photoLabel}>
                  <input
                    id="photo-input"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className={styles.photoInput}
                  />
                  <span className={styles.photoButton}>
                    {photoPreview ? 'Cambiar foto' : 'Subir foto'}
                  </span>
                </label>
                <p className={styles.photoHint}>Formatos: JPG, PNG. Máx 5MB.</p>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Nombre
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
                <label className={styles.field}>
                  ID
                  <input
                    name="id"
                    value={form.id}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
              </div>


              <div className={styles.row2}>
                <label className={styles.field}>
                  Correo
                  <input
                    type="email"
                    name="correo"
                    value={form.correo}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
                <label className={styles.field}>
                  Telefono
                  <input
                    name="telefono"
                    value={form.telefono}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
              </div>

              <label className={styles.field}>
                Direccion
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={updateField}
                  className={styles.input}
                  required
                />
              </label>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Departamento
                  <input
                    name="departamento"
                    value={form.departamento}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
                <label className={styles.field}>
                  Ciudad
                  <input
                    name="ciudad"
                    value={form.ciudad}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Area
                  <input
                    name="area"
                    value={form.area}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
                <label className={styles.field}>
                  Cargo
                  <input
                    name="cargo"
                    value={form.cargo}
                    onChange={updateField}
                    className={styles.input}
                    required
                  />
                </label>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Rol
                  <select
                    name="rol"
                    value={form.rol}
                    onChange={updateField}
                    className={styles.input}
                    required
                  >
                    <option value="Administrador">Administrador</option>
                    <option value="Funcionario">Funcionario</option>
                  </select>
                </label>
                <label className={styles.field}>
                  Estado
                  <select
                    name="estado"
                    value={form.estado}
                    onChange={updateField}
                    className={styles.input}
                    required
                  >
                    <option value="ACTIVO">ACTIVO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </label>
              </div>

              <div className={styles.row2}>
                <label className={styles.field}>
                  Contraseña
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    required
                    minLength={6}
                  />
                </label>
                <label className={styles.field}>
                  Confirmar Contraseña
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    required
                    minLength={6}
                  />
                </label>
              </div>

              {error ? <p className={styles.error}>{error}</p> : null}
              {success ? <p className={styles.success}>{success}</p> : null}

              <button type="submit" className={styles.submit} disabled={isSaving}>
                {isSaving ? "Guardando..." : "Crear usuario"}
              </button>
            </form>
          </section>

          <AppFooter />
        </AdminShell>
      </main>
    </AdminGuard>
  );
}