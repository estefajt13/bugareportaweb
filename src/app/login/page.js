"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import {
  getRouteByRole,
  loginWithRoleValidation,
  requestPasswordReset,
} from "@/features/auth/auth-service";
import styles from "./page.module.css";

const initialForm = {
  email: "",
  password: "",
  rememberSession: true,
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, profile } = useAuth();
  const [formData, setFormData] = useState(initialForm);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = profile?.rol;

    if (!isLoading && isAuthenticated && role && role !== "Ciudadano") {
      router.replace(getRouteByRole(role));
    }
  }, [isAuthenticated, isLoading, profile, router]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const email = formData.email.trim();
    const password = formData.password;

    if (!email) {
      setErrorMessage("Por favor ingresa tu correo electrónico.");
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage("Correo electrónico inválido.");
      return;
    }

    if (!password) {
      setErrorMessage("Por favor ingresa tu contraseña.");
      return;
    }

    setIsSubmitting(true);

    try {
      const authResult = await loginWithRoleValidation({
        email,
        password,
        rememberSession: formData.rememberSession,
      });

      router.replace(getRouteByRole(authResult.role));
    } catch (error) {
      setErrorMessage(error.message || "Error al iniciar sesión.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    setErrorMessage("");
    setSuccessMessage("");

    const email = formData.email.trim();

    if (!email) {
      setErrorMessage(
        "Escribe tu correo y luego usa la opción para recuperar la contraseña."
      );
      return;
    }

    if (!isValidEmail(email)) {
      setErrorMessage("Ingresa un correo válido para recuperar la contraseña.");
      return;
    }

    try {
      await requestPasswordReset(email);
      setSuccessMessage(
        "Te enviamos un correo para restablecer tu contraseña."
      );
    } catch (error) {
      setErrorMessage(
        error.message || "No fue posible enviar el correo de recuperación."
      );
    }
  }

  return (
    <main className={styles.page}>
      <Image
        src="/fondologin.jpeg"
        alt="Vista panorámica de Buga"
        fill
        priority
        className={styles.background}
      />
      <div className={styles.overlay} />

      <section className={styles.content}>
        <div className={styles.brand}>
          <Image
            src="/logobugareportamas.png"
            alt="Logo BugaReporta+"
            width={220}
            height={130}
            priority
            className={styles.logo}
          />
          <p className={styles.tagline}>Reporta. Mejora. Transforma.</p>
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Iniciar sesión</h1>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Correo
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="usuario@correo.com"
                className={styles.input}
                value={formData.email}
                onChange={updateField}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password" className={styles.label}>
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                className={styles.input}
                value={formData.password}
                onChange={updateField}
                disabled={isSubmitting}
              />
            </div>

            <div className={styles.options}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="rememberSession"
                  className={styles.checkbox}
                  checked={formData.rememberSession}
                  onChange={updateField}
                  disabled={isSubmitting}
                />
                Recordar sesión
              </label>

              <button
                type="button"
                className={styles.linkButton}
                onClick={handlePasswordReset}
                disabled={isSubmitting}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            {errorMessage ? (
              <p className={styles.error}>{errorMessage}</p>
            ) : null}

            {successMessage ? (
              <p className={styles.success}>{successMessage}</p>
            ) : null}

            <button
              type="submit"
              className={styles.submit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Ingresando..." : "Entrar"}
            </button>
          </form>

          <div className={styles.divider} />

          <p className={styles.note}>
            Las cuentas se crean desde el sistema interno.{" "}
            <span className={styles.noteStrong}>
              Ciudadano no puede ingresar en esta web.
            </span>
          </p>

          <p className={styles.helper}>
            Acceso exclusivo para administradores y funcionarios.
          </p>
        </div>
      </section>
    </main>
  );
}
