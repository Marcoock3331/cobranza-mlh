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
- Only files matching these patterns are included: src/pages/Calendario.jsx, src/services/compromisosService.js, src/context/GlobalProvider.jsx, src/context/GlobalContext.js, src/services/facturasConsultaService.js, src/utils/normalizarFactura.js, firestore.rules, firestore.indexes.json, firebase.json
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
firebase.json
firestore.indexes.json
firestore.rules
src/context/GlobalContext.js
src/context/GlobalProvider.jsx
src/pages/Calendario.jsx
src/services/compromisosService.js
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

## File: firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

## File: src/context/GlobalContext.js
```javascript
import { createContext } from "react";

export const GlobalContext = createContext(null);
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

      allow delete: if false;
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
        && request.resource.data.keys().hasAll([
          'cliente_id',
          'cliente_nombre',
          'tipo_evento',
          'motivo',
          'monto',
          'fecha_compromiso',
          'mes_anio',
          'estatus',
          'ultima_accion',
          'historial_acciones',
          'creado_por',
          'createdAt',
          'updatedAt'
        ])
        && request.resource.data.cliente_id is string
        && request.resource.data.cliente_id != ''
        && request.resource.data.cliente_nombre is string
        && request.resource.data.tipo_evento in [
          'Recordatorio',
          'Seguimiento',
          'Promesa'
        ]
        && request.resource.data.motivo is string
        && request.resource.data.monto is number
        && request.resource.data.monto >= 0
        && request.resource.data.fecha_compromiso is timestamp
        && request.resource.data.mes_anio is string
        && request.resource.data.estatus == 'Pendiente'
        && request.resource.data.ultima_accion is map
        && request.resource.data.historial_acciones is list
        && request.resource.data.createdAt is timestamp
        && request.resource.data.updatedAt is timestamp;

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
          request.resource.data.estatus == resource.data.estatus
          || (
            resource.data.estatus in [
              'Pendiente',
              'Reprogramado'
            ]
            && request.resource.data.estatus in [
              'Reprogramado',
              'Completado',
              'Cancelado'
            ]
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
  pathname === "/" ||
  pathname === "/calendario" ||
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

  const eliminarFacturaEnNube = useCallback(async () => {
    window.alert(
      "La anulación de facturas requiere estorno de saldos. Se implementará en el módulo de Facturación.",
    );

    return {
      success: false,
      error: "La anulación de facturas no está habilitada.",
    };
  }, []);

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

## File: src/pages/Calendario.jsx
```javascript
import { useState, useMemo, useContext, useEffect } from "react";
import Select from "react-select";
import { GlobalContext } from "../context/GlobalContext";
import { generarMensajeWA, normalizarTelefonoMX } from "../utils/whatsapp";
import { compromisosService } from "../services/compromisosService";
import { textoSeguro } from "../utils/normalizadores";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Send,
  XCircle,
  Check,
  Plus,
  User,
  Smartphone,
  Eye,
  EyeOff,
  PhoneCall,
  Handshake,
  Loader2,
  CalendarDays,
} from "lucide-react";

export default function Calendario() {
  // BLINDAJE: Extracción de currentUser para firmar las operaciones
  const { facturas, clientes, userName, userRole, currentUser } = useContext(GlobalContext);

  const [fechaActual, setFechaActual] = useState(new Date());
  const añoActual = fechaActual.getFullYear();
  const mesActualNum = fechaActual.getMonth();
  const nombresMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];
  const mesActualTexto = `${nombresMeses[mesActualNum]} ${añoActual}`;
  const primerDiaDelMes = new Date(añoActual, mesActualNum, 1).getDay();
  const diasEnElMes = new Date(añoActual, mesActualNum + 1, 0).getDate();

  const fechaHoy = new Date();
  const hoyDiaExacto = fechaHoy.getDate();
  const hoyMesExacto = fechaHoy.getMonth();
  const hoyAnioExacto = fechaHoy.getFullYear();

  const [modalActivo, setModalActivo] = useState(null);
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);
  const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
  const [mensajeExito, setMensajeExito] = useState({ titulo: "", descripcion: "" });
  const [mostrarCompletados, setMostrarCompletados] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formClienteId, setFormClienteId] = useState(null);
  const [formFacturaSeleccionada, setFormFacturaSeleccionada] = useState("");
  const [formMotivo, setFormMotivo] = useState("");
  const [formTipoEvento, setFormTipoEvento] = useState("Recordatorio");
  const [nuevaFechaReprogramacion, setNuevaFechaReprogramacion] = useState("");

  const [datosWhatsapp, setDatosWhatsapp] = useState({ telefono: "", plantilla: "atrasado", mensaje: "" });
  const [compromisos, setCompromisos] = useState([]);

  useEffect(() => {
    const mesAnioFormat = `${añoActual}-${String(mesActualNum + 1).padStart(2, "0")}`;
    const unsub = compromisosService.escucharCompromisosMes(
      mesAnioFormat,
      (data) => {
        setCompromisos(data);
      },
    );
    return () => unsub();
  }, [mesActualNum, añoActual]);

  const eventosMes = (() => {
    const mapeo = {};
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (facturas) {
      facturas.forEach((f) => {
        if (f.vencimiento) {
          const [fechaParte] = f.vencimiento.split(" ");
          let dia, mes, año;

          if (fechaParte.includes("-")) {
            [año, mes, dia] = fechaParte.split("-").map(Number);
          } else {
            [dia, mes, año] = fechaParte.split("/").map(Number);
          }

          const fechaVencimientoObj = new Date(año, mes - 1, dia);

          if (mes - 1 === mesActualNum && año === añoActual) {
            let estatusEvento = "Pendiente";

            if (f.estatus === "Pagada") estatusEvento = "Completado";
            else if (f.estatus === "Cancelada") estatusEvento = "Cancelado";
            else if (f.estatus === "Reprogramado")
              estatusEvento = "Reprogramado";
            else if (
              f.estatus === "Vencida" ||
              (f.estatus === "Pendiente" && fechaVencimientoObj < hoy)
            ) {
              estatusEvento = "Vencido";
            }

            if (
              !mostrarCompletados &&
              (estatusEvento === "Completado" || estatusEvento === "Cancelado")
            )
              return;

            if (!mapeo[dia]) mapeo[dia] = [];
            mapeo[dia].push({
              id: f.id,
              tipo: "VENCIMIENTO",
              titulo: `Vence ${textoSeguro(f.folio)}`,
              cliente: f.cliente,
              cliente_id: f.cliente_id,
              monto: f.saldo_pendiente ?? f.monto_total ?? 0,
              estatus_evento: estatusEvento,
              telefono: f.telefono || "",
              detalle: f,
              ultima_accion_fecha: f.ultima_accion?.fecha
                ? textoSeguro(f.ultima_accion.fecha)
                : "Reciente",
              responsable_accion: f.ultima_accion?.responsable
                ? textoSeguro(f.ultima_accion.responsable)
                : "Sistema",
            });
          }
        }
      });
    }

    compromisos.forEach((c) => {
      let dia = 1;
      if (c.fecha_compromiso && c.fecha_compromiso.toDate) {
        dia = c.fecha_compromiso.toDate().getDate();
      } else if (c.fecha_compromiso && c.fecha_compromiso.seconds) {
        dia = new Date(c.fecha_compromiso.seconds * 1000).getDate();
      }

      const estatusEvento = c.estatus || "Pendiente";

      if (
        !mostrarCompletados &&
        (estatusEvento === "Completado" || estatusEvento === "Cancelado")
      )
        return;

      if (!mapeo[dia]) mapeo[dia] = [];
      mapeo[dia].push({
        id: c.id,
        tipo: c.tipo_evento || "COMPROMISO",
        titulo: c.motivo,
        cliente: c.cliente_nombre,
        cliente_id: c.cliente_id,
        monto: c.monto,
        telefono: c.telefono || "",
        estatus_evento: estatusEvento,
        detalle: { folio: c.folio_factura, cliente: c.cliente_nombre },
        ultima_accion_fecha: c.ultima_accion_fecha,
        responsable_accion: c.ultima_accion?.responsable
          ? textoSeguro(c.ultima_accion.responsable)
          : "Admin",
      });
    });

    return mapeo;
  })();

  const opcionesClientes = useMemo(() => {
    return clientes
      .filter(
        (c) => c.activo !== false && c.estatus !== "Inactivo",
      )
      .map((c) => ({
        value: c.id,
        label:
          c.nombre +
          (c.numero_cliente ? " - #" + c.numero_cliente : ""),
      }));
  }, [clientes]);

  const facturasClienteSeleccionado = useMemo(() => {
    if (!formClienteId) return [];
    return facturas.filter(
      (f) =>
        f.cliente_id === formClienteId &&
        f.estatus !== "Pagada" &&
        f.estatus !== "Cancelada",
    );
  }, [facturas, formClienteId]);

  const cambiarMes = (direccion) => {
    const nuevaFecha = new Date(fechaActual);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + direccion);
    setFechaActual(nuevaFecha);
  };

  const abrirDia = (dia) => {
    setDiaSeleccionado(dia);
    setModalActivo("verDia");
  };

  const cerrarModal = () => {
    if (isSubmitting) return;
    setModalActivo(null);
    setFormClienteId(null);
    setFormFacturaSeleccionada("");
    setFormMotivo("");
    setFormTipoEvento("Recordatorio");
    setNuevaFechaReprogramacion("");
  };

  const abrirModalWhatsapp = (ev) => {
    setEventoSeleccionado(ev);
    const plantillaInicial =
      ev.estatus_evento === "Vencido"
        ? "atrasado"
        : ev.tipo === "VENCIMIENTO"
          ? "proximo"
          : "manual";

    const datosFacturaFalsa = {
      cliente: ev.cliente,
      folio: ev.detalle?.folio || "S/F",
      saldo_pendiente: ev.monto || 0,
      vencimiento: ev.detalle?.vencimiento || "los próximos días",
    };

    const clienteDB =
      clientes.find((c) => c.id === ev.cliente_id) ||
      clientes.find((c) => c.nombre === ev.cliente);
    const telefonoReal =
      clienteDB?.telefono || ev.telefono || ev.detalle?.telefono || "";

    setDatosWhatsapp({
      telefono: telefonoReal,
      plantilla: plantillaInicial,
      mensaje: generarMensajeWA(plantillaInicial, datosFacturaFalsa),
    });
    setModalActivo("whatsapp");
  };

  const enviarWhatsApp = async () => {
    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    setIsSubmitting(true);
    try {
      const numeroLimpio = normalizarTelefonoMX(datosWhatsapp.telefono);

      if (!numeroLimpio.startsWith("52") || numeroLimpio.length !== 12) {
        alert(
          "El número de teléfono no parece válido. Revisa que tenga 10 dígitos.",
        );
        setIsSubmitting(false);
        return;
      }

      const mensajeCodificado = encodeURIComponent(datosWhatsapp.mensaje);
      const url = `https://wa.me/${numeroLimpio}?text=${mensajeCodificado}`;

      window.open(url, "_blank", "noopener,noreferrer");

      const res = await compromisosService.registrarWhatsAppCompromiso({
        idCompromiso:
          eventoSeleccionado.tipo !== "VENCIMIENTO"
            ? eventoSeleccionado.id
            : null,
        esFacturaAuto: eventoSeleccionado.tipo === "VENCIMIENTO",
        clienteNombre: eventoSeleccionado.cliente,
        tipoMensaje: datosWhatsapp.plantilla,
        userName: userName,
        actor_uid: currentUser.uid // BLINDAJE INYECTADO
      });

      if (res.success) {
        setMensajeExito({
          titulo: "WhatsApp Abierto",
          descripcion: "WhatsApp se abrió y la acción quedó registrada en la bitácora.",
        });
        setModalActivo("exito");
      } else {
        alert(
          "Aviso abierto, pero falló el registro en base de datos: " +
            res.error,
        );
      }
    } catch (error) {
      console.error(error);
      alert("Error inesperado al registrar WhatsApp.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAgregarRecordatorio = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (!formClienteId) {
      alert("Por favor seleccione un cliente desde el buscador.");
      return;
    }

    if (!formMotivo.trim()) {
      alert("Escriba un motivo válido.");
      return;
    }

    setIsSubmitting(true);

    const clienteSeleccionado = clientes.find((c) => c.id === formClienteId);

    if (!clienteSeleccionado) {
      setIsSubmitting(false);
      alert(
        "No se pudo enlazar el cliente seleccionado. Recarga la página e intenta de nuevo.",
      );
      return;
    }

    const mesFormat = String(mesActualNum + 1).padStart(2, "0");
    const diaFormat = String(diaSeleccionado).padStart(2, "0");
    const fechaArmada = `${añoActual}-${mesFormat}-${diaFormat}`;

    let facturaIdReal = null;
    let folioFacturaReal = "S/F";
    let montoReal = 0;

    if (formFacturaSeleccionada) {
      const facObj = facturas.find((f) => f.id === formFacturaSeleccionada);
      if (facObj) {
        facturaIdReal = facObj.id;
        folioFacturaReal = facObj.folio || "S/F";
        montoReal = Number(facObj.saldo_pendiente || facObj.monto_total || 0);
      }
    }

    const dataCompromiso = {
      fecha: fechaArmada,
      cliente_id: clienteSeleccionado.id,
      cliente_nombre: clienteSeleccionado.nombre,
      factura_id: facturaIdReal,
      folio_factura: folioFacturaReal,
      tipo_evento: formTipoEvento,
      motivo: formMotivo,
      monto: montoReal,
      telefono: clienteSeleccionado.telefono || "",
    };

    const res = await compromisosService.crearCompromiso(
      dataCompromiso,
      userName,
      currentUser.uid // BLINDAJE INYECTADO
    );
    setIsSubmitting(false);

    if (res.success) {
      cerrarModal();
      setMensajeExito({
        titulo: "Seguimiento Guardado",
        descripcion: `El evento ha sido clasificado y agendado exitosamente en la nube.`,
      });
      setModalActivo("exito");
    } else {
      alert("Error al guardar el compromiso: " + res.error);
    }
  };

  const procesarReprogramacion = async (e) => {
    e.preventDefault();

    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (!nuevaFechaReprogramacion) return;

    setIsSubmitting(true);
    const res = await compromisosService.reprogramarCompromiso(
      eventoSeleccionado.id,
      nuevaFechaReprogramacion,
      eventoSeleccionado.cliente,
      userName,
      currentUser.uid // BLINDAJE INYECTADO
    );
    setIsSubmitting(false);

    if (res.success) {
      cerrarModal();
      setMensajeExito({
        titulo: "Compromiso Reprogramado",
        descripcion: `La nueva fecha ha sido pactada y guardada en el historial.`,
      });
      setModalActivo("exito");
    } else {
      alert("Error al reprogramar: " + res.error);
    }
  };

  const handleActualizarEstado = async (evento, nuevoEstatus) => {
    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (evento.tipo === "VENCIMIENTO") {
      alert(
        "Acción denegada: El estado de las facturas automáticas solo puede modificarse ingresando un abono en el módulo de Facturación.",
      );
      return;
    }

    if (nuevoEstatus === evento.estatus_evento) return;

    if (["Completado", "Cancelado"].includes(evento.estatus_evento)) {
      alert(
        "Este compromiso ya fue cerrado y no puede cambiar nuevamente de estado.",
      );
      return;
    }

    if (nuevoEstatus === "Completado") {
      const res = await compromisosService.completarCompromiso(
        evento.id,
        evento.cliente,
        userName,
        currentUser.uid // BLINDAJE INYECTADO
      );
      if (!res.success)
        alert("No se pudo actualizar el compromiso: " + res.error);
    } else if (nuevoEstatus === "Cancelado") {
      const res = await compromisosService.cancelarCompromiso(
        evento.id,
        evento.cliente,
        userName,
        currentUser.uid // BLINDAJE INYECTADO
      );
      if (!res.success)
        alert("No se pudo cancelar el compromiso: " + res.error);
    } else if (nuevoEstatus === "Reprogramado") {
      setEventoSeleccionado(evento);
      setModalActivo("reprogramar");
    }
  };

  const handleEliminarCompromiso = async (evento) => {
    if (!currentUser?.uid) {
      alert("Error: No se identificó al usuario responsable de la acción.");
      return;
    }

    if (
      window.confirm(
        `¿Estás seguro de eliminar permanentemente este registro del sistema?`,
      )
    ) {
      const res = await compromisosService.eliminarCompromiso(
        evento.id,
        evento.cliente,
        userName,
        currentUser.uid // BLINDAJE INYECTADO
      );
      if (!res.success)
        alert("No se pudo eliminar el compromiso: " + res.error);
    }
  };

  const customSelectStyles = {
    control: (base) => ({
      ...base,
      fontSize: "0.75rem",
      borderColor: "#e5e7eb",
      boxShadow: "none",
      "&:hover": { borderColor: "#60a5fa" },
    }),
    option: (base) => ({
      ...base,
      fontSize: "0.75rem",
    }),
    menu: (base) => ({
      ...base,
      zIndex: 9999,
    }),
  };

  return (
    <div className="flex flex-col space-y-6 animate-fade-in text-sm relative pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0a192f] flex items-center">
            <CalendarIcon className="h-6 w-6 mr-2 text-blue-600" /> Agenda de
            Cobros y Compromisos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitoreo de promesas pactadas y vencimientos automáticos de cuentas
            por cobrar.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-2">
            <h2 className="font-black text-[#0a192f] text-base tracking-tight uppercase font-mono">
              {mesActualTexto}
            </h2>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setMostrarCompletados(!mostrarCompletados)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center transition-colors flex-1 sm:flex-none justify-center border ${mostrarCompletados ? "bg-gray-100 text-gray-700 border-gray-200" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}
            >
              {mostrarCompletados ? (
                <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              ) : (
                <Eye className="h-3.5 w-3.5 mr-1.5" />
              )}
              {mostrarCompletados ? "Ocultar Resueltos" : "Mostrar Resueltos"}
            </button>

            <div className="flex items-center space-x-1 shrink-0">
              <button
                onClick={() => cambiarMes(-1)}
                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-all text-gray-600"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setFechaActual(new Date())}
                className="px-3 py-1.5 text-[11px] font-bold text-blue-600 border border-transparent hover:bg-blue-50 rounded-md transition-all"
              >
                Hoy
              </button>
              <button
                onClick={() => cambiarMes(1)}
                className="p-1.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-md transition-all text-gray-600"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar w-full">
          <div className="min-w-[800px] md:min-w-full">
            <div className="grid grid-cols-7 bg-[#0a192f] text-white text-[10px] font-black uppercase tracking-wider text-center py-2 border-b border-gray-200">
              <div>Dom</div>
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
            </div>

            <div className="p-0">
              <div className="grid grid-cols-7 gap-0 bg-gray-100 border-l border-t border-gray-100">
                {Array.from({ length: primerDiaDelMes }).map((_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="bg-gray-50/50 min-h-[90px] border-b border-r border-gray-100"
                  />
                ))}
                {Array.from({ length: diasEnElMes }).map((_, idx) => {
                  const dia = idx + 1;
                  const listaEventos = eventosMes[dia] || [];
                  const esHoy =
                    dia === hoyDiaExacto &&
                    mesActualNum === hoyMesExacto &&
                    añoActual === hoyAnioExacto;

                  return (
                    <div
                      key={`dia-${dia}`}
                      onClick={() => abrirDia(dia)}
                      className={`min-h-[90px] bg-white border-b border-r border-gray-100 p-1.5 flex flex-col justify-between transition-colors hover:bg-gray-50/60 cursor-pointer ${esHoy ? "bg-blue-50/30" : ""}`}
                    >
                      <div className="flex justify-between items-center">
                        <span
                          className={`text-xs font-bold font-mono h-5 w-5 flex items-center justify-center rounded-full ${esHoy ? "bg-blue-600 text-white shadow-sm" : "text-gray-700"}`}
                        >
                          {dia}
                        </span>
                      </div>
                      <div className="space-y-1 mt-1 flex-1 overflow-hidden">
                        {listaEventos.slice(0, 3).map((ev) => {
                          let badgeColor =
                            "bg-blue-50 text-blue-600 border-blue-100";
                          if (ev.estatus_evento === "Completado")
                            badgeColor =
                              "bg-green-50 text-green-600 border-green-100";
                          else if (ev.estatus_evento === "Vencido")
                            badgeColor =
                              "bg-red-50 text-red-600 border-red-100";
                          else if (ev.estatus_evento === "Reprogramado")
                            badgeColor =
                              "bg-purple-50 text-purple-600 border-purple-100";
                          else if (ev.estatus_evento === "Cancelado")
                            badgeColor =
                              "bg-gray-100 text-gray-500 border-gray-200 opacity-60 line-through";

                          return (
                            <div
                              key={ev.id}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate border flex items-center ${badgeColor}`}
                              title={`${textoSeguro(ev.titulo)} - ${textoSeguro(ev.cliente)}`}
                            >
                              {ev.tipo === "Seguimiento" && (
                                <PhoneCall className="h-2.5 w-2.5 mr-1 shrink-0" />
                              )}
                              {ev.tipo === "Promesa" && (
                                <Handshake className="h-2.5 w-2.5 mr-1 shrink-0" />
                              )}
                              {textoSeguro(ev.titulo)}
                            </div>
                          );
                        })}
                        {listaEventos.length > 3 && (
                          <span className="text-[9px] font-bold text-gray-400 block pl-1 mt-1">
                            +{listaEventos.length - 3} actividades
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalActivo === "verDia" && diaSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border animate-scale-up flex flex-col max-h-[90vh]">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center shrink-0">
              <h3 className="font-black text-[#0a192f] text-sm flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                Gestión Operativa: {diaSeleccionado} de{" "}
                {nombresMeses[mesActualNum]}
              </h3>
              <button
                onClick={cerrarModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-white space-y-3 custom-scrollbar">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                Comentarios y Vencimientos
              </h4>
              {(eventosMes[diaSeleccionado] || []).length > 0 ? (
                (eventosMes[diaSeleccionado] || []).map((ev) => {
                  const coloresSelector = {
                    Pendiente: "bg-blue-50 text-blue-700 border-blue-200",
                    Completado: "bg-green-50 text-green-700 border-green-200",
                    Reprogramado:
                      "bg-purple-50 text-purple-700 border-purple-200",
                    Vencido: "bg-red-50 text-red-700 border-red-200",
                    Cancelado: "bg-gray-50 text-gray-500 border-gray-200",
                  };

                  return (
                    <div
                      key={ev.id}
                      className={`p-3 border rounded-lg transition-colors flex flex-col gap-2 ${ev.estatus_evento === "Cancelado" ? "bg-gray-50/30 border-gray-100 opacity-70" : "bg-gray-50/50 border-gray-200"}`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {ev.tipo === "VENCIMIENTO" ? (
                              <span
                                className={`text-[9px] font-black uppercase border rounded px-1.5 py-0.5 ${coloresSelector[ev.estatus_evento]}`}
                              >
                                {ev.estatus_evento}
                              </span>
                            ) : (
                              <select
                                value={ev.estatus_evento}
                                onChange={(e) =>
                                  handleActualizarEstado(ev, e.target.value)
                                }
                                disabled={["Completado", "Cancelado"].includes(
                                  ev.estatus_evento,
                                )}
                                title={
                                  ["Completado", "Cancelado"].includes(
                                    ev.estatus_evento,
                                  )
                                    ? "Estado final: no admite más cambios"
                                    : "Cambiar estado del compromiso"
                                }
                                className={`text-[9px] font-black uppercase border rounded px-1.5 py-0.5 outline-none transition-colors ${
                                  ["Completado", "Cancelado"].includes(
                                    ev.estatus_evento,
                                  )
                                    ? "cursor-not-allowed opacity-70"
                                    : "cursor-pointer"
                                } ${coloresSelector[ev.estatus_evento]}`}
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Completado">Completado</option>
                                <option value="Reprogramado">
                                  Reprogramado
                                </option>
                                <option value="Cancelado">Cancelado</option>
                              </select>
                            )}

                            <span className="text-[9px] font-bold text-gray-400 border border-gray-200 px-1 rounded uppercase tracking-wider bg-white">
                              {ev.tipo === "VENCIMIENTO"
                                ? "FACTURA"
                                : textoSeguro(ev.tipo)}
                            </span>
                            <strong className="text-gray-800 font-bold text-xs">
                              {textoSeguro(ev.detalle?.folio, "S/F")}
                            </strong>
                          </div>
                          <p
                            className={`text-xs font-black mt-1.5 uppercase tracking-tight ${ev.estatus_evento === "Cancelado" ? "text-gray-400 line-through" : "text-gray-700"}`}
                          >
                            {textoSeguro(ev.cliente)}
                          </p>
                          <p className="text-[11px] font-medium text-gray-600 mt-0.5">
                            {textoSeguro(ev.titulo)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            onClick={() => abrirModalWhatsapp(ev)}
                            className="p-1.5 bg-white border border-gray-200 text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-md transition-all shadow-sm"
                            title="Contactar vía WhatsApp"
                          >
                            <Send className="h-3.5 w-3.5" />
                          </button>
                          {userRole === "SU" && ev.tipo !== "VENCIMIENTO" && (
                            <button
                              onClick={() => handleEliminarCompromiso(ev)}
                              className="p-1.5 bg-white border border-gray-200 text-red-500 hover:bg-red-500 hover:text-white rounded-md transition-all shadow-sm ml-1"
                              title="Eliminar Permanente"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="mt-1 pt-2 border-t border-gray-200/60 flex items-center justify-between text-[9px] text-gray-500">
                        <span className="truncate pr-2">
                          Actualizado: {ev.ultima_accion_fecha}
                        </span>
                        <span className="font-bold text-gray-600 shrink-0 bg-white px-1.5 py-0.5 rounded border border-gray-100 flex items-center">
                          <User className="h-2.5 w-2.5 mr-1" />{" "}
                          {ev.responsable_accion}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400 py-6 text-center italic">
                  Agenda operativa despejada.
                </p>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <h4 className="text-xs font-bold text-[#0a192f] uppercase tracking-wider mb-3 flex items-center gap-1">
                <Plus className="h-3.5 w-3.5 text-blue-600" /> Agendar Acción
                Comercial
              </h4>
              <form onSubmit={handleAgregarRecordatorio} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative z-50">
                    <Select
                      options={opcionesClientes}
                      value={
                        opcionesClientes.find(
                          (op) => op.value === formClienteId,
                        ) || null
                      }
                      onChange={(op) => {
                        setFormClienteId(op ? op.value : null);
                        setFormFacturaSeleccionada("");
                      }}
                      placeholder="Buscar Cliente..."
                      isClearable
                      isDisabled={isSubmitting}
                      styles={customSelectStyles}
                      noOptionsMessage={() => "No se encontraron clientes"}
                    />
                  </div>
                  <select
                    value={formTipoEvento}
                    onChange={(e) => setFormTipoEvento(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded text-gray-700 font-bold disabled:opacity-50 bg-white outline-none focus:border-blue-400"
                  >
                    <option value="Recordatorio">Recordatorio Simple</option>
                    <option value="Seguimiento">Llamada de Seguimiento</option>
                    <option value="Promesa">Promesa de Pago</option>
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <input
                      type="text"
                      placeholder="Motivo o detalle de la acción *"
                      required
                      value={formMotivo}
                      onChange={(e) => setFormMotivo(e.target.value)}
                      disabled={isSubmitting}
                      className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400 transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <select
                      value={formFacturaSeleccionada}
                      onChange={(e) =>
                        setFormFacturaSeleccionada(e.target.value)
                      }
                      disabled={
                        isSubmitting || facturasClienteSeleccionado.length === 0
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:border-blue-400 transition-all disabled:opacity-50"
                    >
                      <option value="">SIN FACTURA</option>
                      {facturasClienteSeleccionado.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.folio}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2 bg-[#0a192f] hover:bg-[#1a2b45] text-white font-bold text-xs rounded transition-colors shadow-sm flex items-center justify-center gap-1 mt-1 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  {isSubmitting ? "Guardando..." : "Registrar Compromiso"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalActivo === "reprogramar" && eventoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-gray-100 bg-purple-50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-purple-900 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2" /> Reprogramar Fecha
              </h2>
              <button
                onClick={cerrarModal}
                className="text-purple-400 hover:text-purple-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={procesarReprogramacion} className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Cliente / Motivo
                </label>
                <p className="font-bold text-[#0a192f] text-sm">
                  {textoSeguro(eventoSeleccionado.cliente)}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {textoSeguro(eventoSeleccionado.titulo)}
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                  Nueva Fecha de Compromiso
                </label>
                <input
                  type="date"
                  required
                  value={nuevaFechaReprogramacion}
                  onChange={(e) => setNuevaFechaReprogramacion(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !nuevaFechaReprogramacion}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-2" />
                )}
                {isSubmitting ? "Procesando..." : "Confirmar Reprogramación"}
              </button>
            </form>
          </div>
        </div>
      )}

      {modalActivo === "whatsapp" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-scale-up mt-10 mb-auto">
            <div className="p-4 border-b border-gray-100 bg-[#25D366] text-white flex justify-between items-center">
              <h2 className="text-base font-bold flex items-center">
                <Smartphone className="h-5 w-5 mr-2" /> Gestión vía WhatsApp
              </h2>
              <button
                onClick={() => setModalActivo("verDia")}
                className="text-green-100 hover:text-white transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 flex flex-col md:flex-row gap-5">
              <div className="flex-1 space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">
                    Cliente a Contactar
                  </label>
                  <p className="font-bold text-[#0a192f] text-sm">
                    {textoSeguro(eventoSeleccionado?.cliente)}
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
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 font-mono text-sm"
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
                    onChange={(e) => {
                      const nuevaPlantilla = e.target.value;
                      const datosFacturaFalsa = {
                        cliente: eventoSeleccionado?.cliente,
                        folio: eventoSeleccionado?.detalle?.folio || "S/F",
                        saldo_pendiente: eventoSeleccionado?.monto || 0,
                        vencimiento: "los próximos días",
                      };
                      setDatosWhatsapp({
                        ...datosWhatsapp,
                        plantilla: nuevaPlantilla,
                        mensaje: generarMensajeWA(
                          nuevaPlantilla,
                          datosFacturaFalsa,
                        ),
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 bg-white text-sm font-medium"
                  >
                    <option value="atrasado">Cobro: Saldo Vencido</option>
                    <option value="proximo">Aviso: Vencimiento Próximo</option>
                    <option value="manual">Seguimiento Libre</option>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 text-xs resize-none"
                    rows="6"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button
                onClick={() => setModalActivo("verDia")}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Volver a Agenda
              </button>
              <button
                onClick={enviarWhatsApp}
                disabled={!datosWhatsapp.telefono || isSubmitting}
                className="px-5 py-2 bg-[#25D366] hover:bg-[#1DA851] text-white text-xs font-bold rounded-lg shadow-sm flex items-center transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-2" />
                )}
                {isSubmitting ? "Registrando..." : "Abrir WhatsApp"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalActivo === "exito" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden text-center p-6 border animate-scale-up">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-base font-black text-[#0a192f]">
              {textoSeguro(mensajeExito.titulo)}
            </h3>
            <p className="text-xs text-gray-500 mt-1 px-2 leading-relaxed">
              {textoSeguro(mensajeExito.descripcion)}
            </p>
            <button
              onClick={cerrarModal}
              className="w-full mt-5 py-2 bg-green-600 text-white font-bold text-xs rounded-lg hover:bg-green-700 shadow-sm transition-colors"
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: src/services/compromisosService.js
```javascript
import { db } from "../config/firebase";
import {
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { formatearFechaSegura } from "../utils/normalizadores";

const validarActor = (actorUid) => {
  if (!actorUid) {
    return {
      success: false,
      error: "No se identificó al usuario responsable de la acción.",
    };
  }

  return null;
};

const crearAccion = (responsable, accion, detalle) => ({
  responsable: responsable || "Admin",
  fecha: Timestamp.now(),
  accion,
  detalle,
});

export const compromisosService = {
  escucharCompromisosMes: (mesAnio, callback) => {
    const consulta = query(
      collection(db, "compromisos"),
      where("mes_anio", "==", mesAnio),
    );

    return onSnapshot(
      consulta,
      (snapshot) => {
        const compromisos = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,
            ...data,
            fecha_compromiso_texto: formatearFechaSegura(
              data.fecha_compromiso,
              "Sin fecha",
            ),
            ultima_accion_fecha: formatearFechaSegura(
              data.ultima_accion?.fecha,
              "Reciente",
            ),
          };
        });

        callback(compromisos);
      },
      (error) => {
        console.error("Error al escuchar compromisos:", error);
        callback([]);
      },
    );
  },

  crearCompromiso: async (data, userName, actor_uid) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      if (!data?.fecha) {
        throw new Error("La fecha del compromiso es obligatoria.");
      }

      const [anio, mes, dia] = data.fecha.split("-").map(Number);
      const fechaCompromiso = new Date(anio, mes - 1, dia);

      if (
        !anio ||
        !mes ||
        !dia ||
        Number.isNaN(fechaCompromiso.getTime())
      ) {
        throw new Error("La fecha del compromiso no es válida.");
      }

      const batch = writeBatch(db);
      const accionInicial = crearAccion(
        userName,
        "Creación",
        "Evento creado",
      );

      const nuevoCompromiso = {
        cliente_id: data.cliente_id || "N/A",
        cliente_nombre: data.cliente_nombre || "Sin Nombre",
        factura_id: data.factura_id || null,
        folio_factura: data.folio_factura || null,
        tipo_evento: data.tipo_evento || "Recordatorio",
        motivo: data.motivo || "Seguimiento",
        monto: Number(data.monto) || 0,
        telefono: data.telefono || "",
        fecha_compromiso: Timestamp.fromDate(fechaCompromiso),
        mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
        estatus: "Pendiente",
        ultima_accion: accionInicial,
        historial_acciones: [accionInicial],
        creado_por: userName || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const compromisoRef = doc(collection(db, "compromisos"));
      batch.set(compromisoRef, nuevoCompromiso);

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Creación",
        cliente: nuevoCompromiso.cliente_nombre,
        detalle: `Se agendó un ${nuevoCompromiso.tipo_evento.toLowerCase()} para el ${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}. Motivo: ${nuevoCompromiso.motivo}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true, id: compromisoRef.id };
    } catch (error) {
      console.error("Error al crear compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  completarCompromiso: async (
    id,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);
      const accion = crearAccion(
        userName,
        "Completar",
        "Marcado como completado",
      );

      const compromisoRef = doc(db, "compromisos", id);
      batch.update(compromisoRef, {
        estatus: "Completado",
        fecha_completado: serverTimestamp(),
        completado_por: userName || "Admin",
        completado_por_uid: actor_uid,
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion),
      });

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Actualización",
        cliente: clienteNombre || "N/A",
        detalle:
          "El compromiso de seguimiento fue marcado como completado.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error completando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  reprogramarCompromiso: async (
    id,
    nuevaFechaStr,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const [anio, mes, dia] = nuevaFechaStr.split("-").map(Number);
      const nuevaFecha = new Date(anio, mes - 1, dia);

      if (
        !anio ||
        !mes ||
        !dia ||
        Number.isNaN(nuevaFecha.getTime())
      ) {
        throw new Error("La nueva fecha no es válida.");
      }

      const batch = writeBatch(db);
      const fechaLegible = `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}/${anio}`;
      const accion = crearAccion(
        userName,
        "Reprogramación",
        `Reprogramado para el ${fechaLegible}`,
      );

      const compromisoRef = doc(db, "compromisos", id);
      batch.update(compromisoRef, {
        fecha_compromiso: Timestamp.fromDate(nuevaFecha),
        mes_anio: `${anio}-${String(mes).padStart(2, "0")}`,
        estatus: "Reprogramado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion),
      });

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Reprogramación",
        cliente: clienteNombre || "N/A",
        detalle: `El compromiso fue reprogramado para la fecha ${fechaLegible}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error reprogramando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  cancelarCompromiso: async (
    id,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);
      const accion = crearAccion(
        userName,
        "Cancelación",
        "Cancelado por el operador",
      );

      const compromisoRef = doc(db, "compromisos", id);
      batch.update(compromisoRef, {
        estatus: "Cancelado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion),
      });

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "Cancelación",
        cliente: clienteNombre || "N/A",
        detalle: "Se canceló el compromiso de seguimiento.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error cancelando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  registrarWhatsAppCompromiso: async ({
    idCompromiso,
    esFacturaAuto,
    clienteNombre,
    tipoMensaje,
    userName,
    actor_uid,
  }) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      if (!esFacturaAuto && idCompromiso) {
        const accion = crearAccion(
          userName,
          "WhatsApp",
          `WhatsApp abierto (${tipoMensaje})`,
        );

        const compromisoRef = doc(db, "compromisos", idCompromiso);
        batch.update(compromisoRef, {
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion),
        });
      }

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Admin",
        modulo: "Calendario",
        tipo: "WhatsApp",
        cliente: clienteNombre || "N/A",
        detalle: `Se abrió WhatsApp con una plantilla tipo "${tipoMensaje}".`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error registrando WhatsApp:", error);
      return { success: false, error: error.message };
    }
  },

  eliminarCompromiso: async (
    id,
    clienteNombre,
    userName,
    actor_uid,
  ) => {
    const errorActor = validarActor(actor_uid);
    if (errorActor) return errorActor;

    try {
      const batch = writeBatch(db);

      const compromisoRef = doc(db, "compromisos", id);
      batch.delete(compromisoRef);

      const actividadRef = doc(collection(db, "actividad"));
      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Calendario",
        tipo: "Eliminación",
        cliente: clienteNombre || "N/A",
        detalle:
          "El SU eliminó permanentemente un registro de compromiso del calendario.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error eliminando compromiso:", error);
      return { success: false, error: error.message };
    }
  },
};
```
