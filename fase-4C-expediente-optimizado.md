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
- Only files matching these patterns are included: src/pages/ExpedienteCliente.jsx, src/context/GlobalProvider.jsx, src/services/facturasService.js, src/services/facturasConsultaService.js, src/hooks/useFacturasPaginadas.js, src/utils/normalizarFactura.js, src/utils/fechas.js, firestore.rules, firestore.indexes.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
firestore.indexes.json
firestore.rules
src/context/GlobalProvider.jsx
src/hooks/useFacturasPaginadas.js
src/pages/ExpedienteCliente.jsx
src/services/facturasConsultaService.js
src/services/facturasService.js
src/utils/fechas.js
src/utils/normalizarFactura.js
```

# Files

## File: src/hooks/useFacturasPaginadas.js
```javascript
import { useCallback, useEffect, useRef, useState } from "react";

import { facturasConsultaService } from "../services/facturasConsultaService";

export const useFacturasPaginadas = ({
  pageSize = 25,
  busqueda = "",
  clienteId = "",
  filtroEstatus = "Todas",
  fechaInicio = "",
  fechaFin = "",
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
        clienteId,
        filtroEstatus,
        fechaInicio,
        fechaFin,
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
      clienteId,
      filtroEstatus,
      fechaInicio,
      fechaFin,
    ],
  );

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      ejecutarConsulta({ paginaDestino: 1, cursoresDestino: [null] });
    }, 200);

    return () => window.clearTimeout(temporizador);
  }, [ejecutarConsulta]);

  const siguientePagina = useCallback(async () => {
    if (
      cargando ||
      !haySiguiente ||
      !cursorSiguiente ||
      facturas.length === 0
    ) {
      return false;
    }

    const nuevosCursores = [
      ...cursores.slice(0, pagina),
      cursorSiguiente,
    ];

    await ejecutarConsulta({
      paginaDestino: pagina + 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
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
    if (cargando || pagina <= 1) return false;

    const nuevosCursores = cursores.slice(0, pagina - 1);

    await ejecutarConsulta({
      paginaDestino: pagina - 1,
      cursoresDestino: nuevosCursores,
    });

    return true;
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
const TAMANO_LOTE_LOCAL = 50;
const MAX_DOCUMENTOS_ESCANEADOS = 300;

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

const inicioHoyTimestamp = () => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Timestamp.fromDate(hoy);
};

const normalizarFolioBusqueda = (valor = "") =>
  valor.toString().replace(/\s+/g, " ").trim().toUpperCase();

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

const crearRestriccionesLocales = ({
  clienteId,
  prefijoFolio,
  fechaInicio,
  fechaFin,
  cursor,
  limiteLote,
}) => {
  const restricciones = [];

  if (clienteId) {
    restricciones.push(where("cliente_id", "==", clienteId));
    restricciones.push(orderBy("emision", "desc"));
  } else if (prefijoFolio) {
    restricciones.push(where("folio", ">=", prefijoFolio));
    restricciones.push(where("folio", "<=", `${prefijoFolio}\uf8ff`));
    restricciones.push(orderBy("folio", "asc"));
  } else {
    const desde = fechaInicioTimestamp(fechaInicio);
    const hasta = fechaFinTimestamp(fechaFin);

    if (desde) {
      restricciones.push(where("emision", ">=", desde));
    }

    if (hasta) {
      restricciones.push(where("emision", "<=", hasta));
    }

    restricciones.push(orderBy("emision", "desc"));
  }

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(limiteLote));
  return restricciones;
};

const consultarConFiltroLocal = async ({
  pageSize,
  cursor,
  clienteId,
  prefijoFolio,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const resultados = [];
  let cursorLote = cursor;
  let cursorSiguiente = null;
  let documentosEscaneados = 0;
  let quedanDocumentos = true;
  let limiteAlcanzado = false;

  while (
    quedanDocumentos &&
    resultados.length <= pageSize &&
    documentosEscaneados < MAX_DOCUMENTOS_ESCANEADOS
  ) {
    const restricciones = crearRestriccionesLocales({
      clienteId,
      prefijoFolio,
      fechaInicio,
      fechaFin,
      cursor: cursorLote,
      limiteLote: TAMANO_LOTE_LOCAL,
    });

    const consulta = query(
      collection(db, FACTURAS_COLLECTION),
      ...restricciones,
    );

    const snapshot = await getDocs(consulta);

    if (snapshot.empty) {
      break;
    }

    for (const documento of snapshot.docs) {
      documentosEscaneados += 1;
      cursorLote = documento;

      const factura = normalizarFacturaSnapshot(documento);
      const coincide = coincideFiltrosLocales(factura, {
        filtroEstatus,
        fechaInicio,
        fechaFin,
      });

      if (coincide) {
        resultados.push({ factura, documento });

        if (resultados.length === pageSize) {
          cursorSiguiente = documento;
        }

        if (resultados.length > pageSize) {
          break;
        }
      }

      if (documentosEscaneados >= MAX_DOCUMENTOS_ESCANEADOS) {
        limiteAlcanzado = true;
        break;
      }
    }

    if (resultados.length > pageSize) {
      break;
    }

    if (snapshot.docs.length < TAMANO_LOTE_LOCAL) {
      quedanDocumentos = false;
    }
  }

  const haySiguiente =
    resultados.length > pageSize ||
    (limiteAlcanzado && Boolean(cursorLote));

  if (!cursorSiguiente && haySiguiente) {
    cursorSiguiente = cursorLote;
  }

  const facturas = resultados
    .slice(0, pageSize)
    .map((resultado) => resultado.factura);

  let mensaje = "";

  if (prefijoFolio) {
    mensaje = facturas.length
      ? `Mostrando folios que comienzan con “${prefijoFolio}”.`
      : `No se encontraron folios que comiencen con “${prefijoFolio}”.`;
  } else if (clienteId) {
    mensaje = facturas.length
      ? "Mostrando las facturas del cliente seleccionado."
      : "El cliente seleccionado no tiene facturas con estos filtros.";
  }

  if (limiteAlcanzado) {
    mensaje = `${mensaje ? `${mensaje} ` : ""}La búsqueda es muy amplia; escribe más caracteres para reducir resultados.`;
  }

  return {
    facturas,
    cursorSiguiente,
    haySiguiente,
    mensaje,
  };
};

const crearRestriccionesEstado = ({
  filtroEstatus,
  fechaInicio,
  fechaFin,
  cursor,
  pageSize,
}) => {
  const restricciones = [];
  const hoy = inicioHoyTimestamp();
  const desde = fechaInicioTimestamp(fechaInicio);
  const hasta = fechaFinTimestamp(fechaFin);
  const usaRangoEmision = Boolean(desde || hasta);

  if (desde) {
    restricciones.push(where("emision", ">=", desde));
  }

  if (hasta) {
    restricciones.push(where("emision", "<=", hasta));
  }

  if (filtroEstatus === "Vencida") {
    restricciones.push(where("vencimiento", "<", hoy));
    restricciones.push(where("saldo_pendiente", ">", 0));

    if (usaRangoEmision) {
      restricciones.push(orderBy("emision", "desc"));
    }

    restricciones.push(orderBy("vencimiento", "desc"));
    restricciones.push(orderBy("saldo_pendiente", "desc"));
  } else if (filtroEstatus === "Pendiente") {
    restricciones.push(where("vencimiento", ">=", hoy));
    restricciones.push(where("saldo_pendiente", ">", 0));

    if (usaRangoEmision) {
      restricciones.push(orderBy("emision", "desc"));
    }

    restricciones.push(orderBy("vencimiento", "asc"));
    restricciones.push(orderBy("saldo_pendiente", "desc"));
  } else if (filtroEstatus === "Pagada") {
    restricciones.push(where("saldo_pendiente", "==", 0));
    restricciones.push(orderBy("emision", "desc"));
  } else {
    restricciones.push(orderBy("emision", "desc"));
  }

  if (cursor) {
    restricciones.push(startAfter(cursor));
  }

  restricciones.push(limit(pageSize + 1));
  return restricciones;
};

const consultarEstadoGlobal = async ({
  pageSize,
  cursor,
  filtroEstatus,
  fechaInicio,
  fechaFin,
}) => {
  const restricciones = crearRestriccionesEstado({
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

  return {
    facturas: documentosVisibles.map(normalizarFacturaSnapshot),
    cursorSiguiente:
      documentosVisibles[documentosVisibles.length - 1] || null,
    haySiguiente: snapshot.docs.length > pageSize,
    mensaje: "",
  };
};

export const facturasConsultaService = {
  consultarPagina: async ({
    pageSize = 25,
    cursor = null,
    busqueda = "",
    clienteId = "",
    filtroEstatus = "Todas",
    fechaInicio = "",
    fechaFin = "",
  } = {}) => {
    try {
      const prefijoFolio = clienteId
        ? ""
        : normalizarFolioBusqueda(busqueda);

      const requiereFiltroLocal = Boolean(clienteId || prefijoFolio);

      const resultado = requiereFiltroLocal
        ? await consultarConFiltroLocal({
            pageSize,
            cursor,
            clienteId,
            prefijoFolio,
            filtroEstatus,
            fechaInicio,
            fechaFin,
          })
        : await consultarEstadoGlobal({
            pageSize,
            cursor,
            filtroEstatus,
            fechaInicio,
            fechaFin,
          });

      return {
        success: true,
        ...resultado,
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
            ? "Firestore necesita un índice para esta combinación. Publica los índices nuevos de la Fase 4A.1 o abre el enlace de creación mostrado en la consola."
            : error?.message || "No se pudieron consultar las facturas.",
      };
    }
  },
};
```

## File: src/utils/fechas.js
```javascript
export const calcularDiasVencidos = (fechaString) => {
    if (!fechaString) return 0;
    
    let dia, mes, anio;

    // Traductor Universal: Entiende YYYY-MM-DD o DD/MM/YYYY
    if (fechaString.includes('-')) {
        [anio, mes, dia] = fechaString.split('-');
    } else if (fechaString.includes('/')) {
        [dia, mes, anio] = fechaString.split('/');
    } else {
        return 0; // Formato desconocido
    }

    const fechaVencimiento = new Date(anio, mes - 1, dia);
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Normalizamos a la medianoche
    
    const diffTime = hoy - fechaVencimiento;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
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
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "saldo_pendiente",
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
          "fieldPath": "vencimiento",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "vencimiento",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "vencimiento",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "facturas",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "emision",
          "order": "DESCENDING"
        },
        {
          "fieldPath": "vencimiento",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "saldo_pendiente",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## File: firestore.rules
```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function userPath() {
      return /databases/$(database)/documents/usuarios/$(request.auth.uid);
    }

    function userExists() {
      return isAuthenticated() && exists(userPath());
    }

    function userData() {
      return get(userPath()).data;
    }

    function isStaff() {
      return userExists()
        && userData().activo == true
        && userData().rol in ['SU', 'ADMIN'];
    }

    function isSU() {
      return isStaff() && userData().rol == 'SU';
    }

    function isADMIN() {
      return isStaff() && userData().rol == 'ADMIN';
    }

    function actorValido() {
      return isAuthenticated()
        && request.resource.data.actor_uid is string
        && request.resource.data.actor_uid == request.auth.uid;
    }

    function auditoriaEdicionFacturaValida(facturaId) {
      let auditId = request.resource.data.ultima_edicion_audit_id;
      let auditPath = /databases/$(database)/documents/actividad/$(auditId);

      return auditId is string
        && auditId != ''
        && request.resource.data.ultima_edicion_actor_uid
          == request.auth.uid
        && request.resource.data.ultima_edicion_at is timestamp
        && existsAfter(auditPath)
        && getAfter(auditPath).data.actor_uid == request.auth.uid
        && getAfter(auditPath).data.modulo == 'Facturación'
        && getAfter(auditPath).data.tipo == 'Edición de Factura'
        && getAfter(auditPath).data.factura_id == facturaId;
    }

    function clientesEdicionFacturaValidos() {
      let clienteAnteriorId = resource.data.cliente_id;
      let clienteNuevoId = request.resource.data.cliente_id;
      let clienteAnteriorPath = /databases/$(database)/documents/clientes/$(clienteAnteriorId);
      let clienteNuevoPath = /databases/$(database)/documents/clientes/$(clienteNuevoId);
      let saldoAnterior = resource.data.saldo_pendiente;
      let saldoNuevo = request.resource.data.saldo_pendiente;

      return exists(clienteAnteriorPath)
        && exists(clienteNuevoPath)
        && get(clienteNuevoPath).data.activo == true
        && (
          (
            clienteAnteriorId == clienteNuevoId
            && getAfter(clienteAnteriorPath).data.deuda_actual
              == get(clienteAnteriorPath).data.deuda_actual
                + saldoNuevo - saldoAnterior
            && getAfter(clienteAnteriorPath).data.credito_disponible
              == get(clienteAnteriorPath).data.credito_disponible
                - saldoNuevo + saldoAnterior
          )
          ||
          (
            clienteAnteriorId != clienteNuevoId
            && getAfter(clienteAnteriorPath).data.deuda_actual
              == get(clienteAnteriorPath).data.deuda_actual
                - saldoAnterior
            && getAfter(clienteAnteriorPath).data.credito_disponible
              == get(clienteAnteriorPath).data.credito_disponible
                + saldoAnterior
            && getAfter(clienteNuevoPath).data.deuda_actual
              == get(clienteNuevoPath).data.deuda_actual
                + saldoNuevo
            && getAfter(clienteNuevoPath).data.credito_disponible
              == get(clienteNuevoPath).data.credito_disponible
                - saldoNuevo
          )
        );
    }

    match /usuarios/{userId} {
      allow read: if (
        isAuthenticated() && request.auth.uid == userId
      ) || isSU();

      allow create: if isSU()
        && userId != request.auth.uid
        && request.resource.data.nombre is string
        && request.resource.data.correo is string
        && request.resource.data.rol == 'ADMIN'
        && request.resource.data.activo is bool
        && request.resource.data.activo == true;

      allow update: if isSU()
        && userId != request.auth.uid
        && resource.data.rol == 'ADMIN'
        && request.resource.data.rol == resource.data.rol
        && request.resource.data.activo is bool
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'activo',
            'fecha_actualizacion',
            'updatedAt'
          ]);

      allow delete: if false;
    }

    match /clientes/{clienteId} {
      allow read: if isStaff();

      allow create: if isSU()
        && request.resource.data.cliente_id == clienteId
        && request.resource.data.limite_credito is number
        && request.resource.data.limite_credito >= 0
        && request.resource.data.credito_disponible
          == request.resource.data.limite_credito
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual == 0
        && request.resource.data.activo == true
        && request.resource.data.estatus == 'Activo';

      allow create: if isADMIN()
        && request.resource.data.cliente_id == clienteId
        && request.resource.data.limite_credito is number
        && request.resource.data.limite_credito == 0
        && request.resource.data.credito_disponible is number
        && request.resource.data.credito_disponible == 0
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual == 0
        && request.resource.data.activo == true
        && request.resource.data.estatus == 'Activo';

      allow update: if isStaff()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'nombre',
            'numero_cliente',
            'rfc',
            'telefono',
            'correo',
            'direccion',
            'grupo',
            'segmentacion',
            'dias_mensaje',
            'pagare_monto',
            'pagare_fecha',
            'notas_internas',
            'updatedAt'
          ]);

      allow update: if isStaff()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'deuda_actual',
            'credito_disponible',
            'monto_ultimo_pago',
            'fecha_ultimo_pago',
            'metodo_ultimo_pago',
            'ultimo_deposito_monto',
            'ultimo_deposito_fecha',
            'ultimo_deposito_metodo',
            'updatedAt'
          ])
        && request.resource.data.limite_credito
          == resource.data.limite_credito
        && request.resource.data.activo
          == resource.data.activo
        && request.resource.data.deuda_actual is number
        && request.resource.data.deuda_actual >= 0
        && request.resource.data.credito_disponible is number
        && request.resource.data.credito_disponible >= 0
        && request.resource.data.credito_disponible
          <= request.resource.data.limite_credito;

      allow update: if isSU()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'limite_credito',
            'credito_disponible',
            'updatedAt'
          ])
        && request.resource.data.limite_credito is number
        && request.resource.data.limite_credito >= 0
        && request.resource.data.credito_disponible is number
        && request.resource.data.credito_disponible >= 0
        && request.resource.data.credito_disponible
          <= request.resource.data.limite_credito
        && request.resource.data.deuda_actual
          == resource.data.deuda_actual
        && request.resource.data.activo
          == resource.data.activo;

      allow update: if isSU()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'activo',
            'estatus',
            'updatedAt'
          ])
        && request.resource.data.activo == false
        && request.resource.data.estatus == 'Inactivo';

      allow delete: if false;
    }

    match /facturas/{facturaId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && request.resource.data.id == facturaId
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente is string
        && request.resource.data.folio is string
        && request.resource.data.monto_total is number
        && request.resource.data.monto_total > 0
        && request.resource.data.monto_pagado is number
        && request.resource.data.monto_pagado == 0
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente
          == request.resource.data.monto_total
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.abonos is list
        && request.resource.data.abonos.size() == 0
        && request.resource.data.emision is timestamp
        && request.resource.data.vencimiento is timestamp
        && request.resource.data.vencimiento
          >= request.resource.data.emision
        && request.resource.data.createdAt is timestamp;

      // Actualizaciones financieras provocadas por abonos o reversión de abonos.
      allow update: if isStaff()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'saldo_pendiente',
            'monto_pagado',
            'estatus',
            'abonos',
            'ultima_accion',
            'updatedAt'
          ])
        && request.resource.data.id == resource.data.id
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.monto_total
          == resource.data.monto_total
        && request.resource.data.cliente_id
          == resource.data.cliente_id
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente >= 0
        && request.resource.data.saldo_pendiente
          <= resource.data.monto_total
        && request.resource.data.monto_pagado is number
        && request.resource.data.monto_pagado >= 0
        && request.resource.data.monto_pagado
          <= resource.data.monto_total
        && request.resource.data.saldo_pendiente
          + request.resource.data.monto_pagado
          == resource.data.monto_total
        && request.resource.data.abonos is list
        && request.resource.data.estatus in [
          'Pendiente',
          'Vencida',
          'Reprogramado',
          'Pagada'
        ]
        && (
          (
            request.resource.data.saldo_pendiente == 0
            && request.resource.data.estatus == 'Pagada'
          ) || (
            request.resource.data.saldo_pendiente > 0
            && request.resource.data.estatus != 'Pagada'
          )
        );

      // Edición general disponible para ADMIN y SU, siempre acompañada
      // por la actualización financiera de clientes y una auditoría inmutable.
      allow update: if isStaff()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'cliente_id',
            'cliente',
            'grupo',
            'folio',
            'monto_total',
            'moneda',
            'emision',
            'vencimiento',
            'observaciones',
            'monto_pagado',
            'saldo_pendiente',
            'estatus',
            'ultima_edicion_audit_id',
            'ultima_edicion_actor_uid',
            'ultima_edicion_at',
            'updatedAt'
          ])
        && request.resource.data.id == resource.data.id
        && request.resource.data.createdAt == resource.data.createdAt
        && request.resource.data.abonos == resource.data.abonos
        && request.resource.data.monto_pagado
          == resource.data.monto_pagado
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente
          == get(
            /databases/$(database)/documents/clientes/$(request.resource.data.cliente_id)
          ).data.nombre
        && request.resource.data.folio is string
        && request.resource.data.folio != ''
        && request.resource.data.monto_total is number
        && request.resource.data.monto_total > 0
        && request.resource.data.monto_total
          >= request.resource.data.monto_pagado
        && request.resource.data.saldo_pendiente is number
        && request.resource.data.saldo_pendiente
          == request.resource.data.monto_total
            - request.resource.data.monto_pagado
        && request.resource.data.emision is timestamp
        && request.resource.data.vencimiento is timestamp
        && request.resource.data.vencimiento
          >= request.resource.data.emision
        && request.resource.data.estatus in [
          'Pendiente',
          'Vencida',
          'Pagada'
        ]
        && (
          (
            request.resource.data.saldo_pendiente == 0
            && request.resource.data.estatus == 'Pagada'
          ) || (
            request.resource.data.saldo_pendiente > 0
            && request.resource.data.estatus != 'Pagada'
          )
        )
        && clientesEdicionFacturaValidos()
        && auditoriaEdicionFacturaValida(facturaId);

      allow delete: if isSU();
    }

    match /solicitudes/{solicitudId} {
      allow read: if isStaff();

      allow create: if isADMIN()
        && request.resource.data.keys().hasOnly([
          'id',
          'cliente_id',
          'cliente',
          'monto_incremento',
          'limite_anterior',
          'nuevo_limite_propuesto',
          'motivo',
          'estatus',
          'solicitado_por_uid',
          'solicitado_por_nombre',
          'createdAt'
        ])
        && request.resource.data.id == solicitudId
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente is string
        && request.resource.data.monto_incremento is number
        && request.resource.data.monto_incremento > 0
        && request.resource.data.limite_anterior is number
        && request.resource.data.limite_anterior >= 0
        && request.resource.data.nuevo_limite_propuesto is number
        && request.resource.data.nuevo_limite_propuesto
          == request.resource.data.limite_anterior
            + request.resource.data.monto_incremento
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.solicitado_por_uid
          == request.auth.uid
        && request.resource.data.solicitado_por_nombre is string
        && request.resource.data.createdAt is timestamp;

      allow update: if isSU()
        && resource.data.estatus == 'Pendiente'
        && request.resource.data.estatus in [
          'Autorizado',
          'Rechazado'
        ]
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'estatus',
            'resolvedAt',
            'resolvedBy',
            'resolvedByUid'
          ])
        && request.resource.data.resolvedAt is timestamp
        && request.resource.data.resolvedBy is string
        && request.resource.data.resolvedByUid
          == request.auth.uid;

      allow delete: if false;
    }

    match /compromisos/{compromisoId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && request.resource.data.keys().hasOnly([
          'tipo_vinculo',
          'titulo',
          'motivo',
          'cliente_id',
          'cliente_nombre',
          'factura_id',
          'folio_factura',
          'tipo_evento',
          'monto',
          'telefono',
          'fecha_compromiso',
          'mes_anio',
          'estatus',
          'ultima_accion',
          'historial_acciones',
          'creado_por',
          'creado_por_uid',
          'createdAt',
          'updatedAt'
        ])
        && request.resource.data.tipo_vinculo in [
          'GENERAL',
          'CLIENTE',
          'FACTURA'
        ]
        && request.resource.data.titulo is string
        && request.resource.data.titulo != ''
        && request.resource.data.motivo is string
        && request.resource.data.motivo != ''
        && request.resource.data.tipo_evento in [
          'Recordatorio',
          'Seguimiento',
          'Promesa'
        ]
        && request.resource.data.cliente_nombre is string
        && request.resource.data.folio_factura is string
        && request.resource.data.telefono is string
        && request.resource.data.monto is number
        && request.resource.data.monto >= 0
        && request.resource.data.fecha_compromiso is timestamp
        && request.resource.data.mes_anio is string
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.ultima_accion is map
        && request.resource.data.historial_acciones is list
        && request.resource.data.creado_por is string
        && request.resource.data.creado_por_uid == request.auth.uid
        && request.resource.data.createdAt is timestamp
        && request.resource.data.updatedAt is timestamp
        && (
          (
            request.resource.data.tipo_vinculo == 'GENERAL'
            && request.resource.data.cliente_id == null
            && request.resource.data.factura_id == null
            && request.resource.data.cliente_nombre == ''
            && request.resource.data.folio_factura == ''
            && request.resource.data.telefono == ''
            && request.resource.data.monto == 0
          )
          ||
          (
            request.resource.data.tipo_vinculo == 'CLIENTE'
            && request.resource.data.cliente_id is string
            && request.resource.data.cliente_id != ''
            && request.resource.data.factura_id == null
            && request.resource.data.cliente_nombre != ''
            && request.resource.data.folio_factura == ''
            && request.resource.data.monto == 0
          )
          ||
          (
            request.resource.data.tipo_vinculo == 'FACTURA'
            && request.resource.data.cliente_id is string
            && request.resource.data.cliente_id != ''
            && request.resource.data.factura_id is string
            && request.resource.data.factura_id != ''
            && request.resource.data.cliente_nombre != ''
            && request.resource.data.folio_factura != ''
          )
        );

      allow update: if isStaff()
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'fecha_compromiso',
            'mes_anio',
            'estatus',
            'ultima_accion',
            'historial_acciones',
            'fecha_completado',
            'completado_por',
            'completado_por_uid',
            'updatedAt'
          ])
        && request.resource.data.estatus in [
          'Pendiente',
          'Completado',
          'Reprogramado',
          'Cancelado'
        ]
        && (
          (
            resource.data.estatus in ['Completado', 'Cancelado']
            && request.resource.data.estatus == resource.data.estatus
          )
          ||
          (
            resource.data.estatus in ['Pendiente', 'Reprogramado']
            && (
              request.resource.data.estatus == resource.data.estatus
              || request.resource.data.estatus in [
                'Reprogramado',
                'Completado',
                'Cancelado'
              ]
            )
          )
        )
        && request.resource.data.ultima_accion is map
        && request.resource.data.historial_acciones is list
        && request.resource.data.updatedAt is timestamp
        && (
          request.resource.data.estatus != 'Completado'
          || resource.data.estatus == 'Completado'
          || (
            request.resource.data.fecha_completado is timestamp
            && request.resource.data.completado_por is string
            && request.resource.data.completado_por_uid
              == request.auth.uid
          )
        );

      allow delete: if isSU();
    }

    match /actividad/{actividadId} {
      allow read: if isSU();

      allow create: if isStaff()
        && actorValido()
        && request.resource.data.usuario is string
        && request.resource.data.modulo is string
        && request.resource.data.tipo is string
        && request.resource.data.detalle is string
        && request.resource.data.serverTime is timestamp;

      allow update, delete: if false;
    }

    match /metricas_globales/{documentoId} {
      allow read: if isStaff();

      allow create: if isStaff()
        && documentoId == 'stats_actuales'
        && request.resource.data.keys().hasOnly([
          'cartera_total',
          'cartera_vencida',
          'ingresos_mes',
          'ingresos_semana',
          'clientes_activos',
          'facturas_vencidas',
          'facturas_pendientes',
          'facturas_pagadas',
          'facturas_total',
          'total_facturado',
          'total_liquidado',
          'cobrado_historico',
          'abonos_registrados',
          'updatedAt',
          'ultima_actualizacion'
        ]);

      allow update: if isStaff()
        && documentoId == 'stats_actuales'
        && request.resource.data
          .diff(resource.data)
          .affectedKeys()
          .hasOnly([
            'cartera_total',
            'cartera_vencida',
            'ingresos_mes',
            'ingresos_semana',
            'clientes_activos',
            'facturas_vencidas',
            'facturas_pendientes',
            'facturas_pagadas',
            'facturas_total',
            'total_facturado',
            'total_liquidado',
            'cobrado_historico',
            'abonos_registrados',
            'updatedAt',
            'ultima_actualizacion'
          ]);

      allow delete: if false;
    }
  }
}
```

## File: src/pages/ExpedienteCliente.jsx
```javascript
import { useState, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import { calcularDiasVencidos } from "../utils/fechas";
import { clientesService } from "../services/clientesService";
import { solicitudesService } from "../services/solicitudesService";
import {
  ArrowLeft, Edit, FileText, User, CheckCircle, Pencil, X, XCircle, TrendingUp,
  Shield, Mail, Tag, MessageSquare, StickyNote, ChevronLeft, ChevronRight, DollarSign,
  Trash2, Loader2, AlertTriangle
} from "lucide-react";

const GRUPOS_CLIENTE = [
  { value: "CARPINTERIA", label: "Carpintería" },
  { value: "CRUCE", label: "Cruce" },
  { value: "FAMILIARES", label: "Familiares" },
  { value: "GENERAL", label: "General" },
  { value: "PRIORIDAD", label: "Prioridad" },
  { value: "IHB", label: "IHB" },
  { value: "RC INTERCOMERCE", label: "RC Intercomerce" },
  { value: "TORRE LAS AMERICAS", label: "Torre Las Americas" },
  { value: "NUEVO", label: "Nuevo" },
];

const normalizarGrupoCliente = (valor = "") => {
  const normalizado = valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  const coincidencia = GRUPOS_CLIENTE.find(
    (grupo) => grupo.value === normalizado,
  );

  return coincidencia?.value || "GENERAL";
};

const obtenerEtiquetaGrupo = (valor = "") => {
  const valorNormalizado = normalizarGrupoCliente(valor);

  return (
    GRUPOS_CLIENTE.find((grupo) => grupo.value === valorNormalizado)?.label ||
    "General"
  );
};

export default function ExpedienteCliente() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    clientes,
    facturas,
    userRole,
    userName,
    currentUser,
    eliminarFacturaEnNube,
  } = useContext(GlobalContext);

  const [filtroFacturas, setFiltroFacturas] = useState("Historial");
  const [modalActivo, setModalActivo] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [aumentoData, setAumentoData] = useState({ monto: "", motivo: "" });
  const [notificacion, setNotificacion] = useState({ titulo: "", descripcion: "", tipo: "exito" });
  const [paginaFacturas, setPaginaFacturas] = useState(1);
  const [clienteForm, setClienteForm] = useState({});
  const [procesandoCredito, setProcesandoCredito] = useState(false);
  const [procesandoEliminacionFactura, setProcesandoEliminacionFactura] =
    useState(false);
  const facturasPorPagina = 8;

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const clienteBase = clientes.find((c) => c.id === id) || null;

  // Filtro robusto blindado por ID con soporte para historial antiguo
  const facturasCliente = useMemo(() => {
    if (!clienteBase?.id) return [];

    return facturas.filter((f) => {
      if (f.cliente_id) {
        return f.cliente_id === clienteBase.id;
      }
      return f.cliente === clienteBase.nombre;
    });
  }, [facturas, clienteBase]);

  const facturasFiltradasTab = useMemo(() => {
    return facturasCliente.filter((fac) => {
      const esVencida = fac.estatus === "Vencida";
      const esPagada = (fac.saldo_pendiente || 0) <= 0;
      if (filtroFacturas === "Vencidas" && !esVencida) return false;
      if (filtroFacturas === "Pagadas" && !esPagada) return false;
      return true;
    });
  }, [facturasCliente, filtroFacturas]);

  const totalPaginas = Math.ceil(facturasFiltradasTab.length / facturasPorPagina);
  const facturasPaginadas = useMemo(() => {
    const inicio = (paginaFacturas - 1) * facturasPorPagina;
    return facturasFiltradasTab.slice(inicio, inicio + facturasPorPagina);
  }, [facturasFiltradasTab, paginaFacturas]);

  const cambiarFiltroFacturas = (tab) => {
    setFiltroFacturas(tab);
    setPaginaFacturas(1);
  };

  const cambiarPagina = (direccion) => {
    setPaginaFacturas((prev) => prev + direccion);
  };

  const deudaReal = useMemo(() => {
    return facturasCliente
      .filter((f) => f.estatus !== "Pagada" && f.estatus !== "Cancelada")
      .reduce((acc, curr) => acc + (Number(curr.saldo_pendiente) || 0), 0);
  }, [facturasCliente]);

  const saldoVencidoReal = useMemo(() => {
    return facturasCliente
      .filter((f) => f.estatus === "Vencida")
      .reduce((acc, curr) => acc + (Number(curr.saldo_pendiente) || 0), 0);
  }, [facturasCliente]);

  const limiteCredito = Number(clienteBase?.limite_credito) || 0;
  const tieneLineaCredito = limiteCredito > 0;

  const baseCombinada = clienteBase ? {
    ...clienteBase,
    rfc: clienteBase.rfc || "S/N",
    limite_credito: limiteCredito,
    deuda_actual: deudaReal,
    credito_disponible: tieneLineaCredito ? Math.max(0, limiteCredito - deudaReal) : 0,
    saldo_vencido: saldoVencidoReal,
    direccion: clienteBase.direccion || "Sin dirección registrada.",
    correo: clienteBase.correo || "S/N",
    segmentacion: clienteBase.segmentacion || "Nuevo",
    dias_mensaje: clienteBase.dias_mensaje || "",
    notas_internas: clienteBase.notas_internas || "",
  } : null;

  const cliente = baseCombinada;

  const cerrarModal = () => {
    if (procesandoEliminacionFactura) return;

    setModalActivo(null);
    setFacturaSeleccionada(null);
    setAumentoData({ monto: "", motivo: "" });
  };

  const opcionesSegmentacion = ["Cumplidor", "Moroso", "Riesgo Alto", "Nuevo", "Suspendido"];

  const handleEnviarSolicitud = async (e) => {
    e.preventDefault();

    if (procesandoCredito) return;

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se identificó al usuario responsable.",
        "error",
      );
      return;
    }

    const montoSolicitado = Number(aumentoData.monto);

    if (
      !Number.isFinite(montoSolicitado) ||
      montoSolicitado <= 0 ||
      !aumentoData.motivo.trim()
    ) {
      mostrarNotificacion(
        "Campos Incompletos",
        "Ingresa un monto mayor a cero y una justificación.",
        "error",
      );
      return;
    }

    setProcesandoCredito(true);

    try {
      const res =
        userRole !== "SU"
          ? await solicitudesService.crearSolicitudAumento({
              cliente_id: cliente.id,
              cliente: cliente.nombre,
              monto_incremento: montoSolicitado,
              limite_anterior: cliente.limite_credito,
              motivo: aumentoData.motivo.trim(),
              solicitado_por_uid: currentUser.uid,
              solicitado_por_nombre: userName || "ADMIN",
            })
          : await solicitudesService.aplicarAumentoDirectoSU({
              cliente_id: cliente.id,
              cliente_nombre: cliente.nombre,
              monto_incremento: montoSolicitado,
              limite_actual: cliente.limite_credito,
              actor_uid: currentUser.uid,
              actor_nombre: userName || "SU",
            });

      if (!res?.success) {
        mostrarNotificacion(
          "Error",
          res?.error || "No se pudo procesar el aumento de crédito.",
          "error",
        );
        return;
      }

      mostrarNotificacion(
        userRole === "SU" ? "Aumento Aplicado" : "Solicitud Enviada",
        userRole === "SU"
          ? `Se sumaron $${montoSolicitado.toLocaleString("es-MX")} a la línea de crédito.`
          : `Petición por $${montoSolicitado.toLocaleString("es-MX")} en espera de autorización del SU.`,
        "exito",
      );

      setAumentoData({ monto: "", motivo: "" });
    } catch (error) {
      console.error("Error procesando aumento de crédito:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al procesar la operación.",
        "error",
      );
    } finally {
      setProcesandoCredito(false);
    }
  };

  const handleGuardarEdicionCliente = async (e) => {
    e.preventDefault();
    
    if (!currentUser?.uid) {
      mostrarNotificacion("Error", "No se identificó al usuario responsable.", "error");
      return;
    }

    const respuesta = await clientesService.modificarCliente(
      cliente.id, 
      clienteForm, 
      cliente.nombre, 
      userName,
      currentUser.uid
    );

    if (respuesta.success) {
      cerrarModal();
      mostrarNotificacion("Cambios Guardados", "Los datos del cliente han sido actualizados en la nube con éxito.", "exito");
    } else {
      mostrarNotificacion("Error", respuesta.error || "Fallo de conexión al guardar en la nube.", "error");
    }
  };

  const handleEliminarFactura = async () => {
    if (procesandoEliminacionFactura) return;

    if (userRole !== "SU") {
      mostrarNotificacion(
        "Acción no permitida",
        "Solo el SU puede eliminar facturas.",
        "error",
      );
      return;
    }

    if (!currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se identificó al usuario responsable.",
        "error",
      );
      return;
    }

    if (!facturaSeleccionada?.id) {
      mostrarNotificacion(
        "Error",
        "No se identificó la factura que será eliminada.",
        "error",
      );
      return;
    }

    setProcesandoEliminacionFactura(true);

    try {
      const respuesta = await eliminarFacturaEnNube(
        facturaSeleccionada.id,
      );

      if (!respuesta?.success) {
        mostrarNotificacion(
          "Error",
          respuesta?.error || "No se pudo eliminar la factura.",
          "error",
        );
        return;
      }

      setFacturaSeleccionada(null);

      mostrarNotificacion(
        "Factura eliminada",
        "Se eliminó la factura y se ajustaron saldo, crédito, métricas y auditoría.",
        "exito",
      );
    } catch (error) {
      console.error("Error eliminando factura desde expediente:", error);
      mostrarNotificacion(
        "Error",
        "Ocurrió un error inesperado al eliminar la factura.",
        "error",
      );
    } finally {
      setProcesandoEliminacionFactura(false);
    }
  };

  // RENDEREADO DE FALLBACK (Bloqueado aquí para no romper el orden de los Hooks anteriores)
  if (!cliente) {
    return <div className="p-8 text-center font-bold text-gray-500">Cargando expediente o cliente no encontrado...</div>;
  }

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 animate-fade-in relative pb-6 text-sm">
      <div className="flex items-center mt-2 md:mt-4">
        <button
          onClick={() => navigate("/clientes")}
          className="text-gray-500 hover:text-[#0a192f] active:text-[#0a192f] active:bg-gray-100 font-bold flex items-center transition-colors py-2 md:py-0 px-2 md:px-0 rounded-lg -ml-2 md:ml-0"
        >
          <ArrowLeft className="h-5 w-5 md:h-4 md:w-4 mr-1.5" /> Regresar a Clientes
        </button>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center w-full md:w-auto">
          <div className="h-12 w-12 md:h-14 md:w-14 shrink-0 bg-gradient-to-tr from-[#0a192f] to-blue-900 rounded-full flex items-center justify-center font-black text-white text-lg md:text-xl shadow-md">
            {cliente.nombre ? cliente.nombre.charAt(0) : "U"}
          </div>
          <div className="ml-3 md:ml-4 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-lg md:text-xl font-black text-[#0a192f] leading-tight">
                {cliente.nombre}
              </h1>
              <span className="w-fit text-[10px] md:text-[11px] font-black uppercase px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-600 rounded">
                {obtenerEtiquetaGrupo(cliente.grupo)}
              </span>
            </div>
            <p className="text-[11px] md:text-xs text-gray-400 mt-1 font-mono">
              No. Cliente: #{cliente.numero_cliente || "SIN-FOLIO"}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setClienteForm({
              ...cliente,
              grupo: normalizarGrupoCliente(cliente.grupo),
            });
            setModalActivo("editarCliente");
          }}
          className="w-full md:w-auto px-4 py-3 md:py-2 bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs rounded-xl md:rounded-lg active:bg-gray-200 hover:bg-gray-100 flex items-center justify-center shadow-sm transition-colors"
        >
          <Edit className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 text-gray-500" /> Editar Perfil
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Deuda Actual</p>
          <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">
            ${(cliente.deuda_actual || 0).toLocaleString("es-MX")}
          </h3>
          <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium">Suma de saldos pendientes</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Límite Crédito</p>
            <button
              onClick={() => setModalActivo("solicitarAumento")}
              className="text-[11px] md:text-xs font-bold text-blue-600 active:text-blue-800 hover:text-blue-800 flex items-center transition-colors p-1 md:p-0 -mr-1 md:mr-0"
            >
              <Pencil className="h-3.5 w-3.5 md:h-3 md:w-3 mr-0.5" /> Modificar
            </button>
          </div>
          {tieneLineaCredito ? (
            <>
              <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">
                ${(cliente.limite_credito || 0).toLocaleString("es-MX")}
              </h3>
              <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium">Evaluado por SU</p>
            </>
          ) : (
            <>
              <h3 className="text-lg md:text-xl font-black text-amber-600 mt-1">Sin línea asignada</h3>
              <p className="text-[10px] md:text-[11px] text-amber-600 mt-1.5 md:mt-2 font-medium">Pendiente de evaluación</p>
            </>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Crédito Disponible</p>
          {tieneLineaCredito ? (
            <>
              <h3 className={`text-xl md:text-2xl font-black mt-1 ${cliente.credito_disponible <= 0 ? "text-red-600" : "text-green-600"}`}>
                ${(cliente.credito_disponible || 0).toLocaleString("es-MX")}
              </h3>
              <p className={`text-[10px] md:text-[11px] mt-1.5 md:mt-2 font-medium px-2 py-0.5 rounded w-fit ${cliente.credito_disponible > 0 ? "text-green-700/80 bg-green-50" : "text-red-700/80 bg-red-50"}`}>
                {cliente.credito_disponible > 0 ? "Margen operativo disponible" : "Límite excedido"}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg md:text-xl font-black text-gray-400 mt-1">N/A</h3>
              <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium bg-gray-100 px-2 py-0.5 rounded w-fit">
                El SU debe asignar una línea
              </p>
            </>
          )}
        </div>

        <div className={`p-4 rounded-xl border shadow-sm ${cliente.saldo_vencido > 0 ? "bg-red-50/30 border-red-100" : "bg-white border-gray-100"}`}>
          <p className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${cliente.saldo_vencido > 0 ? "text-red-500" : "text-gray-400"}`}>Saldo Vencido</p>
          <h3 className={`text-xl md:text-2xl font-black mt-1 ${cliente.saldo_vencido > 0 ? "text-red-600" : "text-[#0a192f]"}`}>
            ${(cliente.saldo_vencido || 0).toLocaleString("es-MX")}
          </h3>
          <p className="text-[10px] md:text-[11px] text-gray-500 mt-1.5 md:mt-2 font-medium">Fuera del plazo permitido</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden h-fit">
          <div className="p-4 border-b border-gray-50 bg-gray-50/30">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-600" /> Datos de Cliente
            </h3>
          </div>
          <div className="p-4 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">No. Cliente</span>
                <strong className="text-gray-800 font-mono text-sm">#{cliente.numero_cliente || "SIN-FOLIO"}</strong>
              </div>
              <div>
                <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Grupo</span>
                <strong className="text-gray-800 text-sm">{obtenerEtiquetaGrupo(cliente.grupo)}</strong>
              </div>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">RFC Comercial</span>
              <strong className="text-sm font-mono text-gray-800">{cliente.rfc}</strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Correo Electrónico</span>
              <strong className="text-gray-700 font-medium flex items-center gap-1">
                <Mail className="h-3 w-3 text-gray-400" /> {cliente.correo}
              </strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Teléfono</span>
              <strong className="text-gray-700 block">{cliente.telefono}</strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Dirección Fiscal / Entrega</span>
              <strong className="text-gray-700 leading-relaxed block font-normal">{cliente.direccion}</strong>
            </div>
            <div>
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-0.5">Segmentación</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-100 mt-1">
                <Tag className="h-3 w-3 mr-1" /> {cliente.segmentacion}
              </span>
            </div>
            {cliente.dias_mensaje && cliente.dias_mensaje !== "" && (
              <div>
                <span className="block font-bold text-amber-500 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" /> Días de Mensaje
                </span>
                <strong className="text-gray-800 text-sm">Avisar {cliente.dias_mensaje} días antes del vencimiento.</strong>
              </div>
            )}
            
            <div className="pt-3 border-t border-gray-100 mt-2">
              <span className="block font-bold text-green-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                <DollarSign className="h-4 w-4" /> Último Abono Registrado
              </span>
              <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                <p className="text-lg font-black text-green-700">
                  ${(cliente.monto_ultimo_pago || cliente.ultimo_deposito_monto || 0).toLocaleString("es-MX")}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Fecha: {cliente.fecha_ultimo_pago?.toDate ? cliente.fecha_ultimo_pago.toDate().toLocaleDateString() : (cliente.ultimo_deposito_fecha?.toDate ? cliente.ultimo_deposito_fecha.toDate().toLocaleDateString() : 'Sin registros')}
                </p>
                <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                  Método: {cliente.metodo_ultimo_pago || cliente.ultimo_deposito_metodo || 'N/A'}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-50">
              <span className="block font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notas Internas
              </span>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed font-serif italic text-xs">
                {cliente.notas_internas ? `"${cliente.notas_internas}"` : "Sin notas registradas."}
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-bold text-[#0a192f] flex items-center">
              <FileText className="h-5 w-5 mr-2 text-blue-600" /> Historial de Facturas
            </h3>
            <div className="flex bg-gray-100 p-1 rounded-xl md:rounded-lg border border-gray-200 w-full sm:w-auto overflow-x-auto hide-scrollbar-mobile shrink-0">
              {["Historial", "Vencidas", "Pagadas"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => cambiarFiltroFacturas(tab)}
                  className={`flex-1 sm:flex-none whitespace-nowrap px-4 md:px-3 py-2 md:py-1 text-xs md:text-[11px] font-bold rounded-lg md:rounded-md transition-colors ${filtroFacturas === tab ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-200"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar w-full min-h-[300px]">
            <table className="w-full text-left text-sm border-collapse min-w-[700px]">
              <thead className="bg-gray-50 text-[11px] md:text-xs font-bold text-gray-500 uppercase border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Folio</th>
                  <th className="px-4 py-3 whitespace-nowrap">Fechas (Emi / Vcto)</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Saldo</th>
                  <th className="px-4 py-3 text-center whitespace-nowrap">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {facturasPaginadas.length > 0 ? (
                  facturasPaginadas.map((fac) => {
                    const esVencida = fac.estatus === "Vencida";
                    const esPagada = (fac.saldo_pendiente || 0) <= 0;
                    const diasVencidos = esVencida ? calcularDiasVencidos(fac.vencimiento) : 0;

                    return (
                      <tr
                        key={fac.id}
                        onClick={() => { setFacturaSeleccionada(fac); setModalActivo("verFactura"); }}
                        className="hover:bg-gray-50/80 active:bg-gray-100 cursor-pointer transition-colors text-xs"
                      >
                        <td className="px-4 py-4 md:py-3 font-mono font-bold text-blue-600 text-sm whitespace-nowrap">{fac.folio}</td>
                        <td className="px-4 py-4 md:py-3 text-gray-600 whitespace-nowrap">
                          <div className="font-medium">Emi: {fac.emision}</div>
                          <div className="text-[11px] text-red-500/90 font-mono">Vence: {fac.vencimiento}</div>
                        </td>
                        <td className="px-4 py-4 md:py-3 font-bold text-gray-900 text-right whitespace-nowrap">
                          ${(Number(fac.monto_total) || 0).toLocaleString("es-MX")}
                        </td>
                        <td className="px-4 py-4 md:py-3 font-black text-gray-900 text-right whitespace-nowrap">
                          {(Number(fac.saldo_pendiente) || 0) > 0 ? (
                            <span className={esVencida ? "text-red-600" : "text-[#0a192f]"}>
                              ${(Number(fac.saldo_pendiente) || 0).toLocaleString("es-MX")}
                            </span>
                          ) : (
                            <span className="text-green-600">$0.00</span>
                          )}
                        </td>
                        <td className="px-4 py-4 md:py-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-end md:justify-center">
                            <span className={`px-2 py-1 md:py-0.5 rounded text-[10px] font-black uppercase border block whitespace-nowrap ${esPagada ? "bg-green-50 border-green-200 text-green-700" : esVencida ? "bg-red-50 border-red-200 text-red-700" : "bg-blue-50 border-blue-200 text-blue-700"}`}>
                              {esPagada ? "Pagada" : esVencida ? `Vencida (${diasVencidos}d)` : fac.estatus}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400 font-medium text-sm">No se encontraron facturas.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center px-4 shrink-0">
              <span className="text-[11px] font-medium text-gray-500">
                Página <strong className="text-gray-700">{paginaFacturas}</strong> de {totalPaginas}
              </span>
              <div className="flex space-x-2 md:space-x-1">
                <button onClick={() => cambiarPagina(-1)} disabled={paginaFacturas === 1} className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronLeft className="h-5 w-5 md:h-4 md:w-4" /></button>
                <button onClick={() => cambiarPagina(1)} disabled={paginaFacturas === totalPaginas} className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"><ChevronRight className="h-5 w-5 md:h-4 md:w-4" /></button>
              </div>
            </div>
          )}
        </div>
      </div>

      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-slide-up md:animate-fade-in max-h-[90vh] pb-6 md:pb-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>

            {modalActivo !== "notificacion" && (
              <div className="flex justify-between items-center p-4 md:p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm font-black text-[#0a192f] flex items-center">
                  {modalActivo === "solicitarAumento" && <><TrendingUp className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" /> Aumento de Crédito</>}
                  {modalActivo === "editarCliente" && <><Edit className="h-5 w-5 md:h-4 md:w-4 mr-2 text-blue-600" /> Editar Cliente</>}
                  {modalActivo === "verFactura" && <><FileText className="h-5 w-5 md:h-4 md:w-4 mr-2 text-gray-600" /> Factura: <span className="font-mono text-blue-600 ml-1">{facturaSeleccionada?.folio}</span></>}
                  {modalActivo === "confirmarEliminarFactura" && <><AlertTriangle className="h-5 w-5 md:h-4 md:w-4 mr-2 text-red-600" /> Eliminar Factura</>}
                </h2>
                <button onClick={cerrarModal} className="text-gray-400 active:text-red-500 p-1 bg-gray-50 md:bg-transparent rounded-full"><X className="h-6 w-6 md:h-5 md:w-5" /></button>
              </div>
            )}

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modalActivo === "verFactura" && facturaSeleccionada && (() => {
                const fac = facturaSeleccionada;
                const esVencida = fac.estatus === "Vencida";
                const esPagada = (fac.saldo_pendiente || 0) <= 0;
                const diasVencidos = esVencida ? calcularDiasVencidos(fac.vencimiento) : 0;
                const montoTotal = Number(fac.monto_total) || 0;
                const saldoPendiente = Number(fac.saldo_pendiente) || 0;
                const montoAbonado = montoTotal - saldoPendiente;
                const porcentajeLiquidado = montoTotal > 0 ? (montoAbonado / montoTotal) * 100 : 0;
                const observacionLimpia = String(fac.observaciones || "")
                  .replace(/^observaciones\s*:\s*/i, "")
                  .trim();

                return (
                  <div className="flex flex-col space-y-5 md:space-y-4">
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-100 text-xs">
                      <div>
                        <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">Emisión / Vcto</span>
                        <strong className="text-gray-800 text-sm md:text-xs block md:inline">
                          {fac.emision} <span className="hidden md:inline text-gray-400 font-normal mx-1">|</span> <span className={`block md:inline mt-0.5 md:mt-0 ${esVencida ? "text-red-500" : ""}`}>{fac.vencimiento}</span>
                        </strong>
                      </div>
                      <div>
                        <span className="block font-black text-[10px] text-gray-400 uppercase tracking-wider mb-1 md:mb-0.5">Estatus Actual</span>
                        <span className={`inline-block px-2.5 py-1 md:py-0.5 font-black uppercase rounded text-[10px] md:text-[10px] ${esPagada ? "bg-green-100 text-green-800" : esVencida ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                          {esPagada ? "Pagada" : esVencida ? `Vencida (${diasVencidos}d)` : fac.estatus}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white p-4 md:p-3 rounded-xl md:rounded-lg border border-gray-200 shadow-sm">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 uppercase mb-2 md:mb-1.5">
                        <span>Progreso de Pago</span><span className={esPagada ? "text-green-600" : ""}>{porcentajeLiquidado.toFixed(1)}% Liquidado</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5 md:h-2">
                        <div className={`h-2.5 md:h-2 rounded-full transition-all duration-500 ${esPagada ? "bg-green-500" : esVencida ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${porcentajeLiquidado}%` }}></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-bold mt-3 md:mt-2 pt-3 md:pt-2 border-t border-gray-50">
                        <div className="flex flex-col"><span className="text-gray-400 uppercase">Facturado</span><span className="text-gray-800 text-sm md:text-xs font-black">${montoTotal.toLocaleString("es-MX")}</span></div>
                        <div className="flex flex-col border-l border-r border-gray-100"><span className="text-gray-400 uppercase">Abonado</span><span className="text-green-600 text-sm md:text-xs font-black">${montoAbonado.toLocaleString("es-MX")}</span></div>
                        <div className="flex flex-col"><span className="text-gray-400 uppercase">Faltante</span><span className={`text-sm md:text-xs font-black ${esPagada ? "text-green-600" : esVencida ? "text-red-600" : "text-[#0a192f]"}`}>${saldoPendiente.toLocaleString("es-MX")}</span></div>
                      </div>
                    </div>

                    <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-sm">
                      <div className="absolute inset-y-0 left-0 w-1 bg-amber-400" />

                      <div className="p-4 pl-5 md:p-3 md:pl-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center min-w-0">
                            <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
                              <StickyNote className="h-4 w-4 text-amber-700" />
                            </div>

                            <div className="ml-2.5 min-w-0">
                              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-700">
                                Observaciones de la factura
                              </p>
                              <p className="text-[10px] text-amber-600/80 mt-0.5">
                                Nota interna para seguimiento operativo
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-wide ${
                              observacionLimpia
                                ? "bg-amber-100 border-amber-200 text-amber-700"
                                : "bg-gray-100 border-gray-200 text-gray-500"
                            }`}
                          >
                            {observacionLimpia ? "Registrada" : "Sin registro"}
                          </span>
                        </div>

                        <div className="mt-3 rounded-lg border border-amber-100 bg-white/80 px-3 py-3">
                          <p
                            className={`text-xs leading-relaxed whitespace-pre-wrap break-words ${
                              observacionLimpia
                                ? "text-gray-700 font-medium"
                                : "text-gray-400 italic"
                            }`}
                          >
                            {observacionLimpia || "Sin observaciones registradas para esta factura."}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <span className="block font-black text-[#0a192f] text-xs md:text-xs flex items-center mb-2 md:mb-2">
                        <FileText className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1 text-blue-600" /> Historial de Abonos
                      </span>
                      <div className="bg-white rounded-xl md:rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left text-xs md:text-[11px]">
                          <thead className="bg-gray-100 text-gray-500 uppercase font-bold tracking-wider">
                            <tr><th className="px-3 py-2.5 md:py-2">Fecha</th><th className="px-3 py-2.5 md:py-2 text-right">Monto</th><th className="px-3 py-2.5 md:py-2 text-center">Método</th></tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {fac.abonos && fac.abonos.length > 0 ? (
                              fac.abonos.map((abn, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-3 py-3 md:py-2 font-mono text-gray-600">{abn.fecha?.split(",")[0] || abn.fecha}</td>
                                  <td className="px-3 py-3 md:py-2 font-black text-green-600 text-right">${(Number(abn.monto) || 0).toLocaleString("es-MX")}</td>
                                  <td className="px-3 py-3 md:py-2 text-gray-600 font-medium text-center">{abn.metodo}</td>
                                </tr>
                              ))
                            ) : (
                              <tr><td colSpan="3" className="px-3 py-6 text-center text-gray-400 font-medium italic">No se han registrado pagos.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className={`grid gap-3 ${userRole === "SU" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
                      <button
                        type="button"
                        onClick={() => navigate("/facturas", { state: { editarFactura: fac } })}
                        className="w-full px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-black text-xs flex items-center justify-center hover:bg-amber-100 active:bg-amber-100 transition-colors"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar esta factura
                      </button>

                      {userRole === "SU" && (
                        <button
                          type="button"
                          onClick={() => setModalActivo("confirmarEliminarFactura")}
                          className="w-full px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl font-black text-xs flex items-center justify-center hover:bg-red-100 active:bg-red-100 transition-colors"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar factura
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {modalActivo === "confirmarEliminarFactura" && facturaSeleccionada && (
                <div className="space-y-5">
                  <div className="text-center space-y-3">
                    <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-50">
                      <AlertTriangle className="h-8 w-8 text-red-600" />
                    </div>

                    <div>
                      <h3 className="text-lg font-black text-[#0a192f]">
                        ¿Eliminar esta factura?
                      </h3>

                      <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                        Se eliminará la factura{" "}
                        <span className="font-black text-[#0a192f]">
                          {facturaSeleccionada.folio}
                        </span>{" "}
                        de{" "}
                        <span className="font-black text-[#0a192f]">
                          {facturaSeleccionada.cliente}
                        </span>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700 leading-relaxed">
                    Esta acción solo puede realizarla el SU. También se
                    ajustará el saldo del cliente, el crédito disponible, las
                    métricas globales y quedará registro en la bitácora.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setModalActivo("verFactura")}
                      disabled={procesandoEliminacionFactura}
                      className="w-full px-4 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-black text-xs hover:bg-gray-50 disabled:opacity-60"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleEliminarFactura}
                      disabled={procesandoEliminacionFactura}
                      className="w-full px-4 py-3 bg-red-600 text-white rounded-xl font-black text-xs flex items-center justify-center hover:bg-red-700 disabled:opacity-60"
                    >
                      {procesandoEliminacionFactura ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Eliminando...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sí, eliminar
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {modalActivo === "editarCliente" && (
                <form id="formEditarCliente" onSubmit={handleGuardarEdicionCliente} className="space-y-5 md:space-y-4 text-sm md:text-xs">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">No. Cliente</label>
                      <input type="text" value={clienteForm.numero_cliente || ""} onChange={(e) => setClienteForm({ ...clienteForm, numero_cliente: e.target.value })} placeholder="Ej. CLI-007" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold uppercase focus:ring-2 focus:ring-[#ffd700] outline-none" />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Razón Social</label>
                      <input type="text" value={clienteForm.nombre || ""} onChange={(e) => setClienteForm({ ...clienteForm, nombre: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-bold focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">RFC</label>
                      <input type="text" value={clienteForm.rfc || ""} onChange={(e) => setClienteForm({ ...clienteForm, rfc: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md font-mono uppercase focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Teléfono</label>
                      <input type="tel" value={clienteForm.telefono || ""} onChange={(e) => setClienteForm({ ...clienteForm, telefono: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Correo</label>
                    <input type="email" value={clienteForm.correo || ""} onChange={(e) => setClienteForm({ ...clienteForm, correo: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Dirección</label>
                    <textarea value={clienteForm.direccion || ""} onChange={(e) => setClienteForm({ ...clienteForm, direccion: e.target.value })} rows="2" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none" required />
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:gap-3">
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Grupo</label>
                      <select
                        value={normalizarGrupoCliente(clienteForm.grupo)}
                        onChange={(e) =>
                          setClienteForm((prev) => ({
                            ...prev,
                            grupo: e.target.value,
                          }))
                        }
                        className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md outline-none"
                      >
                        {GRUPOS_CLIENTE.map((grupo) => (
                          <option key={grupo.value} value={grupo.value}>
                            {grupo.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Segmentación</label>
                      <select value={clienteForm.segmentacion || ""} onChange={(e) => setClienteForm({ ...clienteForm, segmentacion: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md outline-none">
                        {opcionesSegmentacion.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Días de Mensaje (Aviso)</label>
                    <input type="number" value={clienteForm.dias_mensaje || ""} onChange={(e) => setClienteForm({ ...clienteForm, dias_mensaje: e.target.value })} placeholder="Ej. 5" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none" />
                  </div>
                  <div>
                    <label className="block font-black text-[10px] text-gray-500 uppercase mb-1.5">Notas Internas</label>
                    <textarea value={clienteForm.notas_internas || ""} onChange={(e) => setClienteForm({ ...clienteForm, notas_internas: e.target.value })} rows="2" className="w-full px-4 py-3 md:px-3 md:py-2 bg-yellow-50/50 focus:bg-yellow-50 border border-yellow-200 rounded-xl md:rounded-md resize-none font-serif focus:ring-2 focus:ring-[#ffd700] outline-none" />
                  </div>
                </form>
              )}

              {modalActivo === "solicitarAumento" && (
                <form onSubmit={handleEnviarSolicitud} className="space-y-5 md:space-y-4">
                  {userRole === "SU" ? (
                    <div className="bg-amber-50 p-4 md:p-3 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-3">
                      <Shield className="h-5 w-5 md:h-4 md:w-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">Al ser <strong>Súper Usuario</strong>, el aumento se sumará inmediatamente a la línea de crédito y quedará registrado en bitácora.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-xl">Se enviará una solicitud al SU para aprobación remota.</p>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Límite Actual</label>
                    <input type="text" disabled value={`$${(cliente.limite_credito || 0).toLocaleString("es-MX")}`} className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-100 border rounded-xl md:rounded-md font-bold text-gray-600" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Monto de Aumento (+)</label>
                    <input type="number" required min="1" value={aumentoData.monto} onChange={(e) => setAumentoData({ ...aumentoData, monto: e.target.value })} placeholder="Ej. 5000" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md focus:ring-2 focus:ring-[#ffd700] outline-none font-bold" />
                    {aumentoData.monto && (
                      <p className="text-[10px] md:text-[10px] text-blue-600 mt-1.5 font-black uppercase">
                        Límite final esperado: ${(cliente.limite_credito + Number(aumentoData.monto)).toLocaleString("es-MX")}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Justificación</label>
                    <textarea required value={aumentoData.motivo} onChange={(e) => setAumentoData({ ...aumentoData, motivo: e.target.value })} rows="2" className="w-full px-4 py-3 md:px-3 md:py-2 bg-gray-50 focus:bg-white border rounded-xl md:rounded-md resize-none focus:ring-2 focus:ring-[#ffd700] outline-none" />
                  </div>

                  <div className="pt-4 md:border-t flex flex-col-reverse md:flex-row justify-end gap-3 shrink-0">
                    <button type="button" onClick={cerrarModal} disabled={procesandoCredito} className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border rounded-xl md:rounded-lg active:bg-gray-100 disabled:opacity-50">Cancelar</button>
                    {userRole === "SU" ? (
                      <button type="submit" disabled={procesandoCredito} className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-white bg-green-600 rounded-xl md:rounded-lg active:bg-green-700 flex items-center justify-center disabled:opacity-50">
                        <CheckCircle className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" />
                        {procesandoCredito ? "Procesando..." : "Aplicar Directo"}
                      </button>
                    ) : (
                      <button type="submit" disabled={procesandoCredito} className="w-full md:w-auto px-5 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200] flex items-center justify-center disabled:opacity-50">
                        {procesandoCredito ? "Enviando..." : "Enviar Petición"}
                      </button>
                    )}
                  </div>
                </form>
              )}

              {modalActivo === "notificacion" && (
                <div className="text-center py-4 md:py-2 animate-fade-in">
                  <div className={`h-16 w-16 md:h-14 md:w-14 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-3 ring-4 ${notificacion.tipo === "error" ? "bg-red-100 ring-red-50 text-red-600" : "bg-green-100 ring-green-50 text-green-600"}`}>
                    {notificacion.tipo === "error" ? <XCircle className="h-8 w-8 md:h-7 md:w-7" /> : <CheckCircle className="h-8 w-8 md:h-7 md:w-7" />}
                  </div>
                  <h3 className="text-xl md:text-lg font-black text-[#0a192f] mb-2 md:mb-1">{notificacion.titulo}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed px-2">{notificacion.descripcion}</p>
                </div>
              )}
            </div>

            {modalActivo !== "solicitarAumento" && (
              <div className="p-4 md:p-4 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-3 rounded-b-xl shrink-0">
                {modalActivo === "notificacion" ? (
                  <button onClick={cerrarModal} className={`w-full md:w-auto px-6 py-3.5 md:py-2 text-sm md:text-xs font-black text-white rounded-xl md:rounded-lg active:opacity-80 transition-colors ${notificacion.tipo === "error" ? "bg-red-600" : "bg-green-600"}`}>Aceptar</button>
                ) : modalActivo === "editarCliente" ? (
                  <>
                    <button type="button" onClick={cerrarModal} className="w-full md:w-auto px-4 py-3.5 md:py-2 text-sm md:text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-xl md:rounded-lg active:bg-gray-100">Cancelar</button>
                    <button type="submit" form="formEditarCliente" className="w-full md:w-auto px-8 py-3.5 md:py-2 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded-lg active:bg-[#e6c200]">Guardar</button>
                  </>
                ) : (
                  <button onClick={cerrarModal} className="w-full md:w-auto px-8 py-3.5 md:py-2 bg-gray-100 md:bg-[#0a192f] text-gray-800 md:text-white font-black text-sm md:text-xs rounded-xl md:rounded-lg active:bg-gray-200">Cerrar</button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: src/context/GlobalProvider.jsx
```javascript
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { useLocation } from "react-router-dom";

import { db } from "../config/firebase";
import { clientesService } from "../services/clientesService";
import { facturasService } from "../services/facturasService";
import { usuariosService } from "../services/usuariosService";
import { formatearFechaSegura } from "../utils/normalizadores";
import { normalizarFacturaSnapshot } from "../utils/normalizarFactura";
import { AuthContext } from "./AuthContext";
import { GlobalContext } from "./GlobalContext";

const AUTH_DATA_VACIO = Object.freeze({});
const CLIENTES_COLLECTION = "clientes";
const FACTURAS_COLLECTION = "facturas";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const SOLICITUDES_COLLECTION = "solicitudes";

const ordenarFacturas = (lista) =>
  [...lista].sort((primera, segunda) => {
    const fechaPrimera =
      primera.emision?.toDate?.().getTime?.() ||
      new Date(primera.emision || 0).getTime() ||
      0;

    const fechaSegunda =
      segunda.emision?.toDate?.().getTime?.() ||
      new Date(segunda.emision || 0).getTime() ||
      0;

    return fechaSegunda - fechaPrimera;
  });

const rutaNecesitaFacturasGlobales = (pathname) =>
  pathname.startsWith("/clientes/");

export const GlobalProvider = ({ children }) => {
  const authContextValue = useContext(AuthContext);
  const authData = authContextValue ?? AUTH_DATA_VACIO;

  const valorSinSesion = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,
      stats: {
        cartera_total: 0,
        cartera_vencida: 0,
        ingresos_mes: 0,
        ingresos_semana: 0,
        clientes_activos: 0,
        facturas_pendientes: 0,
        facturas_pagadas: 0,
        facturas_vencidas: 0,
        facturas_total: 0,
        total_facturado: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
      },
      clientes: [],
      facturas: [],
      actividad: [],
      solicitudes: [],
      usuarios: [],
    }),
    [authData],
  );

  if (!authData.currentUser) {
    return (
      <GlobalContext.Provider value={valorSinSesion}>
        {children}
      </GlobalContext.Provider>
    );
  }

  return (
    <GlobalDataProvider authData={authData}>{children}</GlobalDataProvider>
  );
};

function GlobalDataProvider({ authData, children }) {
  const location = useLocation();
  const { currentUser, userName, userRole } = authData;
  const actorUid = currentUser.uid;
  const necesitaFacturasGlobales = rutaNecesitaFacturasGlobales(
    location.pathname,
  );

  const [clientes, setClientes] = useState([]);
  const [facturasGlobales, setFacturasGlobales] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [statsDB, setStatsDB] = useState({
    cartera_total: 0,
    cartera_vencida: 0,
    ingresos_mes: 0,
    ingresos_semana: 0,
    clientes_activos: 0,
    facturas_pendientes: 0,
    facturas_pagadas: 0,
    facturas_vencidas: 0,
    facturas_total: 0,
    total_facturado: 0,
    total_liquidado: 0,
    cobrado_historico: 0,
    abonos_registrados: 0,
  });

  useEffect(() => {
    if (!actorUid) {
      return undefined;
    }

    let unsubUsuarios = () => {};
    let unsubActividad = () => {};

    if (userRole === "SU") {
      unsubUsuarios = usuariosService.escucharUsuarios((dataNormalizada) => {
        setUsuarios(dataNormalizada);
      });

      const qActividad = query(
        collection(db, ACTIVIDAD_COLLECTION),
        orderBy("serverTime", "desc"),
        limit(100),
      );

      unsubActividad = onSnapshot(
        qActividad,
        (snap) => {
          setActividad(
            snap.docs.map((documento) => {
              const data = documento.data();

              return {
                id: documento.id,
                ...data,
                fechaHora: formatearFechaSegura(
                  data.serverTime || data.fechaHora,
                  "Sin fecha",
                ),
              };
            }),
          );
        },
        (error) => {
          console.error("Error escuchando la actividad:", error);
        },
      );
    }

    const unsubClientes = onSnapshot(
      collection(db, CLIENTES_COLLECTION),
      (snap) => {
        setClientes(
          snap.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          })),
        );
      },
      (error) => {
        console.error("Error escuchando clientes:", error);
      },
    );

    const unsubStats = onSnapshot(
      doc(db, STATS_COLLECTION, STATS_DOC),
      (docSnap) => {
        if (docSnap.exists()) {
          setStatsDB(docSnap.data());
        }
      },
      (error) => {
        console.error("Error escuchando métricas:", error);
      },
    );

    const qSolicitudes = query(
      collection(db, SOLICITUDES_COLLECTION),
      orderBy("createdAt", "desc"),
      limit(100),
    );

    const unsubSolicitudes = onSnapshot(
      qSolicitudes,
      (snap) => {
        const dataNormalizada = snap.docs.map((documento) => {
          const data = documento.data();

          return {
            id: documento.id,
            ...data,
            fecha: formatearFechaSegura(
              data.createdAt || data.fecha,
              "Sin fecha",
            ),
          };
        });

        setSolicitudes(dataNormalizada);
      },
      (error) => {
        console.error("Error escuchando solicitudes:", error);
      },
    );

    return () => {
      unsubClientes();
      unsubStats();
      unsubActividad();
      unsubSolicitudes();
      unsubUsuarios();
    };
  }, [actorUid, userRole]);

  useEffect(() => {
    if (!actorUid || !necesitaFacturasGlobales) {
      return undefined;
    }

    const unsubFacturas = onSnapshot(
      collection(db, FACTURAS_COLLECTION),
      (snap) => {
        const facturasNormalizadas = snap.docs.map((documento) =>
          normalizarFacturaSnapshot(documento),
        );

        setFacturasGlobales(ordenarFacturas(facturasNormalizadas));
      },
      (error) => {
        console.error("Error escuchando facturas globales:", error);
      },
    );

    return () => {
      unsubFacturas();
    };
  }, [actorUid, necesitaFacturasGlobales]);

  const facturas = useMemo(
    () => (necesitaFacturasGlobales ? facturasGlobales : []),
    [necesitaFacturasGlobales, facturasGlobales],
  );

  const stats = useMemo(() => {
    const clientesReales = clientes.filter(
      (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
    );

    return {
      ...statsDB,
      cartera_total: Number(statsDB.cartera_total) || 0,
      cartera_vencida: Number(statsDB.cartera_vencida) || 0,
      ingresos_mes: Number(statsDB.ingresos_mes) || 0,
      ingresos_semana: Number(statsDB.ingresos_semana) || 0,
      clientes_activos:
        Number(statsDB.clientes_activos) || clientesReales.length,
      facturas_pendientes: Number(statsDB.facturas_pendientes) || 0,
      facturas_pagadas: Number(statsDB.facturas_pagadas) || 0,
      facturas_vencidas: Number(statsDB.facturas_vencidas) || 0,
      facturas_total: Number(statsDB.facturas_total) || 0,
      total_facturado: Number(statsDB.total_facturado) || 0,
      total_liquidado: Number(statsDB.total_liquidado) || 0,
      cobrado_historico: Number(statsDB.cobrado_historico) || 0,
      abonos_registrados: Number(statsDB.abonos_registrados) || 0,
    };
  }, [clientes, statsDB]);

  const crearFacturaEnNube = useCallback(
    async (formData) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.crearFactura({
        formData,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [clientes, actorUid, userName],
  );

  const registrarAbonoEnNube = useCallback(
    async (factura, montoAbonado, metodoPago) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.registrarAbono({
        factura,
        montoAbonado,
        metodoPago,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [clientes, actorUid, userName],
  );

  const eliminarAbonoEnNube = useCallback(
    async (idFactura, idAbono) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.eliminarAbono({
        idFactura,
        idAbono,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName],
  );

  const modificarFacturaEnNube = useCallback(
    async (idFactura, formData) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.modificarFactura({
        idFactura,
        formData,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName],
  );

  const eliminarFacturaEnNube = useCallback(
    async (idFactura) => {
      if (userRole !== "SU") {
        return {
          success: false,
          error: "Solo el SU puede eliminar facturas.",
        };
      }

      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return facturasService.eliminarFactura({
        idFactura,
        userName,
        actor_uid: actorUid,
      });
    },
    [actorUid, userName, userRole],
  );

  const eliminarClienteEnNube = useCallback(
    async (id, nombreCliente) => {
      if (!actorUid) {
        return {
          success: false,
          error: "No se identificó al usuario responsable.",
        };
      }

      return clientesService.eliminarCliente(
        id,
        nombreCliente,
        userName,
        actorUid,
      );
    },
    [actorUid, userName],
  );

  const actividadVisible = useMemo(
    () => (userRole === "SU" ? actividad : []),
    [actividad, userRole],
  );

  const usuariosVisibles = useMemo(
    () => (userRole === "SU" ? usuarios : []),
    [usuarios, userRole],
  );

  const contextValue = useMemo(
    () => ({
      ...authData,
      authLoading: authData.loading,
      stats,
      clientes,
      setClientes,
      eliminarClienteEnNube,
      facturas,
      setFacturas: setFacturasGlobales,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      actividad: actividadVisible,
      setActividad,
      solicitudes,
      setSolicitudes,
      usuarios: usuariosVisibles,
    }),
    [
      authData,
      stats,
      clientes,
      eliminarClienteEnNube,
      facturas,
      crearFacturaEnNube,
      modificarFacturaEnNube,
      eliminarFacturaEnNube,
      registrarAbonoEnNube,
      eliminarAbonoEnNube,
      actividadVisible,
      solicitudes,
      usuariosVisibles,
    ],
  );

  return (
    <GlobalContext.Provider value={contextValue}>
      {children}
    </GlobalContext.Provider>
  );
}
```

## File: src/services/facturasService.js
```javascript
import { db } from "../config/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";

const FACTURAS_COLLECTION = "facturas";
const CLIENTES_COLLECTION = "clientes";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La operación no pudo completarse. Espera al restablecimiento de la cuota o utiliza el emulador local.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica que las reglas publicadas coincidan con el archivo firestore.rules del proyecto.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión e intenta nuevamente.";
  }

  return error?.message || "No se pudo completar la operación de facturación.";
};

const convertirFechaFormulario = (fecha) => {
  if (!fecha || typeof fecha !== "string") {
    throw new Error("Las fechas de emisión y vencimiento son obligatorias.");
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);
  const fechaConvertida = new Date(anio, mes - 1, dia);

  if (
    !anio ||
    !mes ||
    !dia ||
    Number.isNaN(fechaConvertida.getTime())
  ) {
    throw new Error("La fecha indicada no es válida.");
  }

  return fechaConvertida;
};


const convertirFechaAString = (fecha) => {
  if (!fecha) return "";

  if (fecha?.toDate && typeof fecha.toDate === "function") {
    const valor = fecha.toDate();
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, "0")}-${String(valor.getDate()).padStart(2, "0")}`;
  }

  if (fecha instanceof Date) {
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
  }

  const texto = String(fecha).split(" ")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    return texto;
  }

  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(texto)) {
    const [dia, mes, anio] = texto.split("/");
    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  return "";
};

const calcularEstatusFinanciero = ({ saldo, vencimiento }) => {
  if (redondearMoneda(saldo) === 0) return "Pagada";

  const fecha = vencimiento?.toDate
    ? vencimiento.toDate()
    : vencimiento instanceof Date
      ? new Date(vencimiento)
      : convertirFechaFormulario(convertirFechaAString(vencimiento));

  fecha.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  return fecha < hoy ? "Vencida" : "Pendiente";
};

const valoresIguales = (anterior, nuevo) => {
  if (typeof anterior === "number" || typeof nuevo === "number") {
    return redondearMoneda(anterior) === redondearMoneda(nuevo);
  }

  return String(anterior ?? "") === String(nuevo ?? "");
};

const ETIQUETAS_EDICION = {
  cliente_id: "Cliente",
  grupo: "Grupo",
  folio: "Folio",
  monto_total: "Monto total",
  emision: "Emisión",
  vencimiento: "Vencimiento",
  observaciones: "Observaciones",
};

const formatearValorAuditoria = (campo, valor) => {
  if (campo === "monto_total") {
    return `$${redondearMoneda(valor).toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (campo === "emision" || campo === "vencimiento") {
    const fecha = convertirFechaAString(valor);
    if (!fecha) return "Sin fecha";
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return String(valor ?? "").trim() || "Sin datos";
};

const esFacturaVencida = (factura) => {
  if (factura.estatus === "Vencida") return true;
  if (!factura.vencimiento) return false;

  let fechaVencimiento;

  if (factura.vencimiento?.toDate) {
    fechaVencimiento = factura.vencimiento.toDate();
  } else {
    const fechaParte = factura.vencimiento.toString().split(" ")[0];

    if (fechaParte.includes("-")) {
      const [anio, mes, dia] = fechaParte.split("-").map(Number);
      fechaVencimiento = new Date(anio, mes - 1, dia);
    } else if (fechaParte.includes("/")) {
      const [dia, mes, anio] = fechaParte.split("/").map(Number);
      fechaVencimiento = new Date(anio, mes - 1, dia);
    } else {
      return false;
    }
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fechaVencimiento.setHours(0, 0, 0, 0);

  return fechaVencimiento < hoy;
};

const esMismoMes = (fechaTarget) => {
  if (!fechaTarget) return false;

  const fecha = fechaTarget.toDate
    ? fechaTarget.toDate()
    : new Date(fechaTarget);

  const hoy = new Date();

  return (
    fecha.getMonth() === hoy.getMonth() &&
    fecha.getFullYear() === hoy.getFullYear()
  );
};

const esMismaSemana = (fechaTarget) => {
  if (!fechaTarget) return false;

  const fecha = fechaTarget.toDate
    ? fechaTarget.toDate()
    : new Date(fechaTarget);

  const hoy = new Date();

  const obtenerSemana = (date) => {
    const fechaUTC = new Date(
      Date.UTC(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      ),
    );

    const numeroDia = fechaUTC.getUTCDay() || 7;
    fechaUTC.setUTCDate(fechaUTC.getUTCDate() + 4 - numeroDia);

    const inicioAnio = new Date(
      Date.UTC(fechaUTC.getUTCFullYear(), 0, 1),
    );

    return Math.ceil(
      (((fechaUTC - inicioAnio) / 86400000) + 1) / 7,
    );
  };

  return (
    fecha.getFullYear() === hoy.getFullYear() &&
    obtenerSemana(fecha) === obtenerSemana(hoy)
  );
};

export const facturasService = {
  crearFactura: async ({
    formData,
    clientes,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const clienteBD = clientes.find(
        (cliente) => cliente.id === formData.cliente_id,
      );

      if (!clienteBD) {
        throw new Error(
          "El cliente seleccionado no está enlazado correctamente mediante cliente_id.",
        );
      }

      if (
        clienteBD.activo === false ||
        clienteBD.estatus === "Inactivo"
      ) {
        throw new Error(
          "No se pueden crear facturas para un cliente inactivo.",
        );
      }

      const montoTotal = redondearMoneda(formData.monto_total);

      if (montoTotal <= 0) {
        throw new Error(
          "El monto total de la factura debe ser mayor a cero.",
        );
      }

      const limiteCredito =
        Number(clienteBD.limite_credito) || 0;

      const deudaActual =
        Number(clienteBD.deuda_actual) || 0;

      const creditoDisponibleGuardado = Number(
        clienteBD.credito_disponible,
      );

      const creditoDisponible = Number.isFinite(
        creditoDisponibleGuardado,
      )
        ? creditoDisponibleGuardado
        : Math.max(0, limiteCredito - deudaActual);

      if (limiteCredito <= 0) {
        throw new Error(
          "El cliente no tiene una línea de crédito asignada.",
        );
      }

      if (montoTotal > creditoDisponible) {
        throw new Error(
          `El cliente solo dispone de $${Math.max(
            0,
            creditoDisponible,
          ).toLocaleString("es-MX")} de crédito.`,
        );
      }

      const fechaEmision = convertirFechaFormulario(
        formData.emision,
      );

      const fechaVencimiento = convertirFechaFormulario(
        formData.vencimiento,
      );

      if (fechaVencimiento < fechaEmision) {
        throw new Error(
          "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
        );
      }

      const batch = writeBatch(db);
      const facturaRef = doc(
        collection(db, FACTURAS_COLLECTION),
      );

      const payload = {
        id: facturaRef.id,
        cliente_id: clienteBD.id,
        cliente: clienteBD.nombre || formData.cliente || "S/N",
        grupo: String(
          formData.grupo || clienteBD.grupo || "General",
        ),
        folio: String(formData.folio || "").trim(),
        monto_total: montoTotal,
        monto_pagado: 0,
        saldo_pendiente: montoTotal,
        moneda: "MXN",
        emision: Timestamp.fromDate(fechaEmision),
        vencimiento: Timestamp.fromDate(fechaVencimiento),
        observaciones: String(
          formData.observaciones || "",
        ).trim(),
        estatus: "Pendiente",
        abonos: [],
        createdAt: serverTimestamp(),
      };

      if (!payload.folio) {
        throw new Error(
          "El número o folio de la factura es obligatorio.",
        );
      }

      batch.set(facturaRef, payload);

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

      batch.update(clienteRef, {
        deuda_actual: increment(montoTotal),
        credito_disponible: increment(-montoTotal),
        updatedAt: serverTimestamp(),
      });

      const naceVencida = esFacturaVencida(payload);

      const statsPayload = {
        facturas_total: increment(1),
        facturas_pendientes: increment(1),
        cartera_total: increment(montoTotal),
        total_facturado: increment(montoTotal),
        ultima_actualizacion: serverTimestamp(),
      };

      if (naceVencida) {
        statsPayload.facturas_vencidas = increment(1);
        statsPayload.cartera_vencida = increment(montoTotal);
      }

      const statsRef = doc(
        db,
        STATS_COLLECTION,
        STATS_DOC,
      );

      batch.set(statsRef, statsPayload, { merge: true });

      const auditRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(auditRef, {
        actor_uid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Creación",
        cliente: payload.cliente,
        detalle: `Se generó la factura ${payload.folio} por $${montoTotal.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: {
          ...payload,
          id: facturaRef.id,
        },
      };
    } catch (error) {
      console.error(
        "Error crítico al emitir factura:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  registrarAbono: async ({
    factura,
    montoAbonado,
    metodoPago,
    clientes,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const saldoActual =
        Number(factura.saldo_pendiente) || 0;

      const monto = redondearMoneda(montoAbonado);

      if (monto <= 0) {
        throw new Error(
          "El monto del abono debe ser mayor a cero.",
        );
      }

      if (monto > saldoActual) {
        throw new Error(
          `El abono no puede superar el saldo pendiente de $${saldoActual.toLocaleString("es-MX")}.`,
        );
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === factura.cliente_id,
      );

      if (!clienteBD) {
        throw new Error(
          "No se encontró el cliente enlazado mediante cliente_id.",
        );
      }

      const nuevoSaldo = redondearMoneda(
        saldoActual - monto,
      );

      const montoPagadoActual = Number.isFinite(
        Number(factura.monto_pagado),
      )
        ? Number(factura.monto_pagado)
        : Math.max(
            0,
            (Number(factura.monto_total) || 0) -
              saldoActual,
          );

      const nuevoMontoPagado = redondearMoneda(
        montoPagadoActual + monto,
      );

      const nuevoEstatus =
        nuevoSaldo === 0
          ? "Pagada"
          : factura.estatus === "Vencida"
            ? "Vencida"
            : factura.estatus === "Reprogramado"
              ? "Reprogramado"
              : esFacturaVencida(factura)
                ? "Vencida"
                : "Pendiente";

      const nuevoAbono = {
        id_abono: `abn-${Date.now()}`,
        fecha: Timestamp.now(),
        monto,
        metodo: metodoPago,
        registrado_por: userName || "Usuario",
        saldo_anterior: saldoActual,
        saldo_restante: nuevoSaldo,
      };

      const batch = writeBatch(db);

      const facturaRef = doc(
        db,
        FACTURAS_COLLECTION,
        factura.id,
      );

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayUnion(nuevoAbono),
        updatedAt: serverTimestamp(),
      });

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

      batch.update(clienteRef, {
        deuda_actual: increment(-monto),
        credito_disponible: increment(monto),
        monto_ultimo_pago: monto,
        fecha_ultimo_pago: serverTimestamp(),
        metodo_ultimo_pago: metodoPago,
        ultimo_deposito_monto: monto,
        ultimo_deposito_fecha: serverTimestamp(),
        ultimo_deposito_metodo: metodoPago,
        updatedAt: serverTimestamp(),
      });

      const statsPayload = {
        cartera_total: increment(-monto),
        ingresos_mes: increment(monto),
        ingresos_semana: increment(monto),
        cobrado_historico: increment(monto),
        abonos_registrados: increment(monto),
        ultima_actualizacion: serverTimestamp(),
      };

      const estabaVencida = esFacturaVencida(factura);

      if (estabaVencida) {
        statsPayload.cartera_vencida = increment(-monto);
      }

      if (nuevoSaldo === 0) {
        statsPayload.facturas_pagadas = increment(1);
        statsPayload.facturas_pendientes = increment(-1);
        statsPayload.total_liquidado = increment(
          Number(factura.monto_total) || 0,
        );

        if (estabaVencida) {
          statsPayload.facturas_vencidas = increment(-1);
        }
      }

      const statsRef = doc(
        db,
        STATS_COLLECTION,
        STATS_DOC,
      );

      batch.set(statsRef, statsPayload, { merge: true });

      const auditRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(auditRef, {
        actor_uid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Abono",
        cliente: factura.cliente || clienteBD.nombre,
        detalle: `Abono de $${monto.toLocaleString("es-MX")} registrado vía ${metodoPago} a la factura ${factura.folio}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: nuevoAbono,
      };
    } catch (error) {
      console.error(
        "Error al registrar el abono:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarAbono: async ({
    idFactura,
    idAbono,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const facturaRef = doc(
        db,
        FACTURAS_COLLECTION,
        idFactura,
      );

      const facturaSnapshot = await getDoc(facturaRef);

      if (!facturaSnapshot.exists()) {
        throw new Error("La factura no fue encontrada.");
      }

      const factura = {
        id: facturaSnapshot.id,
        ...facturaSnapshot.data(),
      };

      const abonosFactura = Array.isArray(factura.abonos)
        ? factura.abonos
        : [];

      const abonoTarget = abonosFactura.find(
        (abono) => abono.id_abono === idAbono,
      );

      if (!abonoTarget) {
        throw new Error("El abono no fue encontrado.");
      }

      if (!factura.cliente_id) {
        throw new Error(
          "La factura no contiene un cliente_id válido.",
        );
      }

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        factura.cliente_id,
      );

      const clienteSnapshot = await getDoc(clienteRef);

      if (!clienteSnapshot.exists()) {
        throw new Error(
          "No se encontró el cliente enlazado mediante cliente_id.",
        );
      }

      const clienteBD = {
        id: clienteSnapshot.id,
        ...clienteSnapshot.data(),
      };

      const montoAbono = Number(abonoTarget.monto) || 0;

      if (montoAbono <= 0) {
        throw new Error(
          "El abono seleccionado contiene un monto inválido.",
        );
      }

      const saldoActual =
        Number(factura.saldo_pendiente) || 0;

      const nuevoSaldo = redondearMoneda(
        saldoActual + montoAbono,
      );

      const montoTotal =
        Number(factura.monto_total) || 0;

      if (nuevoSaldo > montoTotal) {
        throw new Error(
          "La reversión produciría un saldo superior al monto total de la factura.",
        );
      }

      const montoPagadoActual = Number.isFinite(
        Number(factura.monto_pagado),
      )
        ? Number(factura.monto_pagado)
        : Math.max(0, montoTotal - saldoActual);

      const nuevoMontoPagado = redondearMoneda(
        Math.max(0, montoPagadoActual - montoAbono),
      );

      const pasaAVencida =
        nuevoSaldo > 0 && esFacturaVencida(factura);

      const nuevoEstatus = pasaAVencida
        ? "Vencida"
        : nuevoSaldo > 0
          ? "Pendiente"
          : "Pagada";

      const facturasClienteQuery = query(
        collection(db, FACTURAS_COLLECTION),
        where("cliente_id", "==", factura.cliente_id),
      );

      const facturasClienteSnapshot = await getDocs(
        facturasClienteQuery,
      );

      const abonosRestantes = [];

      facturasClienteSnapshot.docs.forEach((documento) => {
        const data = documento.data();
        const abonos = Array.isArray(data.abonos) ? data.abonos : [];

        abonos.forEach((abono) => {
          const esAbonoEliminado =
            documento.id === idFactura &&
            abono.id_abono === idAbono;

          if (!esAbonoEliminado) {
            abonosRestantes.push(abono);
          }
        });
      });

      abonosRestantes.sort((primerAbono, segundoAbono) => {
        const fechaPrimera = primerAbono.fecha?.toDate
          ? primerAbono.fecha.toDate().getTime()
          : new Date(primerAbono.fecha).getTime();

        const fechaSegunda = segundoAbono.fecha?.toDate
          ? segundoAbono.fecha.toDate().getTime()
          : new Date(segundoAbono.fecha).getTime();

        return fechaSegunda - fechaPrimera;
      });

      const ultimoAbono = abonosRestantes[0];
      const batch = writeBatch(db);

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayRemove(abonoTarget),
        updatedAt: serverTimestamp(),
      });

      const clienteUpdatePayload = {
        deuda_actual: increment(montoAbono),
        credito_disponible: increment(-montoAbono),
        updatedAt: serverTimestamp(),
      };

      if (ultimoAbono) {
        clienteUpdatePayload.monto_ultimo_pago = ultimoAbono.monto;
        clienteUpdatePayload.fecha_ultimo_pago = ultimoAbono.fecha;
        clienteUpdatePayload.metodo_ultimo_pago = ultimoAbono.metodo;
        clienteUpdatePayload.ultimo_deposito_monto = ultimoAbono.monto;
        clienteUpdatePayload.ultimo_deposito_fecha = ultimoAbono.fecha;
        clienteUpdatePayload.ultimo_deposito_metodo = ultimoAbono.metodo;
      } else {
        clienteUpdatePayload.monto_ultimo_pago = null;
        clienteUpdatePayload.fecha_ultimo_pago = null;
        clienteUpdatePayload.metodo_ultimo_pago = null;
        clienteUpdatePayload.ultimo_deposito_monto = null;
        clienteUpdatePayload.ultimo_deposito_fecha = null;
        clienteUpdatePayload.ultimo_deposito_metodo = null;
      }

      batch.update(clienteRef, clienteUpdatePayload);

      const statsPayload = {
        cartera_total: increment(montoAbono),
        cobrado_historico: increment(-montoAbono),
        abonos_registrados: increment(-montoAbono),
        ultima_actualizacion: serverTimestamp(),
      };

      if (esMismoMes(abonoTarget.fecha)) {
        statsPayload.ingresos_mes = increment(-montoAbono);
      }

      if (esMismaSemana(abonoTarget.fecha)) {
        statsPayload.ingresos_semana = increment(-montoAbono);
      }

      if (pasaAVencida) {
        statsPayload.cartera_vencida = increment(montoAbono);
      }

      if (factura.estatus === "Pagada" && nuevoSaldo > 0) {
        statsPayload.facturas_pagadas = increment(-1);
        statsPayload.facturas_pendientes = increment(1);
        statsPayload.total_liquidado = increment(-montoTotal);

        if (pasaAVencida) {
          statsPayload.facturas_vencidas = increment(1);
        }
      }

      const statsRef = doc(
        db,
        STATS_COLLECTION,
        STATS_DOC,
      );

      batch.set(statsRef, statsPayload, { merge: true });

      const auditRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(auditRef, {
        actor_uid,
        usuario: userName || "Usuario",
        modulo: "Facturación",
        tipo: "Eliminación de Abono",
        cliente: factura.cliente || clienteBD.nombre,
        detalle: `Se anuló un abono de $${montoAbono.toLocaleString("es-MX")} de la factura ${factura.folio}. El saldo y los indicadores fueron restaurados.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error al eliminar el abono:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  modificarFactura: async ({
    idFactura,
    formData,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!idFactura) {
      return {
        success: false,
        error: "No se identificó la factura que será modificada.",
      };
    }

    try {
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const facturaAnterior = facturaSnap.data();

        if (facturaAnterior.estatus === "Cancelada") {
          throw new Error(
            "Las facturas canceladas no pueden editarse desde este formulario.",
          );
        }

        const clienteAnteriorId = facturaAnterior.cliente_id;
        const clienteNuevoId = String(formData?.cliente_id || "").trim();

        if (!clienteAnteriorId || !clienteNuevoId) {
          throw new Error(
            "La factura debe conservar un cliente enlazado mediante cliente_id.",
          );
        }

        const clienteAnteriorRef = doc(
          db,
          CLIENTES_COLLECTION,
          clienteAnteriorId,
        );
        const clienteNuevoRef = doc(
          db,
          CLIENTES_COLLECTION,
          clienteNuevoId,
        );

        const clienteAnteriorSnap = await transaction.get(clienteAnteriorRef);
        const clienteNuevoSnap =
          clienteNuevoId === clienteAnteriorId
            ? clienteAnteriorSnap
            : await transaction.get(clienteNuevoRef);

        if (!clienteAnteriorSnap.exists()) {
          throw new Error(
            "No se encontró el cliente original enlazado a la factura.",
          );
        }

        if (!clienteNuevoSnap.exists()) {
          throw new Error("El nuevo cliente seleccionado no existe.");
        }

        const clienteAnterior = clienteAnteriorSnap.data();
        const clienteNuevo = clienteNuevoSnap.data();
        const cambiaCliente = clienteAnteriorId !== clienteNuevoId;

        if (
          clienteNuevo.activo === false ||
          clienteNuevo.estatus === "Inactivo"
        ) {
          throw new Error(
            "No se puede asignar la factura a un cliente inactivo.",
          );
        }

        const montoAnterior = redondearMoneda(
          facturaAnterior.monto_total,
        );
        const saldoAnterior = redondearMoneda(
          facturaAnterior.saldo_pendiente,
        );
        const montoPagado = redondearMoneda(
          Number.isFinite(Number(facturaAnterior.monto_pagado))
            ? facturaAnterior.monto_pagado
            : montoAnterior - saldoAnterior,
        );
        const abonos = Array.isArray(facturaAnterior.abonos)
          ? facturaAnterior.abonos
          : [];

        if (cambiaCliente && (montoPagado > 0 || abonos.length > 0)) {
          throw new Error(
            "No se puede cambiar el cliente de una factura que ya tiene abonos. Corrige los demás datos o revierte primero sus pagos.",
          );
        }

        const montoNuevo = redondearMoneda(formData?.monto_total);

        if (montoNuevo <= 0) {
          throw new Error(
            "El monto total de la factura debe ser mayor a cero.",
          );
        }

        if (montoNuevo < montoPagado) {
          throw new Error(
            `El nuevo monto no puede ser menor a los $${montoPagado.toLocaleString("es-MX")} que ya fueron pagados.`,
          );
        }

        const fechaEmision = convertirFechaFormulario(formData?.emision);
        const fechaVencimiento = convertirFechaFormulario(
          formData?.vencimiento,
        );

        if (fechaVencimiento < fechaEmision) {
          throw new Error(
            "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
          );
        }

        const folioNuevo = String(formData?.folio || "").trim();

        if (!folioNuevo) {
          throw new Error("El folio de la factura es obligatorio.");
        }

        const saldoNuevo = redondearMoneda(montoNuevo - montoPagado);
        const estatusAnteriorReal = calcularEstatusFinanciero({
          saldo: saldoAnterior,
          vencimiento: facturaAnterior.vencimiento,
        });
        const estatusNuevo = calcularEstatusFinanciero({
          saldo: saldoNuevo,
          vencimiento: fechaVencimiento,
        });

        const limiteAnterior = redondearMoneda(
          clienteAnterior.limite_credito,
        );
        const deudaAnteriorGuardada = redondearMoneda(
          clienteAnterior.deuda_actual,
        );
        const disponibleAnteriorGuardado = redondearMoneda(
          clienteAnterior.credito_disponible,
        );

        if (!cambiaCliente) {
          const diferenciaSaldo = redondearMoneda(
            saldoNuevo - saldoAnterior,
          );
          const nuevaDeuda = redondearMoneda(
            deudaAnteriorGuardada + diferenciaSaldo,
          );
          const nuevoDisponible = redondearMoneda(
            disponibleAnteriorGuardado - diferenciaSaldo,
          );

          if (nuevaDeuda < 0) {
            throw new Error(
              "La edición produciría una deuda negativa en el cliente.",
            );
          }

          if (
            nuevoDisponible < 0 ||
            nuevoDisponible > limiteAnterior
          ) {
            throw new Error(
              `El cliente no cuenta con crédito suficiente. Disponible actual: $${disponibleAnteriorGuardado.toLocaleString("es-MX")}.`,
            );
          }

          if (diferenciaSaldo !== 0) {
            transaction.update(clienteAnteriorRef, {
              deuda_actual: nuevaDeuda,
              credito_disponible: nuevoDisponible,
              updatedAt: serverTimestamp(),
            });
          }
        } else {
          const limiteNuevoCliente = redondearMoneda(
            clienteNuevo.limite_credito,
          );
          const deudaNuevoCliente = redondearMoneda(
            clienteNuevo.deuda_actual,
          );
          const disponibleNuevoCliente = redondearMoneda(
            clienteNuevo.credito_disponible,
          );

          const deudaRestauradaAnterior = redondearMoneda(
            deudaAnteriorGuardada - saldoAnterior,
          );
          const disponibleRestauradoAnterior = redondearMoneda(
            disponibleAnteriorGuardado + saldoAnterior,
          );
          const deudaAplicadaNuevo = redondearMoneda(
            deudaNuevoCliente + saldoNuevo,
          );
          const disponibleAplicadoNuevo = redondearMoneda(
            disponibleNuevoCliente - saldoNuevo,
          );

          if (
            deudaRestauradaAnterior < 0 ||
            disponibleRestauradoAnterior > limiteAnterior
          ) {
            throw new Error(
              "Los datos financieros del cliente original no permiten mover la factura de forma segura.",
            );
          }

          if (
            limiteNuevoCliente <= 0 ||
            disponibleAplicadoNuevo < 0 ||
            disponibleAplicadoNuevo > limiteNuevoCliente
          ) {
            throw new Error(
              `El nuevo cliente no tiene crédito suficiente para recibir un saldo de $${saldoNuevo.toLocaleString("es-MX")}.`,
            );
          }

          transaction.update(clienteAnteriorRef, {
            deuda_actual: deudaRestauradaAnterior,
            credito_disponible: disponibleRestauradoAnterior,
            updatedAt: serverTimestamp(),
          });

          transaction.update(clienteNuevoRef, {
            deuda_actual: deudaAplicadaNuevo,
            credito_disponible: disponibleAplicadoNuevo,
            updatedAt: serverTimestamp(),
          });
        }

        const valoresAnteriores = {
          cliente_id: clienteAnteriorId,
          cliente: facturaAnterior.cliente || clienteAnterior.nombre || "S/N",
          grupo: String(facturaAnterior.grupo || "General"),
          folio: String(facturaAnterior.folio || ""),
          monto_total: montoAnterior,
          emision: convertirFechaAString(facturaAnterior.emision),
          vencimiento: convertirFechaAString(
            facturaAnterior.vencimiento,
          ),
          observaciones: String(facturaAnterior.observaciones || ""),
        };

        const valoresNuevos = {
          cliente_id: clienteNuevoId,
          cliente: clienteNuevo.nombre || "S/N",
          grupo: String(formData?.grupo || clienteNuevo.grupo || "General"),
          folio: folioNuevo,
          monto_total: montoNuevo,
          emision: convertirFechaAString(fechaEmision),
          vencimiento: convertirFechaAString(fechaVencimiento),
          observaciones: String(formData?.observaciones || "").trim(),
        };

        const camposComparables = [
          "cliente_id",
          "grupo",
          "folio",
          "monto_total",
          "emision",
          "vencimiento",
          "observaciones",
        ];

        const camposModificados = camposComparables.filter((campo) => {
          if (campo === "cliente_id") {
            return valoresAnteriores.cliente_id !== valoresNuevos.cliente_id;
          }

          return !valoresIguales(
            valoresAnteriores[campo],
            valoresNuevos[campo],
          );
        });

        if (camposModificados.length === 0) {
          return {
            sinCambios: true,
            factura: facturaAnterior,
          };
        }

        const detalleCambios = camposModificados.map((campo) => {
          const valorAnterior =
            campo === "cliente_id"
              ? valoresAnteriores.cliente
              : valoresAnteriores[campo];
          const valorNuevo =
            campo === "cliente_id"
              ? valoresNuevos.cliente
              : valoresNuevos[campo];

          return `${ETIQUETAS_EDICION[campo]}: ${formatearValorAuditoria(
            campo,
            valorAnterior,
          )} → ${formatearValorAuditoria(campo, valorNuevo)}`;
        });

        const facturaUpdate = {
          cliente_id: clienteNuevoId,
          cliente: valoresNuevos.cliente,
          grupo: valoresNuevos.grupo,
          folio: valoresNuevos.folio,
          monto_total: montoNuevo,
          moneda: "MXN",
          emision: Timestamp.fromDate(fechaEmision),
          vencimiento: Timestamp.fromDate(fechaVencimiento),
          observaciones: valoresNuevos.observaciones,
          monto_pagado: montoPagado,
          saldo_pendiente: saldoNuevo,
          estatus: estatusNuevo,
          ultima_edicion_audit_id: auditRef.id,
          ultima_edicion_actor_uid: actor_uid,
          ultima_edicion_at: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        transaction.update(facturaRef, facturaUpdate);

        const estabaVencida = estatusAnteriorReal === "Vencida";
        const quedaVencida = estatusNuevo === "Vencida";
        const estabaPagada = saldoAnterior === 0;
        const quedaPagada = saldoNuevo === 0;
        const estabaPendiente = saldoAnterior > 0;
        const quedaPendiente = saldoNuevo > 0;

        const diferenciaCartera = redondearMoneda(
          saldoNuevo - saldoAnterior,
        );
        const diferenciaTotalFacturado = redondearMoneda(
          montoNuevo - montoAnterior,
        );
        const diferenciaCarteraVencida = redondearMoneda(
          (quedaVencida ? saldoNuevo : 0) -
            (estabaVencida ? saldoAnterior : 0),
        );
        const diferenciaPendientes =
          Number(quedaPendiente) - Number(estabaPendiente);
        const diferenciaPagadas =
          Number(quedaPagada) - Number(estabaPagada);
        const diferenciaVencidas =
          Number(quedaVencida) - Number(estabaVencida);
        const diferenciaLiquidado = redondearMoneda(
          (quedaPagada ? montoNuevo : 0) -
            (estabaPagada ? montoAnterior : 0),
        );

        const statsUpdate = {
          ultima_actualizacion: serverTimestamp(),
        };

        if (diferenciaCartera !== 0) {
          statsUpdate.cartera_total = increment(diferenciaCartera);
        }
        if (diferenciaTotalFacturado !== 0) {
          statsUpdate.total_facturado = increment(
            diferenciaTotalFacturado,
          );
        }
        if (diferenciaCarteraVencida !== 0) {
          statsUpdate.cartera_vencida = increment(
            diferenciaCarteraVencida,
          );
        }
        if (diferenciaPendientes !== 0) {
          statsUpdate.facturas_pendientes = increment(
            diferenciaPendientes,
          );
        }
        if (diferenciaPagadas !== 0) {
          statsUpdate.facturas_pagadas = increment(diferenciaPagadas);
        }
        if (diferenciaVencidas !== 0) {
          statsUpdate.facturas_vencidas = increment(
            diferenciaVencidas,
          );
        }
        if (diferenciaLiquidado !== 0) {
          statsUpdate.total_liquidado = increment(
            diferenciaLiquidado,
          );
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        const anterioresAudit = {};
        const nuevosAudit = {};

        camposModificados.forEach((campo) => {
          if (campo === "cliente_id") {
            anterioresAudit.cliente_id = valoresAnteriores.cliente_id;
            anterioresAudit.cliente = valoresAnteriores.cliente;
            nuevosAudit.cliente_id = valoresNuevos.cliente_id;
            nuevosAudit.cliente = valoresNuevos.cliente;
          } else {
            anterioresAudit[campo] = valoresAnteriores[campo];
            nuevosAudit[campo] = valoresNuevos[campo];
          }
        });

        transaction.set(auditRef, {
          actor_uid,
          usuario: userName || "Usuario",
          modulo: "Facturación",
          tipo: "Edición de Factura",
          factura_id: idFactura,
          folio: valoresNuevos.folio,
          cliente: valoresNuevos.cliente,
          cliente_anterior_id: valoresAnteriores.cliente_id,
          cliente_nuevo_id: valoresNuevos.cliente_id,
          campos_modificados: camposModificados,
          valores_anteriores: anterioresAudit,
          valores_nuevos: nuevosAudit,
          detalle: detalleCambios.join(" | "),
          serverTime: serverTimestamp(),
        });

        return {
          sinCambios: false,
          camposModificados,
          factura: {
            id: idFactura,
            ...facturaAnterior,
            ...facturaUpdate,
          },
        };
      });

      return {
        success: true,
        ...resultado,
      };
    } catch (error) {
      console.error("Error al modificar la factura:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarFactura: async ({
    idFactura,
    userName,
    actor_uid,
  }) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    if (!idFactura) {
      return {
        success: false,
        error: "No se identificó la factura que será eliminada.",
      };
    }

    try {
      const facturaRef = doc(db, FACTURAS_COLLECTION, idFactura);
      const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
      const auditRef = doc(collection(db, ACTIVIDAD_COLLECTION));

      const resultado = await runTransaction(db, async (transaction) => {
        const facturaSnap = await transaction.get(facturaRef);

        if (!facturaSnap.exists()) {
          throw new Error("La factura ya no existe en Firestore.");
        }

        const factura = {
          id: facturaSnap.id,
          ...facturaSnap.data(),
        };

        if (!factura.cliente_id) {
          throw new Error(
            "La factura no tiene cliente_id y no puede eliminarse de forma segura.",
          );
        }

        const clienteRef = doc(
          db,
          CLIENTES_COLLECTION,
          factura.cliente_id,
        );

        const clienteSnap = await transaction.get(clienteRef);

        if (!clienteSnap.exists()) {
          throw new Error(
            "No se encontró el cliente enlazado a la factura.",
          );
        }

        const cliente = clienteSnap.data();

        const montoTotal = redondearMoneda(factura.monto_total);
        const saldoPendiente = redondearMoneda(
          factura.saldo_pendiente,
        );
        const montoPagado = redondearMoneda(
          Number.isFinite(Number(factura.monto_pagado))
            ? factura.monto_pagado
            : Math.max(0, montoTotal - saldoPendiente),
        );

        const abonos = Array.isArray(factura.abonos)
          ? factura.abonos
          : [];

        const totalAbonosRegistrados = redondearMoneda(
          abonos.reduce(
            (total, abono) => total + (Number(abono.monto) || 0),
            0,
          ),
        );

        const abonosMes = redondearMoneda(
          abonos.reduce(
            (total, abono) =>
              total +
              (esMismoMes(abono.fecha) ? Number(abono.monto) || 0 : 0),
            0,
          ),
        );

        const abonosSemana = redondearMoneda(
          abonos.reduce(
            (total, abono) =>
              total +
              (esMismaSemana(abono.fecha)
                ? Number(abono.monto) || 0
                : 0),
            0,
          ),
        );

        const estabaVencida =
          saldoPendiente > 0 && esFacturaVencida(factura);
        const estabaPagada = saldoPendiente === 0;
        const estabaPendiente = saldoPendiente > 0;

        const limiteCredito = redondearMoneda(cliente.limite_credito);
        const deudaActual = redondearMoneda(cliente.deuda_actual);
        const creditoDisponible = redondearMoneda(
          cliente.credito_disponible,
        );

        const nuevaDeuda = Math.max(
          0,
          redondearMoneda(deudaActual - saldoPendiente),
        );

        const nuevoCreditoDisponible =
          limiteCredito > 0
            ? Math.min(
                limiteCredito,
                Math.max(
                  0,
                  redondearMoneda(
                    creditoDisponible + saldoPendiente,
                  ),
                ),
              )
            : 0;

        transaction.update(clienteRef, {
          deuda_actual: nuevaDeuda,
          credito_disponible: nuevoCreditoDisponible,
          updatedAt: serverTimestamp(),
        });

        const statsUpdate = {
          facturas_total: increment(-1),
          total_facturado: increment(-montoTotal),
          ultima_actualizacion: serverTimestamp(),
        };

        if (saldoPendiente > 0) {
          statsUpdate.cartera_total = increment(-saldoPendiente);
        }

        if (estabaPendiente) {
          statsUpdate.facturas_pendientes = increment(-1);
        }

        if (estabaPagada) {
          statsUpdate.facturas_pagadas = increment(-1);
          statsUpdate.total_liquidado = increment(-montoTotal);
        }

        if (estabaVencida) {
          statsUpdate.facturas_vencidas = increment(-1);
          statsUpdate.cartera_vencida = increment(-saldoPendiente);
        }

        if (montoPagado > 0) {
          statsUpdate.cobrado_historico = increment(-montoPagado);
        }

        const totalAbonosARevertir =
          totalAbonosRegistrados > 0
            ? totalAbonosRegistrados
            : montoPagado;

        if (totalAbonosARevertir > 0) {
          statsUpdate.abonos_registrados = increment(
            -totalAbonosARevertir,
          );
        }

        if (abonosMes > 0) {
          statsUpdate.ingresos_mes = increment(-abonosMes);
        }

        if (abonosSemana > 0) {
          statsUpdate.ingresos_semana = increment(-abonosSemana);
        }

        transaction.set(statsRef, statsUpdate, { merge: true });

        transaction.set(auditRef, {
          actor_uid,
          usuario: userName || "SU",
          modulo: "Facturación",
          tipo: "Eliminación de Factura",
          factura_id: idFactura,
          folio: factura.folio || "S/F",
          cliente: factura.cliente || cliente.nombre || "S/N",
          cliente_id: factura.cliente_id,
          valores_eliminados: {
            folio: factura.folio || "",
            cliente: factura.cliente || "",
            cliente_id: factura.cliente_id || "",
            monto_total: montoTotal,
            monto_pagado: montoPagado,
            saldo_pendiente: saldoPendiente,
            estatus: factura.estatus || "",
            abonos: abonos.length,
          },
          detalle: `El SU eliminó la factura ${factura.folio || "S/F"} de ${factura.cliente || cliente.nombre || "S/N"}. Se ajustaron saldo del cliente, crédito disponible, métricas globales y auditoría.`,
          serverTime: serverTimestamp(),
        });

        transaction.delete(facturaRef);

        return {
          folio: factura.folio || "S/F",
          cliente: factura.cliente || cliente.nombre || "S/N",
        };
      });

      return {
        success: true,
        data: resultado,
      };
    } catch (error) {
      console.error("Error al eliminar la factura:", error);

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
```
