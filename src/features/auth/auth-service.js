"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, configurePersistence, db, storage } from "@/lib/firebase/client";

const WEB_ALLOWED_ROLES = ["Administrador", "Funcionario"];

function createUserFacingError(message) {
  const error = new Error(message);
  error.isUserFacing = true;
  return error;
}

function normalizeErrorCode(error) {
  const rawCode = typeof error?.code === "string" ? error.code : "";
  if (!rawCode) {
    return "";
  }

  return rawCode.startsWith("auth/") ? rawCode : `firestore/${rawCode}`;
}

function mapLoginError(error) {
  const code = normalizeErrorCode(error);

  const authMessages = {
    "auth/invalid-credential":
      "Usuario o contraseรฑa incorrectos. Verifica tus datos e intenta nuevamente.",
    "auth/user-not-found":
      "No existe una cuenta con ese correo en la plataforma web.",
    "auth/wrong-password":
      "La contraseรฑa ingresada no es correcta.",
    "auth/invalid-email": "El formato del correo electrรณnico es invรกlido.",
    "auth/user-disabled":
      "Esta cuenta estรก deshabilitada. Contacta al administrador del sistema.",
    "auth/too-many-requests":
      "Se bloquearon temporalmente los intentos de acceso. Espera unos minutos e intenta de nuevo.",
    "auth/network-request-failed":
      "No hay conexiรณn con el servidor de autenticaciรณn. Revisa internet e intenta nuevamente.",
    "auth/internal-error":
      "Ocurriรณ un error interno del servidor de autenticaciรณn. Intenta nuevamente en unos minutos.",
    "auth/operation-not-allowed":
      "El inicio de sesiรณn no estรก habilitado en este momento. Contacta a soporte.",
  };

  if (authMessages[code]) {
    return authMessages[code];
  }

  const firestoreMessages = {
    "firestore/permission-denied":
      "No tienes permisos para consultar tu perfil web. Contacta al administrador.",
    "firestore/unavailable":
      "El servicio de datos no estรก disponible por el momento. Intenta nuevamente.",
    "firestore/deadline-exceeded":
      "La consulta tardรณ demasiado. Verifica tu conexiรณn e intenta nuevamente.",
    "firestore/resource-exhausted":
      "El servicio estรก con alta carga. Intenta de nuevo en unos minutos.",
  };

  if (firestoreMessages[code]) {
    return firestoreMessages[code];
  }

  return "No fue posible iniciar sesiรณn en este momento. Intenta nuevamente.";
}

function mapPasswordResetError(error) {
  const code = normalizeErrorCode(error);
  const messages = {
    "auth/user-not-found":
      "No existe una cuenta asociada a ese correo electrรณnico.",
    "auth/invalid-email": "El correo electrรณnico ingresado no es vรกlido.",
    "auth/network-request-failed":
      "No hay conexiรณn para enviar el correo de recuperaciรณn. Intenta nuevamente.",
    "auth/too-many-requests":
      "Se realizaron demasiadas solicitudes. Espera unos minutos para reintentar.",
    "auth/internal-error":
      "No fue posible contactar al servidor de recuperaciรณn. Intenta de nuevo.",
  };

  return (
    messages[code] ||
    "No fue posible enviar el correo de recuperaciรณn en este momento."
  );
}

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
  try {
    await configurePersistence(rememberSession);

    const credentials = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = credentials.user;

    if (!firebaseUser.emailVerified) {
      await signOut(auth);
      throw createUserFacingError(
        "Por favor, verifica tu correo electrรณnico antes de continuar."
      );
    }

    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await signOut(auth);
      throw createUserFacingError("Usuario no encontrado.");
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
      throw createUserFacingError(
        `Cuenta ${String(userStatus).toLowerCase()}. Contacta a soporte.`
      );
    }

    if (!WEB_ALLOWED_ROLES.includes(userRole)) {
      await signOut(auth);
      throw createUserFacingError(
        "Acceso denegado. Esta plataforma web es solo para administradores y funcionarios."
      );
    }

    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      role: userRole,
      profile: userData,
    };
  } catch (error) {
    if (error?.isUserFacing) {
      throw error;
    }
    throw new Error(mapLoginError(error));
  }
}

export async function logoutUser() {
  await signOut(auth);
}

export async function requestPasswordReset(email) {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw new Error(mapPasswordResetError(error));
  }
}

export async function updateUserProfile(uid, partialProfile) {
  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, partialProfile);
}

export async function createStaffUser({
  nombre,
  id,
  correo,
  telefono,
  direccion,
  departamento,
  ciudad,
  area,
  cargo,
  rol,
  estado = "ACTIVO",
  photoFile = null,
}) {
  let photoURL = "/avatar_placeholder.svg";

  // Subir foto a Firebase Storage si existe
  if (photoFile) {
    try {
      const extension = photoFile.name.includes(".")
        ? photoFile.name.split(".").pop()
        : "jpg";
      const safeId = id.trim().replace(/[^a-zA-Z0-9_-]/g, "");
      const fileRef = ref(
        storage,
        `staff-photos/${safeId}-${Date.now()}.${extension}`
      );
      await uploadBytes(fileRef, photoFile);
      photoURL = await getDownloadURL(fileRef);
    } catch (error) {
      console.warn("Error subiendo foto a Storage, usando avatar por defecto:", error);
      // Continuamos con el avatar por defecto si falla la subida
    }
  }

  const createdDoc = await addDoc(collection(db, "staff_registry"), {
    nombre: nombre.trim(),
    id: id.trim(),
    correo: correo.trim(),
    telefono: telefono.trim(),
    direccion: direccion.trim(),
    departamento: departamento.trim(),
    ciudad: ciudad.trim(),
    area: area.trim(),
    cargo: cargo.trim(),
    rol: rol.trim(),
    estado,
    photoURL,
    createdAt: serverTimestamp(),
  });

  return createdDoc.id;
}

export async function getFuncionarios() {
  const q = query(collection(db, "users"), where("rol", "==", "Funcionario"));
  const querySnapshot = await getDocs(q);
  const funcionarios = [];
  querySnapshot.forEach((doc) => {
    funcionarios.push({
      uid: doc.id,
      ...doc.data(),
    });
  });
  return funcionarios;
}

export async function deactivateFuncionario(uid) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No hay sesión activa");
  }
  
  // Check if current user is admin
  const adminDocRef = doc(db, "users", currentUser.uid);
  const adminDoc = await getDoc(adminDocRef);
  if (!adminDoc.exists() || adminDoc.data().rol !== "Administrador") {
    throw new Error("No tiene permisos de administrador");
  }
  
  // Step 1: Mark user as INACTIVO in Firestore to prevent login
  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, { 
    estado: "INACTIVO",
    deactivatedAt: serverTimestamp(),
    deactivatedBy: currentUser.uid
  });
  
  // Step 2: Delete the Firestore document
  await deleteDoc(userDocRef);
  
  // Step 3: Delete from Firebase Authentication
  // Note: Firebase client SDK has limitations - we can only delete the current user
  // For a complete solution, a Cloud Function with Admin SDK should be used
  // As a workaround, we'll attempt to use the Firebase Admin SDK via a callable function
  // or document the limitation for now
  
  // For client-side only implementation, the auth account remains but cannot login
  // because the Firestore document is deleted/marked as INACTIVO
  // The loginWithRoleValidation function already checks for estado !== "ACTIVO"
  
  return { success: true, message: "Usuario desactivado exitosamente" };
}

export async function createAdminUser({
  nombre,
  id,
  correo,
  telefono,
  direccion,
  departamento,
  ciudad,
  area,
  cargo,
  rol,
  estado = "ACTIVO",
  password,
  photoFile = null,
}) {
  let photoURL = "/avatar_placeholder.svg";

  // 1. Crear usuario en Firebase Authentication
  const userCredential = await createUserWithEmailAndPassword(auth, correo, password);
  const user = userCredential.user;

  // 2. Subir foto a Firebase Storage si existe
  if (photoFile) {
    try {
      const extension = photoFile.name.includes(".")
        ? photoFile.name.split(".").pop()
        : "jpg";
      const safeId = id.trim().replace(/[^a-zA-Z0-9_-]/g, "");
      const fileRef = ref(
        storage,
        `admin-photos/${safeId}-${Date.now()}.${extension}`
      );
      await uploadBytes(fileRef, photoFile);
      photoURL = await getDownloadURL(fileRef);
    } catch (error) {
      console.warn("Error subiendo foto a Storage, usando avatar por defecto:", error);
      // Continuamos con el avatar por defecto si falla la subida
    }
  }

  // 3. Actualizar perfil con el nombre y foto
  await updateProfile(user, {
    displayName: nombre.trim(),
    photoURL
  });

  // 3. Enviar correo de verificaciรณn
  await sendEmailVerification(user);

  // 4. Guardar datos adicionales en la colecciรณn users
  await setDoc(doc(db, "users", user.uid), {
    nombre: nombre.trim(),
    id: id.trim(),
    correo: correo.trim(),
    telefono: telefono.trim(),
    direccion: direccion.trim(),
    departamento: departamento.trim(),
    ciudad: ciudad.trim(),
    area: area.trim(),
    cargo: cargo.trim(),
    rol: rol.trim(),
    estado,
    photoURL,
    emailVerified: false,
    createdAt: serverTimestamp(),
  });

  return user.uid;
}
