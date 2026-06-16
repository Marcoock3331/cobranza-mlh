import { db, app } from "../config/firebase";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  deleteApp,
  initializeApp,
} from "firebase/app";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  signOut,
} from "firebase/auth";
import {
  formatearFechaSegura,
  rolSeguro,
} from "../utils/normalizadores";

export const usuariosService = {
  escucharUsuarios: (callback) => {
    return onSnapshot(
      collection(db, "usuarios"),
      (snapshot) => {
        const usuariosNormalizados =
          snapshot.docs
            .map((docSnap) => {
              const data = docSnap.data();
              const rol = rolSeguro(data);
              const correo =
                data.correo || data.email || "";

              let fechaCreacionOrden = 0;

              if (data.fecha_creacion?.toDate) {
                fechaCreacionOrden =
                  data.fecha_creacion
                    .toDate()
                    .getTime();
              } else if (
                data.fecha_creacion?.seconds
              ) {
                fechaCreacionOrden =
                  data.fecha_creacion.seconds *
                  1000;
              }

              return {
                id: docSnap.id,
                nombre:
                  data.nombre || "Sin Nombre",
                correo,
                usuarioLimpio: correo
                  ? correo.split("@")[0]
                  : "S/N",
                rol,
                activo: data.activo === true,
                estado:
                  data.activo === true
                    ? "activo"
                    : "inactivo",
                ultima_entrada:
                  formatearFechaSegura(
                    data.ultima_entrada ||
                      data.ultimoLogin,
                    "Nunca",
                  ),
                fecha_creacion_texto:
                  formatearFechaSegura(
                    data.fecha_creacion,
                    "Sin fecha",
                  ),
                fecha_actualizacion_texto:
                  formatearFechaSegura(
                    data.fecha_actualizacion,
                    "Sin fecha",
                  ),
                _fechaCreacionOrden:
                  fechaCreacionOrden,
              };
            })
            .sort(
              (primero, segundo) =>
                segundo._fechaCreacionOrden -
                primero._fechaCreacionOrden,
            );

        callback(usuariosNormalizados);
      },
      (error) => {
        console.error(
          "Error en la escucha de usuarios:",
          error,
        );
        callback([]);
      },
    );
  },

  crearAdmin: async ({
    nombre,
    usuario,
    password,
    userName,
    actor_uid,
  }) => {
    let appSecundaria;
    let authSecundario;
    let usuarioCreadoEnAuth;

    try {
      if (!actor_uid) {
        throw new Error(
          "No se identificó al Súper Usuario responsable.",
        );
      }

      if (
        !nombre ||
        !usuario ||
        !password ||
        password.length < 6
      ) {
        throw new Error(
          "Campos incompletos o contraseña menor a 6 caracteres.",
        );
      }

      const usuarioNormalizado = usuario
        .trim()
        .toLowerCase();

      if (
        !/^[a-z0-9._-]+$/.test(
          usuarioNormalizado,
        )
      ) {
        throw new Error(
          "El usuario solo puede contener letras sin acentos, números, puntos, guiones y guion bajo.",
        );
      }

      const correoFantasma =
        `${usuarioNormalizado}@mlh.local`;

      appSecundaria = initializeApp(
        app.options,
        `AppSecundaria_${Date.now()}`,
      );

      authSecundario =
        getAuth(appSecundaria);

      try {
        const userCredential =
          await createUserWithEmailAndPassword(
            authSecundario,
            correoFantasma,
            password,
          );

        usuarioCreadoEnAuth =
          userCredential.user;
      } catch (authError) {
        const mensajeError =
          authError.code ===
          "auth/email-already-in-use"
            ? "El usuario ya se encuentra registrado."
            : authError.message;

        throw new Error(
          mensajeError,
          { cause: authError },
        );
      }

      const nuevoUID =
        usuarioCreadoEnAuth.uid;

      try {
        const batch = writeBatch(db);
        const userRef = doc(
          db,
          "usuarios",
          nuevoUID,
        );

        batch.set(userRef, {
          nombre,
          correo: correoFantasma,
          rol: "ADMIN",
          activo: true,
          fecha_creacion:
            serverTimestamp(),
          fecha_actualizacion:
            serverTimestamp(),
          ultima_entrada: null,
          creado_por:
            userName || "SU",
        });

        const actRef = doc(
          collection(db, "actividad"),
        );

        batch.set(actRef, {
          actor_uid,
          usuario:
            userName || "SU",
          modulo: "Sistema",
          tipo: "Alta de Usuario",
          cliente: "N/A",
          detalle:
            `Se generó un nuevo acceso ADMIN para ${nombre} ` +
            `(Usuario: ${usuarioNormalizado}).`,
          serverTime:
            serverTimestamp(),
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
            await deleteUser(
              usuarioCreadoEnAuth,
            );

            rollbackCompletado = true;
          } catch (rollbackError) {
            console.error(
              "No fue posible eliminar la cuenta de Authentication durante el rollback:",
              rollbackError,
            );
          }
        }

        const mensaje =
          rollbackCompletado
            ? "No se pudo completar el perfil. La cuenta de Authentication fue anulada."
            : "No se pudo completar el perfil y tampoco fue posible confirmar la eliminación de la cuenta de Authentication.";

        throw new Error(
          mensaje,
          { cause: firestoreError },
        );
      }

      return {
        success: true,
        uid: nuevoUID,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error.message ||
          "No se pudo crear el usuario.",
      };
    } finally {
      if (authSecundario) {
        try {
          await signOut(authSecundario);
        } catch (cleanupError) {
          console.warn(
            "No fue posible cerrar la sesión secundaria:",
            cleanupError,
          );
        }
      }

      if (appSecundaria) {
        try {
          await deleteApp(appSecundaria);
        } catch (cleanupError) {
          console.warn(
            "No fue posible eliminar la aplicación secundaria:",
            cleanupError,
          );
        }
      }
    }
  },

  actualizarEstadoUsuario: async ({
    uid,
    activo,
    correoObjetivo,
    userName,
    actor_uid,
  }) => {
    try {
      if (!actor_uid) {
        throw new Error(
          "No se identificó al Súper Usuario responsable.",
        );
      }

      if (!uid) {
        throw new Error(
          "ID de usuario requerido.",
        );
      }

      const batch = writeBatch(db);
      const userRef = doc(
        db,
        "usuarios",
        uid,
      );

      batch.update(userRef, {
        activo,
        fecha_actualizacion:
          serverTimestamp(),
      });

      const tipoAccion = activo
        ? "Reactivación de Cuenta"
        : "Suspensión de Cuenta";

      const estadoVerbo = activo
        ? "reactivó"
        : "suspendió";

      const usuarioObjetivo = String(
        correoObjetivo || uid,
      ).split("@")[0];

      const actRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actRef, {
        actor_uid,
        usuario:
          userName || "SU",
        modulo: "Sistema",
        tipo: tipoAccion,
        cliente: "N/A",
        detalle:
          `El SU ${estadoVerbo} el perfil de ingreso del usuario: ${usuarioObjetivo}.`,
        serverTime:
          serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
      };
    } catch (error) {
      console.error(
        "Error al modificar el estado del usuario:",
        error,
      );

      return {
        success: false,
        error:
          error.message ||
          "No se pudo actualizar el estado del usuario.",
      };
    }
  },
};