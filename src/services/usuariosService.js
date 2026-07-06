import { app, auth, db } from "../config/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  formatearFechaSegura,
  rolSeguro,
} from "../utils/normalizadores";

const ALIAS_COLLECTION = "login_aliases";
const USUARIOS_COLLECTION = "usuarios";
const ACTIVIDAD_COLLECTION = "actividad";

const normalizarAlias = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase();

const normalizarCorreo = (valor = "") =>
  String(valor || "")
    .trim()
    .toLowerCase();

const aliasValido = (valor = "") => /^[a-z0-9._-]+$/.test(valor);

const correoRealValido = (valor = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor) &&
  !valor.endsWith("@mlh.local");

const mapearErrorAuth = (error) => {
  if (error?.code === "auth/email-already-in-use") {
    return "El correo real ya está registrado en Firebase Authentication.";
  }

  if (error?.code === "auth/invalid-email") {
    return "El correo real no tiene un formato válido.";
  }

  if (error?.code === "auth/weak-password") {
    return "La contraseña temporal debe tener al menos 6 caracteres.";
  }

  if (error?.code === "auth/user-not-found") {
    return "No existe una cuenta de Firebase Auth asociada a ese correo.";
  }

  if (error?.code === "auth/too-many-requests") {
    return "Firebase bloqueó temporalmente la operación por demasiados intentos.";
  }

  return error?.message || "No se pudo completar la operación de usuario.";
};

export const usuariosService = {
  escucharUsuarios: (callback) => {
    return onSnapshot(
      collection(db, USUARIOS_COLLECTION),
      (snapshot) => {
        const usuariosNormalizados = snapshot.docs
          .map((docSnap) => {
            const data = docSnap.data();
            const rol = rolSeguro(data);
            const correo = normalizarCorreo(data.correo || data.email || "");
            const usuarioAlias = normalizarAlias(
              data.usuario_alias || data.usuario || "",
            );

            let fechaCreacionOrden = 0;

            if (data.fecha_creacion?.toDate) {
              fechaCreacionOrden = data.fecha_creacion.toDate().getTime();
            } else if (data.fecha_creacion?.seconds) {
              fechaCreacionOrden = data.fecha_creacion.seconds * 1000;
            }

            return {
              id: docSnap.id,
              nombre: data.nombre || "Sin Nombre",
              correo,
              correo_auth: normalizarCorreo(data.correo_auth || correo),
              usuario_alias: usuarioAlias,
              usuarioLimpio: usuarioAlias || (correo ? correo.split("@")[0] : "S/N"),
              rol,
              activo: data.activo === true,
              estado: data.activo === true ? "activo" : "inactivo",
              proveedor_acceso: data.proveedor_acceso || "LEGACY_LOCAL",
              requiere_reset_password: data.requiere_reset_password === true,
              ultima_entrada: formatearFechaSegura(
                data.ultima_entrada || data.ultimoLogin,
                "Nunca",
              ),
              fecha_creacion_texto: formatearFechaSegura(
                data.fecha_creacion,
                "Sin fecha",
              ),
              fecha_actualizacion_texto: formatearFechaSegura(
                data.fecha_actualizacion,
                "Sin fecha",
              ),
              _fechaCreacionOrden: fechaCreacionOrden,
            };
          })
          .sort(
            (primero, segundo) =>
              segundo._fechaCreacionOrden - primero._fechaCreacionOrden,
          );

        callback(usuariosNormalizados);
      },
      (error) => {
        console.error("Error en la escucha de usuarios:", error);
        callback([]);
      },
    );
  },

  crearAdmin: async ({
    nombre,
    usuario,
    correo,
    password,
    userName,
    actor_uid,
  }) => {
    let appSecundaria;
    let authSecundario;
    let usuarioCreadoEnAuth;

    try {
      if (!actor_uid) {
        throw new Error("No se identificó al Súper Usuario responsable.");
      }

      const nombreLimpio = String(nombre || "").trim();
      const usuarioNormalizado = normalizarAlias(usuario);
      const correoReal = normalizarCorreo(correo);

      if (!nombreLimpio || !usuarioNormalizado || !correoReal || !password) {
        throw new Error("Nombre, usuario, correo real y contraseña temporal son obligatorios.");
      }

      if (password.length < 6) {
        throw new Error("La contraseña temporal debe tener al menos 6 caracteres.");
      }

      if (!aliasValido(usuarioNormalizado)) {
        throw new Error(
          "El usuario solo puede contener letras sin acentos, números, puntos, guiones y guion bajo.",
        );
      }

      if (!correoRealValido(correoReal)) {
        throw new Error(
          "Captura un correo real válido. No uses cuentas @mlh.local para accesos nuevos.",
        );
      }

      const aliasRef = doc(db, ALIAS_COLLECTION, usuarioNormalizado);
      const aliasSnap = await getDoc(aliasRef);

      if (aliasSnap.exists()) {
        throw new Error("El usuario de acceso ya está reservado en el sistema.");
      }

      const adminActivoQuery = query(
        collection(db, USUARIOS_COLLECTION),
        where("rol", "==", "ADMIN"),
        where("activo", "==", true),
        limit(1),
      );
      const adminActivoSnap = await getDocs(adminActivoQuery);

      if (!adminActivoSnap.empty) {
        throw new Error(
          "Ya existe un ADMIN activo. Suspende el acceso anterior antes de crear uno nuevo.",
        );
      }

      appSecundaria = initializeApp(
        app.options,
        `AppSecundaria_${Date.now()}`,
      );

      authSecundario = getAuth(appSecundaria);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          authSecundario,
          correoReal,
          password,
        );

        usuarioCreadoEnAuth = userCredential.user;
      } catch (authError) {
        throw new Error(mapearErrorAuth(authError), { cause: authError });
      }

      const nuevoUID = usuarioCreadoEnAuth.uid;

      try {
        const batch = writeBatch(db);
        const userRef = doc(db, USUARIOS_COLLECTION, nuevoUID);
        const actRef = doc(collection(db, ACTIVIDAD_COLLECTION));

        batch.set(userRef, {
          nombre: nombreLimpio,
          correo: correoReal,
          correo_auth: correoReal,
          usuario_alias: usuarioNormalizado,
          rol: "ADMIN",
          activo: true,
          proveedor_acceso: "EMAIL_REAL_ALIAS",
          requiere_reset_password: true,
          fecha_creacion: serverTimestamp(),
          fecha_actualizacion: serverTimestamp(),
          ultima_entrada: null,
          creado_por: userName || "SU",
          creado_por_uid: actor_uid,
        });

        batch.set(aliasRef, {
          correo_auth: correoReal,
          activo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(actRef, {
          actor_uid,
          usuario: userName || "SU",
          modulo: "Sistema",
          tipo: "Alta de Usuario",
          cliente: "N/A",
          detalle:
            `Se generó un nuevo acceso ADMIN para ${nombreLimpio} ` +
            `(Usuario: ${usuarioNormalizado}, correo real: ${correoReal}).`,
          serverTime: serverTimestamp(),
        });

        await batch.commit();
      } catch (firestoreError) {
        console.error(
          "Error al escribir el perfil en Firestore. Ejecutando rollback:",
          firestoreError,
        );

        let rollbackCompletado = false;

        if (usuarioCreadoEnAuth) {
          try {
            await deleteUser(usuarioCreadoEnAuth);
            rollbackCompletado = true;
          } catch (rollbackError) {
            console.error(
              "No fue posible eliminar la cuenta de Authentication durante el rollback:",
              rollbackError,
            );
          }
        }

        const mensaje = rollbackCompletado
          ? "No se pudo completar el perfil. La cuenta de Authentication fue anulada."
          : "No se pudo completar el perfil y tampoco fue posible confirmar la eliminación de la cuenta de Authentication.";

        throw new Error(mensaje, { cause: firestoreError });
      }

      return {
        success: true,
        uid: nuevoUID,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "No se pudo crear el usuario.",
      };
    } finally {
      if (authSecundario) {
        try {
          await signOut(authSecundario);
        } catch (cleanupError) {
          console.warn("No fue posible cerrar la sesión secundaria:", cleanupError);
        }
      }

      if (appSecundaria) {
        try {
          await deleteApp(appSecundaria);
        } catch (cleanupError) {
          console.warn("No fue posible eliminar la aplicación secundaria:", cleanupError);
        }
      }
    }
  },

  actualizarEstadoUsuario: async ({
    uid,
    activo,
    correoObjetivo,
    usuarioAlias,
    userName,
    actor_uid,
  }) => {
    try {
      if (!actor_uid) {
        throw new Error("No se identificó al Súper Usuario responsable.");
      }

      if (!uid) {
        throw new Error("ID de usuario requerido.");
      }

      const aliasNormalizado = normalizarAlias(usuarioAlias);
      const batch = writeBatch(db);
      const userRef = doc(db, USUARIOS_COLLECTION, uid);

      batch.update(userRef, {
        activo,
        fecha_actualizacion: serverTimestamp(),
      });

      if (aliasNormalizado) {
        const aliasRef = doc(db, ALIAS_COLLECTION, aliasNormalizado);
        batch.set(
          aliasRef,
          {
            activo,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      }

      const tipoAccion = activo ? "Reactivación de Cuenta" : "Suspensión de Cuenta";
      const estadoVerbo = activo ? "reactivó" : "suspendió";
      const usuarioObjetivo = aliasNormalizado || String(correoObjetivo || uid).split("@")[0];
      const actRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(actRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Sistema",
        tipo: tipoAccion,
        cliente: "N/A",
        detalle: `El SU ${estadoVerbo} el perfil de ingreso del usuario: ${usuarioObjetivo}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error al modificar el estado del usuario:", error);

      return {
        success: false,
        error: error.message || "No se pudo actualizar el estado del usuario.",
      };
    }
  },

  enviarRecuperacionPassword: async ({
    correoObjetivo,
    usuarioAlias,
    userName,
    actor_uid,
  }) => {
    try {
      if (!actor_uid) {
        throw new Error("No se identificó al Súper Usuario responsable.");
      }

      const correoReal = normalizarCorreo(correoObjetivo);
      const aliasNormalizado = normalizarAlias(usuarioAlias);

      if (!correoRealValido(correoReal)) {
        throw new Error(
          "Este acceso no tiene correo real configurado. Migra la cuenta antes de enviar recuperación.",
        );
      }

      await sendPasswordResetEmail(auth, correoReal);

      const batch = writeBatch(db);
      const actRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      batch.set(actRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Sistema",
        tipo: "Recuperación de Contraseña",
        cliente: "N/A",
        detalle:
          `El SU envió un correo de recuperación para el acceso ` +
          `${aliasNormalizado || correoReal}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error("Error enviando recuperación de contraseña:", error);

      return {
        success: false,
        error: mapearErrorAuth(error),
      };
    }
  },
};
