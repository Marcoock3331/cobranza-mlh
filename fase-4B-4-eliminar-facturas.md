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
- Only files matching these patterns are included: src/pages/Facturacion.jsx, src/pages/ExpedienteCliente.jsx, src/services/facturasService.js, src/context/GlobalProvider.jsx, firestore.rules
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
firestore.rules
src/context/GlobalProvider.jsx
src/pages/ExpedienteCliente.jsx
src/pages/Facturacion.jsx
src/services/facturasService.js
```

# Files

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
  Shield, Mail, Tag, MessageSquare, StickyNote, ChevronLeft, ChevronRight, DollarSign
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
    clientes, facturas, userRole, userName, currentUser
  } = useContext(GlobalContext);

  const [filtroFacturas, setFiltroFacturas] = useState("Historial");
  const [modalActivo, setModalActivo] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [aumentoData, setAumentoData] = useState({ monto: "", motivo: "" });
  const [notificacion, setNotificacion] = useState({ titulo: "", descripcion: "", tipo: "exito" });
  const [paginaFacturas, setPaginaFacturas] = useState(1);
  const [clienteForm, setClienteForm] = useState({});
  const [procesandoCredito, setProcesandoCredito] = useState(false);
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

                    <button
                      type="button"
                      onClick={() => navigate("/facturas", { state: { editarFactura: fac } })}
                      className="w-full px-4 py-3 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-black text-xs flex items-center justify-center hover:bg-amber-100 active:bg-amber-100 transition-colors"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar esta factura
                    </button>
                  </div>
                );
              })()}

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

## File: src/pages/Facturacion.jsx
```javascript
import {
  useState,
  useMemo,
  useContext,
  useLayoutEffect,
  useRef,
} from "react";
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
  UserRound,
  Hash,
  X,
} from "lucide-react";

const FACTURAS_POR_PAGINA = 25;
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

const normalizarTextoBusqueda = (valor = "") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

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


function TarjetaResumenFacturacion({
  etiqueta,
  valor,
  descripcion,
  icono: Icono,
  variante = "azul",
}) {
  const estilos = {
    azul: {
      tarjeta: "border-blue-200 bg-blue-50/40",
      etiqueta: "text-blue-700",
      valor: "text-[#0a192f]",
      icono: "bg-white/80 text-blue-600 border-blue-100",
    },
    rojo: {
      tarjeta: "border-red-200 bg-red-50/40",
      etiqueta: "text-red-700",
      valor: "text-red-600",
      icono: "bg-white/80 text-red-600 border-red-100",
    },
    verde: {
      tarjeta: "border-green-200 bg-green-50/40",
      etiqueta: "text-green-700",
      valor: "text-green-700",
      icono: "bg-white/80 text-green-600 border-green-100",
    },
  };

  const configuracion = estilos[variante] || estilos.azul;

  return (
    <article
      className={`p-4 md:p-5 rounded-xl border text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${configuracion.tarjeta}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className={`text-[10px] md:text-xs uppercase font-black tracking-wide ${configuracion.etiqueta}`}
          >
            {etiqueta}
          </p>
          <strong
            className={`text-xl md:text-3xl mt-2 block break-words ${configuracion.valor}`}
          >
            {valor}
          </strong>
        </div>

        <span
          className={`h-9 w-9 md:h-10 md:w-10 rounded-xl border flex items-center justify-center shrink-0 ${configuracion.icono}`}
        >
          <Icono className="h-4 w-4 md:h-5 md:w-5" />
        </span>
      </div>

      <p className="text-[10px] md:text-xs text-gray-500 mt-2 leading-relaxed">
        {descripcion}
      </p>
    </article>
  );
}

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

  const parametrosURL = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );

  const estadoSolicitado = parametrosURL.get("estado");
  const filtroEstatusInicial = [
    "Todas",
    "Pendiente",
    "Vencida",
    "Pagada",
  ].includes(estadoSolicitado)
    ? estadoSolicitado
    : "Todas";

  const facturaInicialEdicion = location.state?.editarFactura || null;
  const facturaInicialGestion = location.state?.gestionarFactura || null;
  const facturaInicial = facturaInicialGestion || facturaInicialEdicion;

  const {
    busqueda,
    setBusqueda,
    busquedaAplicada,
    aplicarBusqueda,
    limpiarBusquedaAplicada,
    limpiarBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    kpis,
    limpiarFiltros,
  } = useFacturas(stats, { filtroEstatusInicial });

  const [clienteBusqueda, setClienteBusqueda] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const contenedorTablaRef = useRef(null);
  const paginaRenderizadaRef = useRef(1);

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
    busqueda: busquedaAplicada,
    clienteId: clienteBusqueda?.id || "",
    filtroEstatus,
    fechaInicio,
    fechaFin,
  });

  const [modalActivo, setModalActivo] = useState(() => {
    if (facturaInicialGestion) return "opcionesFactura";
    if (facturaInicialEdicion) return "editarFactura";
    return null;
  });
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(
    facturaInicial,
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


  const clientesSugeridos = useMemo(() => {
    const texto = normalizarTextoBusqueda(busqueda);

    if (texto.length < 2 || clienteBusqueda) {
      return [];
    }

    return (clientes || [])
      .filter(
        (cliente) =>
          cliente.activo !== false && cliente.estatus !== "Inactivo",
      )
      .filter((cliente) => {
        const nombre = normalizarTextoBusqueda(cliente.nombre);
        const numero = normalizarTextoBusqueda(cliente.numero_cliente);
        const rfc = normalizarTextoBusqueda(cliente.rfc);

        return (
          nombre.includes(texto) ||
          numero.includes(texto) ||
          rfc.includes(texto)
        );
      })
      .sort((a, b) =>
        (a.nombre || "").localeCompare(b.nombre || "", "es", {
          sensitivity: "base",
        }),
      )
      .slice(0, 8);
  }, [busqueda, clienteBusqueda, clientes]);

  useLayoutEffect(() => {
    if (cargandoFacturas) return;

    if (paginaRenderizadaRef.current === paginaActualFacturas) {
      return;
    }

    paginaRenderizadaRef.current = paginaActualFacturas;

    const contenedor = contenedorTablaRef.current;

    if (!contenedor) return;

    contenedor.scrollTop = 0;
    contenedor.scrollLeft = 0;
  }, [paginaActualFacturas, cargandoFacturas]);

  const moverAInicioTabla = () => {
    const contenedor = contenedorTablaRef.current;

    if (!contenedor) return;

    window.requestAnimationFrame(() => {
      contenedor.scrollTo({
        top: 0,
        left: 0,
        behavior: "smooth",
      });
    });
  };

  const handleCambioBusqueda = (valor) => {
    setBusqueda(valor);
    limpiarBusquedaAplicada();

    if (clienteBusqueda && valor !== clienteBusqueda.nombre) {
      setClienteBusqueda(null);
    }

    setMostrarSugerencias(valor.trim().length >= 2);
  };

  const seleccionarClienteBusqueda = (cliente) => {
    setClienteBusqueda(cliente);
    setBusqueda(cliente.nombre || "");
    limpiarBusquedaAplicada();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const buscarPorFolio = () => {
    const folio = busqueda.trim();

    if (!folio) {
      setClienteBusqueda(null);
      limpiarBusqueda();
      setMostrarSugerencias(false);
      return;
    }

    setClienteBusqueda(null);
    aplicarBusqueda();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const limpiarBusquedaCompleta = () => {
    setClienteBusqueda(null);
    limpiarBusqueda();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

  const limpiarTodosLosFiltros = () => {
    setClienteBusqueda(null);
    limpiarFiltros();
    setMostrarSugerencias(false);
    moverAInicioTabla();
  };

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

    if (
      location.state?.editarFactura ||
      location.state?.gestionarFactura
    ) {
      navigate(`${location.pathname}${location.search}`, {
        replace: true,
        state: null,
      });
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
        <TarjetaResumenFacturacion
          etiqueta="Deuda activa"
          valor={`$${kpis.deuda_activa.toLocaleString("es-MX")}`}
          descripcion="Saldo total pendiente actualmente colocado."
          icono={DollarSign}
          variante="azul"
        />

        <TarjetaResumenFacturacion
          etiqueta="Saldo vencido"
          valor={`$${kpis.monto_vencido.toLocaleString("es-MX")}`}
          descripcion="Cartera vencida que requiere seguimiento."
          icono={AlertTriangle}
          variante="rojo"
        />

        <TarjetaResumenFacturacion
          etiqueta="Total liquidado"
          valor={`$${(Number(kpis.total_liquidado) || 0).toLocaleString("es-MX")}`}
          descripcion="Facturas cerradas mediante pagos registrados."
          icono={TrendingUp}
          variante="verde"
        />
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
          <div className="relative w-full md:max-w-xl">
            <div className="flex w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 md:h-4 md:w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Escribe un cliente o el inicio del folio..."
                  value={busqueda}
                  onChange={(e) => handleCambioBusqueda(e.target.value)}
                  onFocus={() =>
                    setMostrarSugerencias(
                      busqueda.trim().length >= 2 && !clienteBusqueda,
                    )
                  }
                  onBlur={() =>
                    window.setTimeout(() => setMostrarSugerencias(false), 150)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !clienteBusqueda) {
                      e.preventDefault();
                      buscarPorFolio();
                    }
                  }}
                  className="w-full pl-10 pr-10 py-3 md:py-2 bg-gray-50 border border-gray-200 rounded-l-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />

                {(busqueda || clienteBusqueda) && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={limpiarBusquedaCompleta}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500 rounded"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={buscarPorFolio}
                disabled={Boolean(clienteBusqueda)}
                className="px-4 py-2.5 bg-[#0a192f] text-white text-xs font-black rounded-r-lg hover:bg-[#112240] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center shrink-0"
                title={
                  clienteBusqueda
                    ? "Quita el cliente seleccionado para buscar por folio"
                    : "Buscar folio por inicio"
                }
              >
                <Search className="h-4 w-4 mr-1.5" />
                Buscar
              </button>
            </div>

            {clienteBusqueda && (
              <div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-700">
                <UserRound className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{clienteBusqueda.nombre}</span>
                <button
                  type="button"
                  onClick={limpiarBusquedaCompleta}
                  className="text-blue-400 hover:text-red-500"
                  aria-label="Quitar cliente seleccionado"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {mostrarSugerencias && !clienteBusqueda && (
              <div className="absolute left-0 right-0 top-full mt-2 z-30 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                {clientesSugeridos.length > 0 ? (
                  <>
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50 border-b">
                      Clientes encontrados
                    </p>
                    {clientesSugeridos.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => seleccionarClienteBusqueda(cliente)}
                        className="w-full px-3 py-2.5 text-left hover:bg-blue-50 border-b border-gray-50 last:border-0 flex items-center gap-3"
                      >
                        <UserRound className="h-4 w-4 text-blue-500 shrink-0" />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-[#0a192f] truncate">
                            {cliente.nombre}
                          </span>
                          <span className="block text-[10px] text-gray-400 truncate">
                            {cliente.numero_cliente || "Sin número"}
                            {cliente.rfc ? ` • ${cliente.rfc}` : ""}
                          </span>
                        </span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="px-3 py-3 text-xs text-gray-500">
                    No hay clientes coincidentes. Puedes buscar el texto como inicio de folio.
                  </p>
                )}

                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={buscarPorFolio}
                  className="w-full px-3 py-3 bg-gray-50 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-center"
                >
                  <Hash className="h-4 w-4 mr-2" />
                  Buscar folios que comiencen con “{busqueda.trim().toUpperCase()}”
                </button>
              </div>
            )}

            <p className="mt-2 text-[10px] text-gray-400 leading-relaxed">
              Selecciona un cliente sugerido sin escribir su nombre completo, o escribe el inicio del folio y presiona Enter.
            </p>
          </div>
          <div className="flex overflow-x-auto hide-scrollbar-mobile w-full md:w-auto bg-gray-50 p-1.5 md:p-1 rounded-xl md:rounded-lg border border-gray-200 gap-1 md:gap-0 shrink-0">
            {[
              { value: "Todas", label: "Todas" },
              { value: "Pendiente", label: "Pendientes" },
              { value: "Vencida", label: "Vencidas" },
              { value: "Pagada", label: "Pagadas" },
            ].map((opcion) => (
              <button
                key={opcion.value}
                onClick={() => {
                  setFiltroEstatus(opcion.value);
                  moverAInicioTabla();
                }}
                className={`whitespace-nowrap px-4 py-2 md:py-1.5 text-xs font-bold rounded-lg md:rounded-md transition-colors flex-1 md:flex-none ${filtroEstatus === opcion.value ? "bg-white text-[#0a192f] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                {opcion.label}
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
                moverAInicioTabla();
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
                moverAInicioTabla();
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          {(fechaInicio ||
            fechaFin ||
            busqueda ||
            clienteBusqueda ||
            filtroEstatus !== "Todas") && (
            <button
              onClick={limpiarTodosLosFiltros}
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
        <div
          ref={contenedorTablaRef}
          className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-350px)] pb-20 custom-scrollbar w-full"
        >
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

  eliminarFactura: async () => ({
    success: false,
    error:
      "La anulación directa requiere estorno financiero en cascada. En construcción.",
  }),
};
```
