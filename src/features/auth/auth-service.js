"use client";

import {
  createUserWithEmailAndPassword,
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
      "Usuario o contraseña incorrectos. Verifica tus datos e intenta nuevamente.",
    "auth/user-not-found":
      "No existe una cuenta con ese correo en la plataforma web.",
    "auth/wrong-password":
      "La contraseña ingresada no es correcta.",
    "auth/invalid-email": "El formato del correo electrónico es inválido.",
    "auth/user-disabled":
      "Esta cuenta está deshabilitada. Contacta al administrador del sistema.",
    "auth/too-many-requests":
      "Se bloquearon temporalmente los intentos de acceso. Espera unos minutos e intenta de nuevo.",
    "auth/network-request-failed":
      "No hay conexión con el servidor de autenticación. Revisa internet e intenta nuevamente.",
    "auth/internal-error":
      "Ocurrió un error interno del servidor de autenticación. Intenta nuevamente en unos minutos.",
    "auth/operation-not-allowed":
      "El inicio de sesión no está habilitado en este momento. Contacta a soporte.",
  };

  if (authMessages[code]) {
    return authMessages[code];
  }

  const firestoreMessages = {
    "firestore/permission-denied":
      "No tienes permisos para consultar tu perfil web. Contacta al administrador.",
    "firestore/unavailable":
      "El servicio de datos no está disponible por el momento. Intenta nuevamente.",
    "firestore/deadline-exceeded":
      "La consulta tardó demasiado. Verifica tu conexión e intenta nuevamente.",
    "firestore/resource-exhausted":
      "El servicio está con alta carga. Intenta de nuevo en unos minutos.",
  };

  if (firestoreMessages[code]) {
    return firestoreMessages[code];
  }

  return "No fue posible iniciar sesión en este momento. Intenta nuevamente.";
}

function mapPasswordResetError(error) {
  const code = normalizeErrorCode(error);
  const messages = {
    "auth/user-not-found":
      "No existe una cuenta asociada a ese correo electrónico.",
    "auth/invalid-email": "El correo electrónico ingresado no es válido.",
    "auth/network-request-failed":
      "No hay conexión para enviar el correo de recuperación. Intenta nuevamente.",
    "auth/too-many-requests":
      "Se realizaron demasiadas solicitudes. Espera unos minutos para reintentar.",
    "auth/internal-error":
      "No fue posible contactar al servidor de recuperación. Intenta de nuevo.",
  };

  return (
    messages[code] ||
    "No fue posible enviar el correo de recuperación en este momento."
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

    await firebaseUser.reload(); 


    const userDocRef = doc(db, "users", firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await signOut(auth);
      throw createUserFacingError("Usuario no encontrado.");
    }

    const userData = userDoc.data();
    let userStatus = userData.estado;
    const userRole = normalizeRole(userData.rol);

    if (userData.emailVerified === false) {
      await signOut(auth);
      throw createUserFacingError(
        "Tu cuenta aún no ha sido verificada. Revisa tu correo."
      );
    } 

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

  // Eliminar de Firestore (marcar como inactivo primero)
  const userDocRef = doc(db, "users", uid);
  await updateDoc(userDocRef, { 
    estado: "INACTIVO",
    deactivatedAt: serverTimestamp(),
    deactivatedBy: currentUser.uid
  });
  await deleteDoc(userDocRef);

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
  // 0. Guardar credenciales del administrador actual
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("No hay sesión de administrador activa");
  }
  
  // Obtenemos el token del administrador actual
  const adminToken = await currentUser.getIdToken();
  
  let photoURL = "/avatar_placeholder.svg";
  let newUserUid = null;

  try {
    // 1. Crear usuario en Firebase Authentication usando REST API para no afectar la sesión
    const firebaseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: correo.trim(),
          password: password,
          returnSecureToken: true
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error creando usuario');
    }

    const newUser = await response.json();
    newUserUid = newUser.localId;

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
      } catch (storageError) {
        console.warn("Error subiendo foto a Storage, usando avatar por defecto:", storageError);
      }
    }

    // 3. Actualizar perfil del nuevo usuario (usando REST API)
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idToken: newUser.idToken,
          displayName: nombre.trim(),
          photoUrl: photoURL,
          returnSecureToken: true
        })
      }
    );

    // 4. Enviar correo de verificación (usando REST API)
    await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken: newUser.idToken
        })
      }
    );

    // 5. Guardar datos adicionales en la colección users
    await setDoc(doc(db, "users", newUserUid), {
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

  } finally {
    // 6. Restaurar sesión del administrador (siempre, incluso si hay error)
    // No hacemos nada porque nunca cerramos la sesión del admin
    // El admin sigue logueado todo el tiempo
  }

  return newUserUid;
}
