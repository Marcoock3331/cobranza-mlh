This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: src/pages/Facturacion.jsx, src/hooks/useFacturas.js, src/hooks/useFacturasPaginadas.js, src/services/facturasConsultaService.js, src/utils/normalizarFactura.js, src/pages/Clientes.jsx, firestore.indexes.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
firestore.indexes.json
src/hooks/useFacturas.js
src/hooks/useFacturasPaginadas.js
src/pages/Clientes.jsx
src/pages/Facturacion.jsx
src/services/facturasConsultaService.js
src/utils/normalizarFactura.js
```

# Files

## File: firestore.indexes.json
```json
{
  "indexes": [
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "cliente_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "estatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "cliente_id",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "estatus",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## File: src/hooks/useFacturasPaginadas.js
```javascript
import { useCallback, useEffect, useRef, useState } from "react";

import { facturasConsultaService } from "../services/facturasConsultaService";

export const useFacturasPaginadas = ({
  pageSize = 25,
  busqueda = "",
  filtroEstatus = "Todas",
  fechaInicio = "",
  fechaFin = "",
  clientes = [],
  enabled = true,
}) => {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [pagina, setPagina] = useState(1);
  const [haySiguiente, setHaySiguiente] = useState(false);
  const [cursorSiguiente, setCursorSiguiente] = useState(null);
  const [cursores, setCursores] = useState([null]);

  const solicitudActiva = useRef(0);

  const ejecutarConsulta = useCallback(
    async ({ paginaDestino = 1, cursoresDestino = [null] } = {}) => {
      if (!enabled) {
        setFacturas([]);
        setCargando(false);
        return;
      }

      const numeroSolicitud = solicitudActiva.current + 1;
      solicitudActiva.current = numeroSolicitud;
      setCargando(true);
      setError("");

      const cursor = cursoresDestino[paginaDestino - 1] || null;
      const respuesta = await facturasConsultaService.consultarPagina({
        pageSize,
        cursor,
        busqueda,
        filtroEstatus,
        fechaInicio,
        fechaFin,
        clientes,
      });

      if (numeroSolicitud !== solicitudActiva.current) {
        return;
      }

      if (!respuesta.success) {
        setFacturas([]);
        setHaySiguiente(false);
        setCursorSiguiente(null);
        setMensaje("");
        setError(respuesta.error || "No se pudieron cargar las facturas.");
        setCargando(false);
        return;
      }

      setFacturas(respuesta.facturas || []);
      setHaySiguiente(Boolean(respuesta.haySiguiente));
      setCursorSiguiente(respuesta.cursorSiguiente || null);
      setMensaje(respuesta.mensaje || "");
      setPagina(paginaDestino);
      setCursores(cursoresDestino);
      setCargando(false);
    },
    [
      enabled,
      pageSize,
      busqueda,
      filtroEstatus,
      fechaInicio,
      fechaFin,
      clientes,
    ],
  );

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      ejecutarConsulta({ paginaDestino: 1, cursoresDestino: [null] });
    }, 250);

    return () => window.clearTimeout(temporizador);
  }, [ejecutarConsulta]);

  const siguientePagina = useCallback(async () => {
    if (
      cargando ||
      !haySiguiente ||
      !cursorSiguiente ||
      facturas.length === 0
    ) {
      return;
    }

    const nuevosCursores = [
      ...cursores.slice(0, pagina),
      cursorSiguiente,
    ];

    await ejecutarConsulta({
      paginaDestino: pagina + 1,
      cursoresDestino: nuevosCursores,
    });
  }, [
    cargando,
    haySiguiente,
    cursorSiguiente,
    facturas.length,
    cursores,
    pagina,
    ejecutarConsulta,
  ]);

  const paginaAnterior = useCallback(async () => {
    if (cargando || pagina <= 1) return;

    const nuevosCursores = cursores.slice(0, pagina - 1);

    await ejecutarConsulta({
      paginaDestino: pagina - 1,
      cursoresDestino: nuevosCursores,
    });
  }, [cargando, pagina, cursores, ejecutarConsulta]);

  const recargar = useCallback(async () => {
    await ejecutarConsulta({
      paginaDestino: pagina,
      cursoresDestino: cursores,
    });
  }, [ejecutarConsulta, pagina, cursores]);

  return {
    facturas,
    cargando,
    error,
    mensaje,
    pagina,
    hayAnterior: pagina > 1,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar,
  };
};
```

## File: src/services/facturasConsultaService.js
```javascript
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  Timestamp,
  where,
} from "firebase/firestore";

import { db } from "../config/firebase";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";

const FACTURAS_COLLECTION = "facturas";
const LIMITE_CLIENTES_BUSQUEDA = 10;

const normalizarTexto = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const fechaInicioTimestamp = (fecha) => {
  if (!fecha) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 0, 0, 0, 0));
};

const fechaFinTimestamp = (fecha) => {
  if (!fecha) return null;

  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Timestamp.fromDate(new Date(anio, mes - 1, dia, 23, 59, 59, 999));
};

const coincideFiltrosLocales = (
  factura,
  { filtroEstatus, fechaInicio, fechaFin },
) => {
  if (filtroEstatus !== "Todas" && factura.estatus !== filtroEstatus) {
    return false;
  }

  if (fechaInicio && factura.emision < fechaInicio) {
    return false;
  }

  if (fechaFin && factura.emision > fechaFin) {
    return false;
  }

  return true;
};

const buscarPorFolioExacto = async ({
  textoBusqueda,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const consulta = query(
    collection(db, FACTURAS_COLLECTION),
    where("folio", "==", textoBusqueda),
    limit(5),
  );

  const snapshot = await getDocs(consulta);
  const facturas = snapshot.docs
    .map(normalizarFacturaSnapshot)
    .filter((factura) =>
      coincideFiltrosLocales(factura, {
        filtroEstatus,
        fechaInicio,
        fechaFin,
      }),
    );

  return {
    facturas,
    cursorSiguiente: null,
    haySiguiente: false,
    modoBusqueda: "folio",
    mensaje: facturas.length
      ? "Resultado por folio exacto."
      : "No se encontró un folio exacto con los filtros seleccionados.",
  };
};

const resolverClienteBusqueda = (textoBusqueda, clientes = []) => {
  const textoNormalizado = normalizarTexto(textoBusqueda);

  const coincidencias = clientes.filter((cliente) => {
    const nombre = normalizarTexto(cliente.nombre);
    const numero = normalizarTexto(cliente.numero_cliente);

    return (
      nombre.includes(textoNormalizado) ||
      numero.includes(textoNormalizado)
    );
  });

  if (coincidencias.length === 1) {
    return {
      cliente: coincidencias[0],
      mensaje: "",
    };
  }

  if (coincidencias.length > 1) {
    return {
      cliente: null,
      mensaje:
        coincidencias.length > LIMITE_CLIENTES_BUSQUEDA
          ? "La búsqueda coincide con demasiados clientes. Escribe más caracteres o usa el folio exacto."
          : `La búsqueda coincide con ${coincidencias.length} clientes. Escribe un nombre más específico o usa el folio exacto.`,
    };
  }

  return {
    cliente: null,
    mensaje: "",
  };
};

const crearRestricciones = ({
  clienteId,
  filtroEstatus,
  fechaInicio,
  fechaFin,
  cursor,
  pageSize,
}) => {
  const restricciones = [];

  if (clienteId) {
    restricciones.push(where("cliente_id", "==", clienteId));
  }

  if (filtroEstatus !== "Todas") {
    restricciones.push(where("estatus", "==", filtroEstatus));
  }

  const desde = fechaInicioTimestamp(fechaInicio);
  const hasta = fechaFinTimestamp(fechaFin);

  if (desde) {
    restricciones.push(where("emision", ">=", desde));
  }

  if (hasta) {
    restricciones.push(where("emision", "<=", hasta));
  }

  restricciones.push(orderBy("emision", "desc"));

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(pageSize + 1));

  return restricciones;
};

export const facturasConsultaService = {
  consultarPagina: async ({
    pageSize = 25,
    cursor = null,
    busqueda = "",
    filtroEstatus = "Todas",
    fechaInicio = "",
    fechaFin = "",
    clientes = [],
  } = {}) => {
    try {
      const textoBusqueda = busqueda.trim();
      let clienteId = "";
      let mensaje = "";

      if (textoBusqueda) {
        const clienteResuelto = resolverClienteBusqueda(
          textoBusqueda,
          clientes,
        );

        if (clienteResuelto.cliente) {
          clienteId = clienteResuelto.cliente.id;
        } else if (clienteResuelto.mensaje) {
          return {
            success: true,
            facturas: [],
            cursorSiguiente: null,
            haySiguiente: false,
            mensaje: clienteResuelto.mensaje,
            modoBusqueda: "ambigua",
          };
        } else {
          return {
            success: true,
            ...(await buscarPorFolioExacto({
              textoBusqueda,
              filtroEstatus,
              fechaInicio,
              fechaFin,
            })),
          };
        }
      }

      const restricciones = crearRestricciones({
        clienteId,
        filtroEstatus,
        fechaInicio,
        fechaFin,
        cursor,
        pageSize,
      });

      const consulta = query(
        collection(db, FACTURAS_COLLECTION),
        ...restricciones,
      );

      const snapshot = await getDocs(consulta);
      const documentosVisibles = snapshot.docs.slice(0, pageSize);
      const facturas = documentosVisibles.map(normalizarFacturaSnapshot);

      return {
        success: true,
        facturas,
        cursorSiguiente:
          documentosVisibles[documentosVisibles.length - 1] || null,
        haySiguiente: snapshot.docs.length > pageSize,
        mensaje,
        modoBusqueda: clienteId ? "cliente" : "lista",
      };
    } catch (error) {
      console.error("Error consultando facturas paginadas:", error);

      return {
        success: false,
        facturas: [],
        cursorSiguiente: null,
        haySiguiente: false,
        mensaje: "",
        error:
          error?.code === "failed-precondition"
            ? "Firestore necesita un índice para esta combinación de filtros. Abre el enlace que aparece en la consola del navegador o publica firestore.indexes.json."
            : error?.message || "No se pudieron consultar las facturas.",
      };
    }
  },
};
```

## File: src/utils/normalizarFactura.js
```javascript
const completarDosDigitos = (valor) => String(valor).padStart(2, "0");

export const fechaAISO = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    const valor = fecha.toDate();
    return `${valor.getFullYear()}-${completarDosDigitos(valor.getMonth() + 1)}-${completarDosDigitos(valor.getDate())}`;
  }

  if (fecha instanceof Date) {
    return `${fecha.getFullYear()}-${completarDosDigitos(fecha.getMonth() + 1)}-${completarDosDigitos(fecha.getDate())}`;
  }

  const texto = String(fecha).trim().split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    const [dia, mes, anio] = texto.split("/");
    return `${anio}-${completarDosDigitos(mes)}-${completarDosDigitos(dia)}`;
  }

  return "";
};

const fechaComparable = (fecha) => {
  const iso = fechaAISO(fecha);
  if (!iso) return null;

  const [anio, mes, dia] = iso.split("-").map(Number);
  const valor = new Date(anio, mes - 1, dia);
  valor.setHours(0, 0, 0, 0);
  return valor;
};

export const calcularEstatusVisibleFactura = (factura = {}) => {
  const saldoPendiente = Number(factura.saldo_pendiente) || 0;

  if (saldoPendiente <= 0) {
    return "Pagada";
  }

  const vencimiento = fechaComparable(factura.vencimiento);

  if (!vencimiento) {
    return factura.estatus || "Pendiente";
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return vencimiento < hoy ? "Vencida" : "Pendiente";
};

const normalizarAbono = (abono = {}) => ({
  ...abono,
  fecha: abono.fecha?.toDate
    ? abono.fecha.toDate().toLocaleString("es-MX")
    : abono.fecha,
});

export const normalizarFacturaData = (id, data = {}) => {
  const abonosRaw = Array.isArray(data.abonos) ? data.abonos : [];

  return {
    id,
    ...data,
    estatus: calcularEstatusVisibleFactura(data),
    emision: fechaAISO(data.emision),
    vencimiento: fechaAISO(data.vencimiento),
    _abonos_raw: abonosRaw,
    abonos: abonosRaw.map(normalizarAbono),
  };
};

export const normalizarFacturaSnapshot = (documento) =>
  normalizarFacturaData(documento.id, documento.data());
```

## File: src/hooks/useFacturas.js
```javascript
import { useDeferredValue, useMemo, useState } from "react";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

export const useFacturas = (stats = {}) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const busquedaDiferida = useDeferredValue(busqueda);

  const kpis = useMemo(
    () => ({
      deuda_activa: redondearMoneda(stats.cartera_total),
      monto_vencido: redondearMoneda(stats.cartera_vencida),
      total_liquidado: redondearMoneda(stats.total_liquidado),
      cobrado_historico: redondearMoneda(stats.cobrado_historico),
      abonos_registrados: redondearMoneda(stats.abonos_registrados),
    }),
    [stats],
  );

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setBusqueda("");
    setFiltroEstatus("Todas");
  };

  return {
    busqueda,
    busquedaDiferida,
    setBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  };
};
```

## File: src/pages/Clientes.jsx
```javascript
import { useState, useContext } from "react";
import {
  Search,
  Plus,
  MoreVertical,
  X,
  Trash2,
  Users,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useClientes } from "../hooks/useClientes";

const normalizarGrupo = (valor = "") => {
  return valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
};

export default function Clientes() {
  const navigate = useNavigate();
  const { userRole, userName, clientes, eliminarClienteEnNube } =
    useContext(GlobalContext);
  const { registrarNuevoCliente, isSubmitting } = useClientes();

  // Sistema de Notificaciones
  const [notificacion, setNotificacion] = useState({ visible: false, titulo: "", mensaje: "", tipo: "success" });

  const mostrarNotificacion = (titulo, mensaje, tipo = "success") => {
    setNotificacion({ visible: true, titulo, mensaje, tipo });
    setTimeout(() => {
      setNotificacion({ visible: false, titulo: "", mensaje: "", tipo: "success" });
    }, 5000);
  };

  const gruposFiltro = [
    "Todos",
    "Carpintería",
    "Cruce",
    "Familiares",
    "General",
    "Prioridad",
    "IHB",
    "RC Intercomerce",
    "Torre Las Americas",
  ];
  const [grupoActivo, setGrupoActivo] = useState("Todos");
  const [busqueda, setBusqueda] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuAbiertoId, setMenuAbiertoId] = useState(null);

  const [clienteAInactivar, setClienteAInactivar] = useState(null);
  const [isInactivating, setIsInactivating] = useState(false);

  const initialState = {
    numero_cliente: "",
    nombre: "",
    rfc: "",
    telefono: "",
    correo: "",
    direccion: "",
    ultima_fecha_pago: "",
    limite_credito: "",
    segmentacion: "Nuevo",
    grupo: "GENERAL",
    dias_mensaje: "",
    pagare_monto: 0.0,
    pagare_fecha: "",
    notas: "",
  };

  const [formData, setFormData] = useState(initialState);

  const opcionesGrupo = [
    "GENERAL",
    "CARPINTERIA",
    "CRUCE",
    "FAMILIARES",
    "PRIORIDAD",
    "IHB",
    "RC INTERCOMERCE",
    "TORRE LAS AMERICAS",
  ];

  const opcionesSegmentacion = [
    "Cumplidor",
    "Moroso",
    "Riesgo Alto",
    "Nuevo",
    "Suspendido",
  ];

  const clientesFiltrados = clientes.filter((cliente) => {
    // Evitar que el buscador rompa si el cliente es nulo o inactivo lógicamente
    if (cliente.activo === false || cliente.estatus === "Inactivo") return false;

    const coincideGrupo =
      grupoActivo === "Todos" ||
      normalizarGrupo(cliente.grupo) === normalizarGrupo(grupoActivo);

    const coincideBusqueda =
      (cliente.nombre &&
        cliente.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
      (cliente.rfc &&
        cliente.rfc.toLowerCase().includes(busqueda.toLowerCase())) ||
      (cliente.numero_cliente &&
        cliente.numero_cliente.toLowerCase().includes(busqueda.toLowerCase()));
    
    return coincideGrupo && coincideBusqueda;
  });

  const handleInputChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCerrarModalAlta = () => {
    setIsModalOpen(false);
    setFormData(initialState);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await registrarNuevoCliente(formData, userName);
    if (response.success) {
      mostrarNotificacion("Éxito", "Cliente registrado correctamente.", "success");
      handleCerrarModalAlta();
    } else {
      mostrarNotificacion("Error al guardar", response.error || "Revisa la consola para más detalles.", "error");
    }
  };

  const confirmarInactivacion = async () => {
    if (!clienteAInactivar) return;
    setIsInactivating(true);
    
    // Este método en GlobalContext ahora apunta de forma segura a clientesService.eliminarCliente
    // que bajo el capó realiza un update lógico y auditable.
    const res = await eliminarClienteEnNube(
      clienteAInactivar.id,
      clienteAInactivar.nombre
    );
    setIsInactivating(false);
    
    if (res.success) {
      mostrarNotificacion("Inactivado", "Cliente inactivado correctamente.", "success");
      setClienteAInactivar(null);
    } else {
      mostrarNotificacion("Error", res.error || "No se pudo inactivar el expediente.", "error");
    }
  };

  const getBadgeColor = (clase) => {
    switch (clase) {
      case "Cumplidor":
        return "bg-green-100 text-green-800 border-green-200";
      case "Moroso":
        return "bg-red-100 text-red-800 border-red-200";
      case "Irregular":
      case "Riesgo Alto":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      className="h-full flex flex-col space-y-4 md:space-y-6 relative"
      onClick={() => setMenuAbiertoId(null)}
    >
      {/* NOTIFICACIONES FLOTANTES */}
      {notificacion.visible && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded shadow-lg border flex items-start gap-3 w-80 animate-slide-in-right ${notificacion.tipo === "error" ? "bg-red-50 border-red-200 text-red-800" : "bg-green-50 border-green-200 text-green-800"}`}>
          {notificacion.tipo === "error" ? <XCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-600" /> : <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-green-600" />}
          <div>
            <h4 className="font-bold text-sm">{notificacion.titulo}</h4>
            <p className="text-xs mt-1 opacity-90">{notificacion.mensaje}</p>
          </div>
        </div>
      )}

      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
            <Users className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />{" "}
            Directorio de Clientes
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Administración de cuentas, líneas de crédito, estatus de saldos y
            expedientes clínicos.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full md:w-auto px-5 py-3 md:py-2.5 bg-[#0a192f] text-white font-bold text-sm rounded-xl md:rounded-lg hover:bg-[#1a2b45] flex items-center justify-center shadow-md transition-all active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
        </button>
      </div>

      {/* FILTROS DESLIZABLES EN MÓVIL */}
      <div className="flex overflow-x-auto pb-2 md:pb-0 md:flex-wrap gap-2 custom-scrollbar hide-scrollbar-mobile w-full">
        {gruposFiltro.map((grupo) => (
          <button
            key={grupo}
            onClick={() => setGrupoActivo(grupo)}
            className={`whitespace-nowrap px-4 py-2 md:py-1.5 rounded-full text-xs md:text-sm font-bold md:font-medium border transition-all shrink-0 ${
              grupoActivo === grupo
                ? "bg-[#0a192f] text-white border-[#0a192f] shadow-md"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {grupo}
          </button>
        ))}
      </div>

      {/* BUSCADOR */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#ffd700]/50 focus:border-[#ffd700] transition-all"
            placeholder="Buscar cliente, RFC o ID..."
          />
        </div>
      </div>

      {/* TABLA UNIFICADA */}
      <div className="flex bg-white border border-gray-100 rounded-xl shadow-sm flex-col overflow-hidden flex-1">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] md:max-h-[calc(100vh-350px)] pb-20 custom-scrollbar w-full">
          <table className="w-full min-w-[1000px] text-left text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  No. Cliente
                </th>
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Razón Social / RFC
                </th>
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Segmentación
                </th>
                <th className="px-6 py-4 border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Último Depósito
                </th>
                <th className="px-6 py-4 text-right border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Debe (Saldo)
                </th>
                <th className="px-6 py-4 text-right border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                  Límite Crédito
                </th>
                {userRole === "SU" && (
                  <th className="px-6 py-4 text-center border-b border-gray-200 bg-gray-50 whitespace-nowrap">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {clientesFiltrados.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500 font-medium"
                  >
                    No hay clientes registrados o no coinciden con la búsqueda.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <tr
                    key={cliente.id}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-[#0a192f]">
                      {cliente.numero_cliente || "SIN-FOLIO"}
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer group"
                      onClick={() => navigate(`/clientes/${cliente.id}`)}
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                        {cliente.nombre}
                      </div>
                      <div className="text-xs text-gray-400 font-mono uppercase">
                        {cliente.rfc}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getBadgeColor(cliente.segmentacion)}`}
                      >
                        {cliente.segmentacion || "Nuevo"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-green-600">
                        $
                        {(cliente.monto_ultimo_pago || 0).toLocaleString(
                          "es-MX",
                        )}
                      </div>
                      <div className="text-xs text-gray-500 font-medium whitespace-nowrap">
                        {cliente.fecha_ultimo_pago?.toDate
                          ? cliente.fecha_ultimo_pago
                              .toDate()
                              .toLocaleDateString("es-MX")
                          : cliente.fecha_ultimo_pago || "---"}
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-bold whitespace-nowrap ${(cliente.deuda_actual || 0) > 0 ? "text-red-600" : "text-gray-900"}`}
                    >
                      $
                      {(cliente.deuda_actual || 0).toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500 italic whitespace-nowrap">
                      ${(cliente.limite_credito || 0).toLocaleString("es-MX")}
                    </td>
                    {userRole === "SU" && (
                      <td className="px-6 py-4 text-center relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuAbiertoId(
                              menuAbiertoId === cliente.id ? null : cliente.id,
                            );
                          }}
                          className="p-3 md:p-1 hover:bg-gray-200 active:bg-gray-300 rounded-full text-gray-500 transition-colors"
                        >
                          <MoreVertical className="h-5 w-5 mx-auto" />
                        </button>
                        {menuAbiertoId === cliente.id && (
                          <div
                            className="absolute right-12 md:right-8 top-10 w-48 bg-white rounded-lg shadow-[0_4px_25px_rgba(0,0,0,0.15)] border border-gray-100 z-[100] overflow-hidden text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setClienteAInactivar(cliente);
                                setMenuAbiertoId(null);
                              }}
                              className="w-full px-4 py-3 md:py-2.5 text-sm font-bold md:font-normal text-red-600 active:bg-red-50 hover:bg-red-50 flex items-center transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Inactivar
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Inactivación */}
      {clienteAInactivar && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-fade-in pb-8 md:pb-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden"></div>

            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 md:h-14 md:w-14 rounded-full bg-red-100 mb-4 ring-4 ring-red-50">
                <AlertTriangle className="h-8 w-8 md:h-7 md:w-7 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-[#0a192f] mb-2">
                Inactivar Cliente
              </h3>
              <p className="text-sm text-gray-600 mb-6 md:mb-6 leading-relaxed">
                ¿Está totalmente seguro de inactivar a{" "}
                <span className="font-bold text-gray-900">
                  {clienteAInactivar.nombre}
                </span>
                ? El historial y las facturas se conservarán.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setClienteAInactivar(null)}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarInactivacion}
                  disabled={isInactivating}
                  className="flex-1 px-4 py-3 md:py-2 text-sm font-bold text-white bg-red-600 rounded-xl md:rounded-lg active:bg-red-700 hover:bg-red-700 disabled:opacity-70 flex items-center justify-center transition-colors shadow-sm"
                >
                  {isInactivating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                      Inactivando...
                    </>
                  ) : (
                    "Sí, inactivar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alta de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4">
          <div className="bg-white rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] md:h-auto md:max-h-[90vh] flex flex-col animate-slide-up md:animate-fade-in overflow-hidden">
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-gray-100 shrink-0 bg-white z-10">
              <h2 className="text-xl font-black text-[#0a192f]">
                Nuevo Cliente
              </h2>
              <button
                onClick={handleCerrarModalAlta}
                className="text-gray-400 active:text-red-500 hover:text-red-500 bg-gray-50 p-2 rounded-full transition-colors disabled:opacity-50"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 md:p-6 overflow-y-auto flex-1 custom-scrollbar pb-24 md:pb-6">
              <form
                id="altaClienteForm"
                onSubmit={handleSubmit}
                className="space-y-6 md:space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      ID del Cliente (Opcional)
                    </label>
                    <input
                      type="text"
                      name="numero_cliente"
                      value={formData.numero_cliente}
                      onChange={handleInputChange}
                      placeholder="ID de otro sistema"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Razón Social <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      RFC
                    </label>
                    <input
                      type="text"
                      name="rfc"
                      value={formData.rfc}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 border-t border-gray-100 pt-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Grupo
                    </label>
                    <select
                      name="grupo"
                      value={formData.grupo}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-medium"
                    >
                      {opcionesGrupo.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Segmentación
                    </label>
                    <select
                      name="segmentacion"
                      value={formData.segmentacion}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-medium"
                    >
                      {opcionesSegmentacion.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Límite de Crédito
                    </label>
                   <input
                      type="number"
                      name="limite_credito"
                      value={userRole === "SU" ? formData.limite_credito : 0}
                      onChange={handleInputChange}
                      placeholder="Ej. 6000"
                      disabled={isSubmitting || userRole !== "SU"}
                      className={`w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm font-bold ${userRole !== 'SU' ? 'text-gray-400 cursor-not-allowed' : 'text-gray-900 focus:bg-white'}`}
                    />
                    <p className="text-[10px] text-gray-400 mt-1.5 leading-tight">
                      {userRole === "SU" 
                         ? "Monto de apertura. Futuros aumentos requerirán autorización." 
                         : "Los perfiles operativos no tienen permisos para asignar crédito inicial."}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 border-t border-gray-100 pt-6">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Días de Mensaje (Aviso)
                    </label>
                    <input
                      type="number"
                      name="dias_mensaje"
                      value={formData.dias_mensaje}
                      onChange={handleInputChange}
                      placeholder="Ej. 5"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-200">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Pagaré - Monto
                      </label>
                      <input
                        type="number"
                        name="pagare_monto"
                        value={formData.pagare_monto}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 md:py-2 bg-white border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                        Pagaré - Fecha
                      </label>
                      <input
                        type="date"
                        name="pagare_fecha"
                        value={formData.pagare_fecha}
                        onChange={handleInputChange}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3 md:py-2 bg-white border border-gray-200 rounded-xl md:rounded-md focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:gap-6 border-t border-gray-100 pt-6 pb-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Dirección Completa
                    </label>
                    <textarea
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleInputChange}
                      rows="2"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-xl md:rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 tracking-wider mb-1.5">
                      Notas Internas
                    </label>
                    <textarea
                      name="notas"
                      value={formData.notas}
                      onChange={handleInputChange}
                      rows="2"
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 md:py-2 bg-yellow-50/30 border border-yellow-200 rounded-xl md:rounded-md focus:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm resize-none"
                    ></textarea>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 md:p-5 border-t border-gray-100 bg-white md:bg-gray-50 md:rounded-b-xl flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-3 shrink-0">
              <button
                onClick={handleCerrarModalAlta}
                disabled={isSubmitting}
                className="w-full md:w-auto px-6 py-3.5 md:py-2.5 text-sm font-bold text-gray-600 bg-gray-100 border border-transparent rounded-xl md:rounded-lg active:bg-gray-200 hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="altaClienteForm"
                disabled={isSubmitting}
                className="w-full md:w-auto px-8 py-3.5 md:py-2.5 text-sm font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200] hover:bg-[#ffed4a] disabled:opacity-70 flex items-center justify-center shadow-md transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />{" "}
                    Guardando...
                  </>
                ) : (
                  "Guardar Cliente"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: src/pages/Facturacion.jsx
```javascript
import { useState, useMemo, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { useFacturas } from "../hooks/useFacturas";
import { useFacturasPaginadas } from "../hooks/useFacturasPaginadas";
import { calcularDiasVencidos } from "../utils/fechas";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";
import Select from "react-select";
import {
  Search,
  Plus,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  MoreVertical,
  Trash2,
  Edit,
  MessageSquare,
  CreditCard,
  XCircle,
  Check,
  TrendingUp,
  Calendar,
  Send,
  Smartphone,
  FilterX,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";

const FACTURAS_POR_PAGINA = 25;
const SIN_CLIENTES_BUSQUEDA = Object.freeze([]);

const GRUPOS_FACTURA = [
  "Carpintería",
  "Cruce",
  "Familiares",
  "General",
  "Prioridad",
  "IHB",
  "RC Intercomerce",
  "Torre Las Americas",
  "Nuevo",
];

const normalizarGrupoFactura = (valor = "") => {
  const normalizado = valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return (
    GRUPOS_FACTURA.find(
      (grupo) =>
        grupo
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase() === normalizado,
    ) || "General"
  );
};

const crearFormularioFactura = (factura = null) => {
  if (!factura) {
    return {
      cliente_id: "",
      cliente: "",
      grupo: "General",
      folio: "",
      monto_total: "",
      moneda: "MXN",
      emision: "",
      vencimiento: "",
      observaciones: "",
    };
  }

  return {
    cliente_id: factura.cliente_id || "",
    cliente: factura.cliente || "",
    grupo: normalizarGrupoFactura(factura.grupo),
    folio: factura.folio || "",
    monto_total: factura.monto_total ?? "",
    moneda: "MXN",
    emision: factura.emision || "",
    vencimiento: factura.vencimiento || "",
    observaciones: factura.observaciones || "",
  };
};

export default function Facturacion() {
  const {
    stats,
    userRole,
    clientes,
    crearFacturaEnNube,
    modificarFacturaEnNube,
    eliminarFacturaEnNube,
    registrarAbonoEnNube,
    eliminarAbonoEnNube,
  } = useContext(GlobalContext);

  const location = useLocation();
  const navigate = useNavigate();
  const facturaInicialEdicion = location.state?.editarFactura || null;

  const {
    busqueda,
    busquedaDiferida,
    setBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  } = useFacturas(stats);

  const {
    facturas: facturasPaginadas,
    cargando: cargandoFacturas,
    error: errorFacturas,
    mensaje: mensajeFacturas,
    pagina: paginaActualFacturas,
    hayAnterior,
    haySiguiente,
    siguientePagina,
    paginaAnterior,
    recargar: recargarFacturas,
  } = useFacturasPaginadas({
    pageSize: FACTURAS_POR_PAGINA,
    busqueda: busquedaDiferida,
    filtroEstatus,
    fechaInicio,
    fechaFin,
    clientes: busquedaDiferida ? clientes : SIN_CLIENTES_BUSQUEDA,
  });

  const [modalActivo, setModalActivo] = useState(
    facturaInicialEdicion ? "editarFactura" : null,
  );
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(
    facturaInicialEdicion,
  );
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });

  const [invoiceForm, setInvoiceForm] = useState(() =>
    crearFormularioFactura(facturaInicialEdicion),
  );

  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "Efectivo" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [itemAEliminar, setItemAEliminar] = useState(null);
  const [datosWhatsapp, setDatosWhatsapp] = useState({
    telefono: "",
    plantilla: "atrasado",
    mensaje: "",
  });

  const opcionesClientes = useMemo(() => {
    if (!clientes) return [];

    return [...clientes]
      .filter((c) => c.activo !== false && c.estatus !== "Inactivo")
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map((c) => ({
        value: c.id,
        label: c.nombre + (c.numero_cliente ? " - #" + c.numero_cliente : ""),
        cliente: c,
      }));
  }, [clientes]);

  const abrirMenuOpciones = (factura) => {
    setFacturaSeleccionada(factura);
    setModalActivo("opcionesFactura");
  };

  const abrirFormulario = (tipo) => {
    if (tipo === "nuevoPago") setPagoForm({ monto: "", metodo: "Efectivo" });
    else if (tipo === "whatsapp") {
      const clienteDB =
        clientes?.find((c) => c.id === facturaSeleccionada?.cliente_id) ||
        clientes?.find((c) => c.nombre === facturaSeleccionada?.cliente);

      const telefonoAsignado =
        clienteDB?.telefono || facturaSeleccionada?.telefono || "";
      setDatosWhatsapp({
        telefono: telefonoAsignado,
        plantilla: "atrasado",
        mensaje: generarMensajeWA("atrasado", facturaSeleccionada),
      });
    } else if (tipo === "nuevaFactura") {
      setInvoiceForm(crearFormularioFactura());
    } else if (tipo === "editarFactura" && facturaSeleccionada) {
      setInvoiceForm(crearFormularioFactura(facturaSeleccionada));
    }

    setModalActivo(tipo);
  };

  const cerrarModal = () => {
    setModalActivo(null);

    if (location.state?.editarFactura) {
      navigate("/facturas", { replace: true, state: null });
    }
    if (
      [
        "notificacion",
        "opcionesFactura",
        "confirmarEliminar",
        "whatsapp",
      ].includes(modalActivo)
    ) {
      setFacturaSeleccionada(null);
      setItemAEliminar(null);
    }
  };

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const handleSaveFactura = async () => {
    setIsSubmitting(true);

    try {
      const nuevoMonto = Number(invoiceForm.monto_total) || 0;

      if (
        !invoiceForm.cliente_id ||
        !invoiceForm.folio?.trim() ||
        !invoiceForm.emision ||
        !invoiceForm.vencimiento ||
        nuevoMonto <= 0
      ) {
        mostrarNotificacion(
          "Campos incompletos",
          "Selecciona cliente, folio, fechas y un monto válido para continuar.",
          "error",
        );
        return;
      }

      if (invoiceForm.vencimiento < invoiceForm.emision) {
        mostrarNotificacion(
          "Fechas inválidas",
          "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
          "error",
        );
        return;
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === invoiceForm.cliente_id,
      );

      if (!clienteBD) {
        mostrarNotificacion(
          "Error",
          "Selecciona un cliente comercial válido.",
          "error",
        );
        return;
      }

      const payloadFactura = {
        cliente_id: clienteBD.id,
        cliente: clienteBD.nombre,
        grupo: normalizarGrupoFactura(invoiceForm.grupo),
        folio: invoiceForm.folio.trim(),
        monto_total: nuevoMonto,
        moneda: "MXN",
        emision: invoiceForm.emision,
        vencimiento: invoiceForm.vencimiento,
        observaciones: invoiceForm.observaciones?.trim() || "",
      };

      if (modalActivo === "nuevaFactura") {
        const limite = Number(clienteBD.limite_credito) || 0;
        const deudaActual = Number(clienteBD.deuda_actual) || 0;
        const disponibleGuardado = Number(clienteBD.credito_disponible);
        const creditoDisponible = Number.isFinite(disponibleGuardado)
          ? disponibleGuardado
          : Math.max(0, limite - deudaActual);

        if (limite <= 0) {
          mostrarNotificacion(
            "Línea de crédito no asignada",
            `El cliente ${clienteBD.nombre} todavía no tiene una línea de crédito configurada.`,
            "error",
          );
          return;
        }

        if (nuevoMonto > creditoDisponible) {
          mostrarNotificacion(
            "Límite de Crédito Excedido",
            `El cliente ${clienteBD.nombre} solo tiene $${Math.max(0, creditoDisponible).toLocaleString("es-MX")} de crédito libre.`,
            "error",
          );
          return;
        }

        const res = await crearFacturaEnNube(payloadFactura);

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo crear la factura.",
            "error",
          );
          return;
        }

        await recargarFacturas();

        mostrarNotificacion(
          "Factura Autorizada",
          `Se ha generado el folio ${payloadFactura.folio} correctamente.`,
        );
        return;
      }

      if (modalActivo === "editarFactura") {
        if (!facturaSeleccionada?.id) {
          mostrarNotificacion(
            "Error",
            "No se identificó la factura que deseas editar.",
            "error",
          );
          return;
        }

        const res = await modificarFacturaEnNube(
          facturaSeleccionada.id,
          payloadFactura,
        );

        if (!res?.success) {
          mostrarNotificacion(
            "No se pudo editar",
            res?.error || "La modificación fue rechazada.",
            "error",
          );
          return;
        }

        if (res.sinCambios) {
          mostrarNotificacion(
            "Sin cambios",
            "La factura conserva los mismos datos; no se generó una entrada de auditoría.",
          );
          return;
        }

        await recargarFacturas();

        mostrarNotificacion(
          "Factura Modificada",
          `Se actualizaron ${res.camposModificados?.length || 1} campo(s). Los saldos, límites y métricas fueron recalculados y la edición quedó registrada para el SU.`,
        );
      }
    } catch (error) {
      console.error("Error al facturar:", error);

      mostrarNotificacion(
        "Error inesperado",
        "No se pudo completar la operación de facturación.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSavePago = async () => {
    setIsSubmitting(true);

    try {
      const response = await registrarAbonoEnNube(
        facturaSeleccionada,
        parseFloat(pagoForm.monto),
        pagoForm.metodo,
      );

      if (response?.success) {
        await recargarFacturas();
        setPagoForm({ monto: "", metodo: "Efectivo" });
        mostrarNotificacion(
          "Abono Exitoso",
          "Dinero ingresado y límite de crédito liberado.",
        );
      } else {
        mostrarNotificacion(
          "Error",
          response?.error || "No se pudo registrar el abono.",
          "error",
        );
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al registrar el pago.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmarEliminacion = (tipo, data) => {
    setItemAEliminar({ tipo, data });
    setModalActivo("confirmarEliminar");
  };

  const ejecutarEliminacion = async () => {
    try {
      if (itemAEliminar?.tipo === "factura") {
        const res = await eliminarFacturaEnNube(itemAEliminar.data.id);

        if (!res?.success) {
          mostrarNotificacion(
            "Acción pendiente",
            res?.error ||
              "La eliminación/anulación de facturas aún no está habilitada.",
            "error",
          );
          return;
        }

        mostrarNotificacion(
          "Factura Eliminada",
          "La factura fue procesada correctamente.",
        );
      } else if (itemAEliminar?.tipo === "abono") {
        const res = await eliminarAbonoEnNube(
          facturaSeleccionada.id,
          itemAEliminar.data.id_abono,
        );

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo anular el abono.",
            "error",
          );
          return;
        }

        await recargarFacturas();

        mostrarNotificacion(
          "Pago Anulado",
          "Abono revertido. La deuda regresó al saldo del cliente.",
        );
      }
    } catch (error) {
      console.error(error);
      mostrarNotificacion("Error", "Ocurrió un error inesperado.", "error");
    } finally {
      setItemAEliminar(null);
    }
  };

  const handleMontoPago = (e) => {
    const valor = parseFloat(e.target.value);
    const maximo = facturaSeleccionada?.saldo_pendiente || 0;
    if (valor > maximo) setPagoForm({ ...pagoForm, monto: maximo });
    else setPagoForm({ ...pagoForm, monto: e.target.value });
  };

  const enviarWhatsApp = () => {
    if (!datosWhatsapp.telefono) {
      mostrarNotificacion(
        "Teléfono requerido",
        "Ingresa un número de teléfono para continuar.",
        "error",
      );
      return;
    }

    const numeroLimpio = normalizarTelefonoMX(datosWhatsapp.telefono);

    if (!numeroLimpio.startsWith("52") || numeroLimpio.length !== 12) {
      mostrarNotificacion(
        "Teléfono inválido",
        "Revisa que el número mexicano tenga 10 dígitos.",
        "error",
      );
      return;
    }

    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(
      datosWhatsapp.mensaje,
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
    setModalActivo("opcionesFactura");
  };

  const BadgeEstatus = ({ estatus }) => {
    const configs = {
      Pagada: "bg-green-100 text-green-800 border-green-200",
      Pendiente: "bg-blue-100 text-blue-800 border-blue-200",
      Vencida: "bg-red-100 text-red-800 border-red-200",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${configs[estatus]}`}
      >
        {estatus}
      </span>
    );
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 relative pb-10 text-sm animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
            <FileText className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" />{" "}
            Facturación y Cobranza
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">
            Control integral de facturas emitidas, saldos pendientes y pagos
            con carga paginada y operaciones seguras.
          </p>
        </div>
        <button
          onClick={() => abrirFormulario("nuevaFactura")}
          className="w-full md:w-auto px-5 py-3 md:py-2.5 bg-[#0a192f] text-white font-bold text-sm rounded-xl md:rounded-lg active:bg-[#1a2b45] hover:bg-[#1a2b45] flex items-center justify-center shadow-md transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> Capturar Factura
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-white p-4 md:p-5 rounded-xl border border-blue-100 shadow-sm flex flex-col border-l-4 border-l-blue-500">
          <p className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center">
            <DollarSign className="h-4 w-4 md:h-4 md:w-4 mr-1 text-blue-500" />{" "}
            Deuda Activa en Calle
          </p>
          <h3 className="text-xl md:text-2xl font-black text-[#0a192f]">
            ${kpis.deuda_activa.toLocaleString("es-MX")}
          </h3>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-xl border border-red-100 shadow-sm flex flex-col border-l-4 border-l-red-500 bg-red-50/20">
          <p className="text-[10px] md:text-[11px] font-bold text-red-500 uppercase tracking-wider mb-1 flex items-center">
            <AlertTriangle className="h-4 w-4 md:h-4 md:w-4 mr-1" /> Saldo
            Vencido Urgente
          </p>
          <h3 className="text-xl md:text-2xl font-black text-red-600">
            ${kpis.monto_vencido.toLocaleString("es-MX")}
          </h3>
        </div>
        <div className="bg-white p-4 md:p-5 rounded-xl border border-green-100 shadow-sm flex flex-col border-l-4 border-l-green-500">
          <p className="text-[10px] md:text-[11px] font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center">
            <TrendingUp className="h-4 w-4 md:h-4 md:w-4 mr-1" /> Total
            Liquidado
          </p>
          <h3 className="text-xl md:text-2xl font-black text-green-700">
            ${(Number(kpis.total_liquidado) || 0).toLocaleString("es-MX")}
          </h3>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Folio exacto o nombre específico del cliente..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>
          <div className="flex overflow-x-auto hide-scrollbar-mobile w-full md:w-auto bg-gray-50 p-1.5 md:p-1 rounded-xl md:rounded-lg border border-gray-200 gap-1 md:gap-0 shrink-0">
            {["Todas", "Pendiente", "Vencida", "Pagada"].map((estatus) => (
              <button
                key={estatus}
                onClick={() => {
                  setFiltroEstatus(estatus);
                  }}
                className={`whitespace-nowrap px-4 py-2 md:py-1.5 text-xs font-bold rounded-lg md:rounded-md transition-colors flex-1 md:flex-none ${filtroEstatus === estatus ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {estatus}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-t border-gray-50 pt-4 md:pt-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <Calendar className="h-4 w-4 md:h-4 md:w-4 text-gray-400 hidden sm:block" />
            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase w-12 sm:w-auto">
              Desde:
            </span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => {
                setFechaInicio(e.target.value);
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-[10px] md:text-xs font-bold text-gray-500 uppercase w-12 sm:w-auto">
              Hasta:
            </span>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => {
                setFechaFin(e.target.value);
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          {(fechaInicio || fechaFin || busqueda || filtroEstatus !== "Todas") && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
            >
              <FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" />{" "}
              Limpiar Filtros
            </button>
          )}

          <button
            type="button"
            onClick={recargarFacturas}
            disabled={cargandoFacturas}
            className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
          >
            {cargandoFacturas ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-1.5" />
            )}
            Actualizar
          </button>
        </div>

        {(mensajeFacturas || errorFacturas) && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs font-medium ${
              errorFacturas
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
            }`}
          >
            {errorFacturas || mensajeFacturas}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] pb-20 custom-scrollbar w-full">
          <table className="w-full min-w-[1000px] text-left text-sm border-separate border-spacing-0">
            <thead className="bg-[#0a192f] text-white uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b border-gray-200 whitespace-nowrap">
                  Folio / Cliente
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 whitespace-nowrap">
                  Fechas
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Monto Total
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Monto Pagado
                </th>
                <th className="px-4 py-3 text-right border-b border-gray-200 whitespace-nowrap">
                  Saldo
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 whitespace-nowrap">
                  Estado
                </th>
                <th className="px-4 py-3 text-center border-b border-gray-200 whitespace-nowrap">
                  Gestión
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {cargandoFacturas ? (
                Array.from({ length: 6 }).map((_, indice) => (
                  <tr key={`skeleton-${indice}`} className="animate-pulse">
                    {Array.from({ length: 7 }).map((__, columna) => (
                      <td
                        key={`skeleton-${indice}-${columna}`}
                        className="px-4 py-4 bg-white"
                      >
                        <div className="h-4 bg-gray-100 rounded w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : errorFacturas ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-red-600 bg-red-50/30"
                  >
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 text-red-300" />
                    <p className="font-bold">No se pudieron cargar las facturas.</p>
                    <p className="text-xs mt-1">{errorFacturas}</p>
                  </td>
                </tr>
              ) : facturasPaginadas.length > 0 ? (
                facturasPaginadas.map((fac) => {
                  const montoTotal = Number(fac.monto_total) || 0;
                  const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                  const montoPagado = Math.max(0, montoTotal - saldoPendiente);

                  return (
                    <tr
                      key={fac.id}
                      className="hover:bg-blue-50/30 active:bg-blue-50/50 transition-colors group"
                    >
                      <td
                        className="px-4 py-4 md:py-3 bg-white cursor-pointer"
                        onClick={() => abrirMenuOpciones(fac)}
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-[#0a192f] text-base">
                            {fac.folio}
                          </span>
                          <span
                            className="text-gray-600 font-medium truncate max-w-[200px]"
                            title={fac.cliente}
                          >
                            {fac.cliente}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center text-xs text-gray-500 bg-white whitespace-nowrap">
                        <p>
                          Emisión:{" "}
                          <span className="font-mono">{fac.emision}</span>
                        </p>
                        <p className="mt-0.5 font-bold text-gray-700">
                          Vence:{" "}
                          <span className="font-mono">{fac.vencimiento}</span>
                        </p>
                        {fac.estatus === "Vencida" && (
                          <span className="block text-[11px] font-black text-red-500 mt-0.5">
                            (Hace {calcularDiasVencidos(fac.vencimiento)} días)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right font-semibold text-gray-700 bg-white whitespace-nowrap">
                        ${montoTotal.toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right font-semibold text-green-600 bg-white whitespace-nowrap">
                        ${montoPagado.toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right bg-white whitespace-nowrap">
                        <span
                          className={`text-base font-black ${
                            saldoPendiente > 0
                              ? fac.estatus === "Vencida"
                                ? "text-red-600"
                                : "text-[#0a192f]"
                              : "text-green-600"
                          }`}
                        >
                          ${saldoPendiente.toLocaleString("es-MX")}
                        </span>
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center bg-white">
                        <BadgeEstatus estatus={fac.estatus} />
                      </td>
                      <td className="px-4 py-4 md:py-3 text-center bg-white">
                        <button
                          onClick={() => abrirMenuOpciones(fac)}
                          className="p-3 md:p-1.5 text-gray-400 active:text-blue-600 hover:text-blue-600 active:bg-blue-50 hover:bg-blue-50 rounded-full md:rounded-lg transition-colors border border-transparent"
                          title="Ver Opciones"
                        >
                          <MoreVertical className="h-5 w-5 md:h-5 md:w-5 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-10 text-center text-gray-400 bg-white"
                  >
                    <FileText className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No se encontraron facturas con los filtros seleccionados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500">
            {cargandoFacturas
              ? "Consultando facturas..."
              : `Mostrando ${facturasPaginadas.length} factura(s) en esta página`}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={paginaAnterior}
              disabled={!hayAnterior || cargandoFacturas}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-black text-[#0a192f] min-w-20 text-center">
              Página {paginaActualFacturas}
            </span>

            <button
              type="button"
              onClick={siguientePagina}
              disabled={!haySiguiente || cargandoFacturas}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              aria-label="Página siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
          {modalActivo === "opcionesFactura" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in m-auto md:m-0 pb-6 md:pb-0 max-h-[90vh]">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm font-black text-[#0a192f]">
                  Gestión de Factura
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 active:text-red-500 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
              <div className="p-5 text-center border-b border-gray-100 bg-white">
                <p className="text-2xl font-black text-[#0a192f] font-mono">
                  {facturaSeleccionada?.folio}
                </p>
                <p className="text-sm font-bold text-gray-600 mt-1">
                  {facturaSeleccionada?.cliente}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Saldo Actual:{" "}
                  <span className="font-black text-[#0a192f] text-sm">
                    $
                    {facturaSeleccionada?.saldo_pendiente.toLocaleString(
                      "es-MX",
                    )}
                  </span>
                </p>
              </div>
              <div className="p-5 md:p-4 space-y-3 md:space-y-2 bg-gray-50/50 overflow-y-auto custom-scrollbar">
                {facturaSeleccionada?.saldo_pendiente > 0 && (
                  <button
                    onClick={() => abrirFormulario("nuevoPago")}
                    className="w-full p-3.5 md:p-3 bg-green-600 text-white active:bg-green-700 hover:bg-green-700 rounded-xl md:rounded-lg flex items-center justify-center font-black text-sm shadow-sm transition-colors"
                  >
                    <CreditCard className="h-4 w-4 md:h-4 md:w-4 mr-2" />{" "}
                    Registrar Pago / Abono
                  </button>
                )}
                <button
                  onClick={() => abrirFormulario("historialPagos")}
                  className="w-full p-3.5 md:p-3 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-xl md:rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <Clock className="h-4 w-4 md:h-4 md:w-4 mr-2" /> Historial de
                  Abonos ({facturaSeleccionada?.abonos?.length || 0})
                </button>
                <button
                  onClick={() => abrirFormulario("whatsapp")}
                  className="w-full p-3.5 md:p-3 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 rounded-xl md:rounded-lg flex items-center justify-center font-bold text-sm transition-colors"
                >
                  <MessageSquare className="h-4 w-4 md:h-4 md:w-4 mr-2 text-green-600" />{" "}
                  Enviar Aviso WhatsApp
                </button>
                <div
                  className={`mt-4 pt-4 border-t border-gray-200 grid gap-3 md:gap-2 ${
                    userRole === "SU" ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => abrirFormulario("editarFactura")}
                    className="p-3 md:p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs hover:bg-amber-100 active:bg-amber-100 transition-colors"
                  >
                    <Edit className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Editar
                  </button>
                  {userRole === "SU" && (
                    <button
                      disabled
                      title="La anulación financiera se implementará en un flujo separado"
                      className="p-3 md:p-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs cursor-not-allowed"
                    >
                      <Trash2 className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Anular
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {modalActivo === "whatsapp" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in max-h-[90vh] pb-6 md:pb-0 m-auto md:m-0">
              <div className="w-12 h-1.5 bg-white/40 rounded-full mx-auto mt-3 md:hidden shrink-0 z-10 absolute left-0 right-0"></div>
              <div className="pt-6 md:pt-4 pb-4 px-4 border-b border-gray-100 bg-[#25D366] text-white flex justify-between items-center shrink-0 relative">
                <h2 className="text-base font-bold flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" /> Gestión vía WhatsApp
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-green-100 hover:text-white transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>
              <div className="p-5 flex flex-col md:flex-row gap-5 overflow-y-auto custom-scrollbar">
                <div className="flex-1 space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase">
                      Cliente a Contactar
                    </label>
                    <p className="font-bold text-[#0a192f] text-sm">
                      {facturaSeleccionada?.cliente}
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Teléfono Destino
                    </label>
                    <input
                      type="text"
                      value={datosWhatsapp.telefono}
                      onChange={(e) =>
                        setDatosWhatsapp({
                          ...datosWhatsapp,
                          telefono: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="flex-[2] space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Plantilla de Abordaje
                    </label>
                    <select
                      value={datosWhatsapp.plantilla}
                      onChange={(e) =>
                        setDatosWhatsapp({
                          ...datosWhatsapp,
                          plantilla: e.target.value,
                          mensaje: generarMensajeWA(
                            e.target.value,
                            facturaSeleccionada,
                          ),
                        })
                      }
                      className="w-full px-3 py-2.5 md:py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white text-sm font-medium"
                    >
                      <option value="atrasado">Cobro: Saldo Vencido</option>
                      <option value="proximo">
                        Aviso: Vencimiento Próximo
                      </option>
                      <option value="manual">Mensaje Personalizado</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                      Vista Previa del Mensaje
                    </label>
                    <textarea
                      value={datosWhatsapp.mensaje}
                      onChange={(e) =>
                        setDatosWhatsapp({
                          ...datosWhatsapp,
                          mensaje: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#25D366] text-xs resize-none"
                      rows="6"
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2 text-xs font-bold text-gray-600 bg-white md:bg-transparent border border-gray-300 md:border-transparent hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Volver a Opciones
                </button>
                <button
                  onClick={enviarWhatsApp}
                  disabled={!datosWhatsapp.telefono}
                  className="w-full md:w-auto px-5 py-3.5 md:py-2 bg-[#25D366] hover:bg-[#1DA851] active:bg-[#1DA851] text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center transition-colors disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5 mr-2" /> Enviar WhatsApp
                </button>
              </div>
            </div>
          )}

          {(modalActivo === "nuevaFactura" ||
            modalActivo === "editarFactura") && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in max-h-[90vh] pb-6 md:pb-0 m-auto md:m-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 md:p-4 border-b border-gray-100 bg-[#0a192f] text-white flex justify-between items-center shrink-0">
                <h2 className="text-base md:text-lg font-bold flex items-center">
                  {modalActivo === "nuevaFactura" ? (
                    <>
                      <FileText className="h-5 w-5 mr-2 text-blue-400" />{" "}
                      Captura de Factura
                    </>
                  ) : (
                    <>
                      <Edit className="h-5 w-5 mr-2 text-amber-400" /> Editar
                      Factura
                    </>
                  )}
                </h2>
                <button
                  onClick={cerrarModal}
                  className="text-gray-400 hover:text-white transition-colors bg-white/10 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50/30 custom-scrollbar">
                <div className="space-y-4 md:space-y-6">
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-[#0a192f] mb-4 flex items-center border-b pb-2">
                      <Search className="h-4 w-4 mr-2 text-blue-500" />{" "}
                      Información Principal
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Nombre del Cliente
                        </label>
                        <Select
                          options={opcionesClientes}
                          value={
                            opcionesClientes.find(
                              (op) => op.value === invoiceForm.cliente_id,
                            ) || null
                          }
                          onChange={(selected) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              cliente_id: selected ? selected.cliente.id : "",
                              cliente: selected ? selected.cliente.nombre : "",
                              grupo: selected
                                ? normalizarGrupoFactura(selected.cliente.grupo)
                                : invoiceForm.grupo,
                            })
                          }
                          placeholder="Buscar cliente..."
                          isClearable
                          noOptionsMessage={() => "No se encontró el cliente"}
                          styles={{
                            control: (base, state) => ({
                              ...base,
                              borderRadius: "0.5rem",
                              borderColor: state.isFocused
                                ? "#ffd700"
                                : "#d1d5db",
                              boxShadow: state.isFocused
                                ? "0 0 0 2px rgba(255, 215, 0, 0.3)"
                                : "none",
                              backgroundColor: state.isFocused
                                ? "#ffffff"
                                : "#f9fafb",
                              padding: "2px",
                              minHeight: "42px",
                              cursor: "text",
                            }),
                            menu: (base) => ({
                              ...base,
                              zIndex: 9999,
                            }),
                          }}
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Grupo
                        </label>
                        <select
                          value={invoiceForm.grupo}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              grupo: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] bg-gray-50 focus:bg-white font-medium text-sm"
                        >
                          {GRUPOS_FACTURA.map((grupo) => (
                            <option key={grupo} value={grupo}>
                              {grupo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          No. de Factura
                        </label>
                        <input
                          type="text"
                          value={invoiceForm.folio}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              folio: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-mono text-sm uppercase bg-gray-50 focus:bg-white"
                          placeholder="Ej. F-1035"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Monto Total
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={invoiceForm.monto_total}
                            onChange={(e) =>
                              setInvoiceForm({
                                ...invoiceForm,
                                monto_total: e.target.value,
                              })
                            }
                            className="w-full pl-9 pr-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-bold text-[#0a192f] bg-gray-50 focus:bg-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Moneda
                        </label>
                        <input
                          type="text"
                          value="MXN"
                          readOnly
                          className="w-full px-3 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg bg-gray-100 text-gray-500 font-bold cursor-not-allowed text-center text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-[#0a192f] mb-4 flex items-center border-b pb-2">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500" /> Fechas
                      de la Factura
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Fecha de Emisión
                        </label>
                        <input
                          type="date"
                          value={invoiceForm.emision}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              emision: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                          Fecha de Vencimiento
                        </label>
                        <input
                          type="date"
                          value={invoiceForm.vencimiento}
                          onChange={(e) =>
                            setInvoiceForm({
                              ...invoiceForm,
                              vencimiento: e.target.value,
                            })
                          }
                          className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm bg-gray-50 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-xs md:text-sm font-black text-[#0a192f] mb-4 flex items-center border-b pb-2">
                      <FileText className="h-4 w-4 mr-2 text-blue-500" /> Extras
                    </h3>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                        Observaciones
                      </label>
                      <textarea
                        value={invoiceForm.observaciones}
                        onChange={(e) =>
                          setInvoiceForm({
                            ...invoiceForm,
                            observaciones: e.target.value,
                          })
                        }
                        className="w-full px-3 py-3 md:py-2 border border-gray-300 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ffd700] text-sm bg-gray-50 focus:bg-white resize-none"
                        rows="3"
                        placeholder="Escribe aquí notas adicionales..."
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 md:p-4 border-t border-gray-200 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 shrink-0 md:rounded-b-xl">
                <button
                  onClick={cerrarModal}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2.5 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFactura}
                  disabled={isSubmitting}
                  className="w-full md:w-auto px-6 py-3.5 md:py-2.5 bg-[#ffd700] text-[#0a192f] text-sm md:text-xs font-black rounded-xl md:rounded-lg shadow-sm active:bg-[#e6c200] transition-colors flex items-center justify-center disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Guardando..."
                    : modalActivo === "editarFactura"
                      ? "Guardar Cambios"
                      : "Guardar Factura"}
                </button>
              </div>
            </div>
          )}

          {modalActivo === "confirmarEliminar" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto md:mt-10 pb-6 md:pb-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-6 text-center space-y-4">
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f]">
                    {itemAEliminar?.tipo === "factura"
                      ? "¿Eliminar Factura?"
                      : "¿Eliminar Abono?"}
                  </h3>
                  <p className="text-sm md:text-sm text-gray-600 mt-2">
                    {itemAEliminar?.tipo === "factura" ? (
                      <>
                        Estás a punto de eliminar permanentemente la factura{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.folio}
                        </span>{" "}
                        de{" "}
                        <span className="font-bold text-[#0a192f]">
                          {itemAEliminar.data?.cliente}
                        </span>
                        .
                      </>
                    ) : (
                      <>
                        Estás a punto de eliminar un abono de{" "}
                        <span className="font-bold text-[#0a192f]">
                          ${itemAEliminar.data?.monto?.toLocaleString("es-MX")}
                        </span>{" "}
                        de la factura{" "}
                        <span className="font-bold text-[#0a192f]">
                          {facturaSeleccionada?.folio}
                        </span>
                        .
                      </>
                    )}
                  </p>
                </div>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-700 font-medium text-left">
                  <p>
                    <strong>Atención:</strong>{" "}
                    {itemAEliminar?.tipo === "factura"
                      ? `Esta acción borrará la factura y todo su historial de abonos.`
                      : "El saldo de la factura se recalculará automáticamente."}{" "}
                    Esta acción es irreversible.
                  </p>
                </div>
              </div>
              <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 md:rounded-b-xl">
                <button
                  onClick={() => {
                    if (itemAEliminar?.tipo === "abono")
                      setModalActivo("historialPagos");
                    else setModalActivo("opcionesFactura");
                  }}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={ejecutarEliminacion}
                  className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-white bg-red-600 active:bg-red-700 rounded-xl md:rounded-lg shadow-sm flex items-center justify-center transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-1.5 md:mr-1" /> Sí, Eliminar
                </button>
              </div>
            </div>
          )}

          {modalActivo === "nuevoPago" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in m-auto md:m-0 pb-6 md:pb-0 max-h-[90vh]">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 border-b border-gray-100 bg-white md:bg-green-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-green-800 flex items-center">
                  <CreditCard className="h-5 w-5 md:h-5 md:w-5 mr-2" /> Ingreso
                  de Pago
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
              <div className="p-6 md:p-6 space-y-5 md:space-y-4 overflow-y-auto custom-scrollbar">
                <div className="bg-gray-50 p-4 md:p-3 rounded-xl md:rounded-lg text-center border border-gray-200 flex flex-col items-center">
                  <p className="text-[10px] md:text-xs text-gray-500 uppercase font-bold">
                    Saldo Pendiente (Máximo Permitido)
                  </p>
                  <p className="text-3xl md:text-2xl font-black text-[#0a192f] mt-1">
                    $
                    {facturaSeleccionada?.saldo_pendiente.toLocaleString(
                      "es-MX",
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                    Monto a abonar ($)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={pagoForm.monto}
                      onChange={handleMontoPago}
                      className="w-full pl-10 pr-3 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold text-xl md:text-lg bg-gray-50 focus:bg-white"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-[9px] text-gray-400 mt-1">
                    El monto no puede superar la deuda actual.
                  </p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">
                    Método de Pago
                  </label>
                  <select
                    value={pagoForm.metodo}
                    onChange={(e) =>
                      setPagoForm({ ...pagoForm, metodo: e.target.value })
                    }
                    className="w-full px-4 py-3 md:py-2 border border-gray-200 rounded-xl md:rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-gray-50 focus:bg-white font-bold text-sm"
                  >
                    <option>Efectivo</option>
                    <option>Transferencia</option>
                    <option>Cheque</option>
                  </select>
                </div>
              </div>
              <div className="p-4 md:p-4 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSavePago}
                  disabled={
                    !pagoForm.monto ||
                    parseFloat(pagoForm.monto) <= 0 ||
                    isSubmitting
                  }
                  className="w-full md:w-auto px-6 py-3.5 md:py-2 bg-green-600 text-white font-black text-sm md:text-sm rounded-xl md:rounded-lg shadow-sm active:bg-green-700 disabled:opacity-50 flex items-center justify-center transition-colors"
                >
                  Guardar Abono
                </button>
              </div>
            </div>
          )}

          {modalActivo === "historialPagos" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in m-auto md:m-0 pb-6 md:pb-0 max-h-[90vh]">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-4 border-b border-gray-100 bg-white md:bg-blue-50 flex justify-between items-center shrink-0">
                <h2 className="text-sm md:text-base font-black text-blue-800 flex items-center">
                  <Clock className="h-5 w-5 md:h-5 md:w-5 mr-2" /> Historial de
                  Abonos
                </h2>
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="text-gray-400 active:text-gray-700 bg-gray-50 md:bg-transparent rounded-full p-1 md:p-0"
                >
                  <XCircle className="h-6 w-6 md:h-5 md:w-5" />
                </button>
              </div>
              <div className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                {facturaSeleccionada?.abonos?.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {facturaSeleccionada.abonos.map((abono) => (
                      <div
                        key={abono.id_abono}
                        className="p-5 md:p-4 flex justify-between items-center active:bg-gray-50 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex flex-col flex-1 pr-4">
                          <div className="flex justify-between items-start mb-1.5 md:mb-1">
                            <p className="font-black text-[#0a192f] text-lg md:text-base">
                              ${abono.monto.toLocaleString("es-MX")}{" "}
                              <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase ml-1">
                                Abonado
                              </span>
                            </p>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-500 uppercase">
                              {abono.fecha}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 md:gap-y-1 mt-1 text-[11px] md:text-[11px]">
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Cajero:
                              </span>{" "}
                              <span className="font-bold">
                                {abono.registrado_por}
                              </span>
                            </p>
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Método:
                              </span>{" "}
                              <span className="font-bold">{abono.metodo}</span>
                            </p>
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Saldo Ant:
                              </span>{" "}
                              <span className="font-bold">
                                ${abono.saldo_anterior?.toLocaleString("es-MX")}
                              </span>
                            </p>
                            <p className="text-gray-600">
                              <span className="font-black text-gray-400 uppercase tracking-wider">
                                Restante:
                              </span>{" "}
                              <span className="font-bold">
                                ${abono.saldo_restante?.toLocaleString("es-MX")}
                              </span>
                            </p>
                          </div>
                        </div>
                        {userRole === "SU" && (
                          <button
                            onClick={() => confirmarEliminacion("abono", abono)}
                            className="p-3 md:p-2 shrink-0 text-red-400 active:text-red-600 hover:text-red-600 active:bg-red-50 hover:bg-red-50 rounded-xl md:rounded-lg transition-colors border border-transparent active:border-red-100 hover:border-red-100"
                          >
                            <Trash2 className="h-4 w-4 md:h-4 md:w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 text-center text-gray-400">
                    <AlertTriangle className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-bold uppercase tracking-wider">
                      No se han registrado abonos a esta factura.
                    </p>
                  </div>
                )}
              </div>
              <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex justify-end shrink-0 md:rounded-b-xl">
                <button
                  onClick={() => setModalActivo("opcionesFactura")}
                  className="w-full px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {modalActivo === "notificacion" && (
            <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in mt-auto mb-auto pb-6 md:pb-0">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>
              <div className="p-6 md:p-6 text-center">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ring-4 ${notificacion.tipo === "error" ? "bg-red-100 ring-red-50 text-red-600" : "bg-green-100 ring-green-50 text-green-600"}`}
                >
                  {notificacion.tipo === "error" ? (
                    <XCircle className="h-8 w-8" />
                  ) : (
                    <Check className="h-8 w-8" />
                  )}
                </div>
                <h3 className="text-xl md:text-lg font-black text-[#0a192f] mb-2">
                  {notificacion.titulo}
                </h3>
                <p className="text-sm md:text-xs text-gray-600 leading-relaxed font-medium">
                  {notificacion.descripcion}
                </p>
                <button
                  onClick={cerrarModal}
                  className={`w-full mt-6 px-5 py-3.5 md:py-2.5 text-sm md:text-sm font-black text-[#0a192f] rounded-xl md:rounded-lg transition-colors shadow-sm ${notificacion.tipo === "error" ? "bg-red-50 hover:bg-red-100 border border-red-200" : "bg-[#ffd700] hover:bg-[#e6c200]"}`}
                >
                  Aceptar y Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```
