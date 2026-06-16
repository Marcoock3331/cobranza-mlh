export const formatearFechaSegura = (fecha, fallback = "Nunca") => {
  if (!fecha) return fallback;

  // Firestore Timestamp normal
  if (fecha?.toDate && typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleString("es-MX");
  }

  // Timestamp serializado: { seconds, nanoseconds }
  if (typeof fecha === "object" && typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000).toLocaleString("es-MX");
  }

  // Timestamp Admin SDK: { _seconds, _nanoseconds }
  if (typeof fecha === "object" && typeof fecha._seconds === "number") {
    return new Date(fecha._seconds * 1000).toLocaleString("es-MX");
  }

  // Date normal
  if (fecha instanceof Date) {
    return fecha.toLocaleString("es-MX");
  }

  // String
  if (typeof fecha === "string") {
    return fecha;
  }

  return fallback;
};

export const textoSeguro = (valor, fallback = "") => {
  if (valor === null || valor === undefined) return fallback;
  if (typeof valor === "object") return fallback;
  return valor.toString();
};

export const rolSeguro = (usuario) => {
  return (usuario?.permisos?.rol || usuario?.rol || usuario?.role || "")
    .toString()
    .trim()
    .toUpperCase();
};