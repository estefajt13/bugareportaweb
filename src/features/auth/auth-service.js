"use client";

import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, configurePersistence, db } from "@/lib/firebase/client";

const WEB_ALLOWED_ROLES = ["Administrador", "Funcionario"];

function normalizeRole(role) {
  return typeof role === "string" ? role.trim() : "";
}

export function getRouteByRole(role) {
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "Administrador") {
    return "/admin";
  }

  if (normalizedRole === "Funcionario") {
    return "/funcionario";
  }

  return "/login";
}

export async function loginWithRoleValidation({
  email,
  password,
  rememberSession,
}) {
  await configurePersistence(rememberSession);

  const credentials = await signInWithEmailAndPassword(auth, email, password);
  const firebaseUser = credentials.user;

  if (!firebaseUser.emailVerified) {
    await signOut(auth);
    throw new Error(
      "Por favor, verifica tu correo electrónico antes de continuar."
    );
  }

  const userDocRef = doc(db, "users", firebaseUser.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    await signOut(auth);
    throw new Error("Usuario no encontrado.");
  }

  const userData = userDoc.data();
  let userStatus = userData.estado;
  const userRole = normalizeRole(userData.rol);

  if (userStatus === "PENDIENTE") {
    await updateDoc(userDocRef, { estado: "ACTIVO" });
    userStatus = "ACTIVO";
  }

  if (userStatus !== "ACTIVO") {
    await signOut(auth);
    throw new Error(`Cuenta ${String(userStatus).toLowerCase()}. Contacta a soporte.`);
  }

  if (!WEB_ALLOWED_ROLES.includes(userRole)) {
    await signOut(auth);
    throw new Error(
      "Acceso denegado. Esta plataforma web es solo para administradores y funcionarios."
    );
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    role: userRole,
    profile: userData,
  };
}

export async function logoutUser() {
  await signOut(auth);
}

export async function requestPasswordReset(email) {
  await sendPasswordResetEmail(auth, email);
}
