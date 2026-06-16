import { useState, useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { clientesService } from "../services/clientesService";
import { solicitudesService } from "../services/solicitudesService";

export const useClientes = () => {
  const { userName, currentUser, userRole } = useContext(GlobalContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registrarNuevoCliente = async (formData) => {
    if (!currentUser?.uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    setIsSubmitting(true);

    try {
      return await clientesService.crearCliente(
        formData,
        userName,
        currentUser.uid,
        userRole,
      );
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No se pudo registrar el cliente.",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  const solicitarAumentoCredito = async (datosSolicitud) => {
    if (!currentUser?.uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    setIsSubmitting(true);

    try {
      return await solicitudesService.crearSolicitudAumento({
        ...datosSolicitud,
        solicitado_por_uid: currentUser.uid,
        solicitado_por_nombre: userName || "ADMIN",
      });
    } catch (error) {
      return {
        success: false,
        error: error?.message || "No se pudo crear la solicitud.",
      };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    registrarNuevoCliente,
    solicitarAumentoCredito,
  };
};