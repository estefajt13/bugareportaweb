/**
 * Cloud Function para crear usuarios administradores/funcionarios
 * Esta función usa Firebase Admin SDK para crear usuarios sin afectar la sesión actual
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * Crea un nuevo usuario administrador o funcionario
 * Solo administradores pueden usar esta función
 */
exports.createUser = functions.https.onCall(async (data, context) => {
  // Verificar que el usuario esté autenticado
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes estar autenticado para crear usuarios."
    );
  }

  const callerUid = context.auth.uid;
  
  // Verificar que el usuario es administrador
  const userDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (!userDoc.exists || userDoc.data().rol !== "Administrador") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo los administradores pueden crear usuarios."
    );
  }

  // Validar datos requeridos
  const {
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
  } = data;

  if (!nombre || !id || !correo || !password) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Los campos nombre, id, correo y contraseña son obligatorios."
    );
  }

  try {
    // Crear usuario en Firebase Authentication
    const userRecord = await admin.auth().createUser({
      email: correo,
      password: password,
      displayName: nombre,
    });

    // Guardar datos adicionales en Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      nombre: nombre.trim(),
      id: id.trim(),
      correo: correo.trim(),
      telefono: telefono?.trim() || "",
      direccion: direccion?.trim() || "",
      departamento: departamento?.trim() || "",
      ciudad: ciudad?.trim() || "",
      area: area?.trim() || "",
      cargo: cargo?.trim() || "",
      rol: rol.trim(),
      estado,
      photoURL: "/avatar_placeholder.svg",
      emailVerified: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Retornar el UID del usuario creado
    return {
      success: true,
      uid: userRecord.uid,
      message: `Usuario ${nombre} creado exitosamente.`
    };

  } catch (error) {
    console.error("Error creando usuario:", error);
    
    if (error.code === "auth/email-already-exists" || error.code === "auth/email-already-in-use") {
      throw new functions.https.HttpsError(
        "already-exists",
        "El correo electrónico ya está en uso."
      );
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "Error al crear el usuario. Intenta nuevamente."
    );
  }
});

/**
 * Desactiva un usuario (elimina de Firestore y Auth)
 * Solo administradores pueden usar esta función
 */
exports.deactivateUser = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debes estar autenticado."
    );
  }

  const callerUid = context.auth.uid;
  
  // Verificar que el usuario es administrador
  const userDoc = await admin.firestore().collection("users").doc(callerUid).get();
  if (!userDoc.exists || userDoc.data().rol !== "Administrador") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo los administradores pueden desactivar usuarios."
    );
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "El UID del usuario es obligatorio."
    );
  }

  try {
    // Eliminar de Firestore
    await admin.firestore().collection("users").doc(uid).delete();

    // Eliminar de Authentication
    await admin.auth().deleteUser(uid);

    return {
      success: true,
      message: "Usuario desactivado exitosamente."
    };

  } catch (error) {
    console.error("Error desactivando usuario:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Error al desactivar el usuario. Intenta nuevamente."
    );
  }
});