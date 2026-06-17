This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.

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
- Only files matching these patterns are included: src/**/*.js, src/**/*.jsx, firestore.rules, firebase.json, package.json, vite.config.js, eslint.config.js, .env.example
- Files matching these patterns are excluded: src/assets/**, src/services/mock/**, node_modules/**, dist/**, build/**, .firebase/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
.env.example
eslint.config.js
firebase.json
firestore.rules
package.json
src/App.jsx
src/components/ProtectedRoute.jsx
src/config/firebase.js
src/context/AuthContext.js
src/context/AuthProvider.jsx
src/context/GlobalContext.js
src/context/GlobalProvider.jsx
src/hooks/useClientes.js
src/hooks/useFacturas.js
src/layouts/MainLayout.jsx
src/main.jsx
src/pages/Calendario.jsx
src/pages/Clientes.jsx
src/pages/Dashboard.jsx
src/pages/ExpedienteCliente.jsx
src/pages/Facturacion.jsx
src/pages/GestionUsuarios.jsx
src/pages/Login.jsx
src/services/auditoriaService.js
src/services/clientesService.js
src/services/compromisosService.js
src/services/facturasService.js
src/services/solicitudesService.js
src/services/usuariosService.js
src/utils/fechas.js
src/utils/normalizadores.js
src/utils/whatsapp.js
vite.config.js
```

# Files

## File: .env.example
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## File: eslint.config.js
```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
```

## File: firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules"
  }
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
        && request.resource.data.createdAt is timestamp;

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
        && request.resource.data.abonos is list
        && request.resource.data.estatus in [
          'Pendiente',
          'Vencida',
          'Reprogramado',
          'Pagada',
          'Cancelada'
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
            'updatedAt'
          ])
        && request.resource.data.estatus in [
          'Pendiente',
          'Completado',
          'Reprogramado',
          'Cancelado'
        ]
        && request.resource.data.ultima_accion is map
        && request.resource.data.historial_acciones is list
        && request.resource.data.updatedAt is timestamp;

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

## File: package.json
```json
{
  "name": "mlh-cobranza",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview"
  },
  "dependencies": {
    "firebase": "^12.13.0",
    "lucide-react": "^1.14.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.0",
    "react-select": "^5.10.2"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@tailwindcss/vite": "^4.3.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "eslint": "^10.3.0",
    "eslint-plugin-react-hooks": "^7.1.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "globals": "^17.6.0",
    "postcss": "^8.5.14",
    "tailwindcss": "^4.3.0",
    "terser": "^5.48.0",
    "vite": "^8.0.12"
  }
}
```

## File: src/App.jsx
```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';  
import { AuthProvider } from './context/AuthProvider';
import { GlobalProvider } from './context/GlobalProvider';

import Login from './pages/Login';  
import MainLayout from './layouts/MainLayout';  
import ProtectedRoute from './components/ProtectedRoute';  
import Dashboard from './pages/Dashboard';  
import Clientes from './pages/Clientes';  
import ExpedienteCliente from './pages/ExpedienteCliente';  
import GestionUsuarios from './pages/GestionUsuarios';  
import Calendario from './pages/Calendario';  
import Facturacion from './pages/Facturacion'; 

function App() {  
  return (  
    <AuthProvider>
      <GlobalProvider>  
        <BrowserRouter>  
          <Routes>  
            <Route path="/login" element={<Login />} />

            <Route  
              path="/"  
              element={  
                <ProtectedRoute>  
                  <MainLayout />  
                </ProtectedRoute>  
              }  
            >  
              <Route index element={<Dashboard />} />  
              <Route path="clientes" element={<Clientes />} />  
              <Route path="clientes/:id" element={<ExpedienteCliente />} />  
              
              <Route  
                path="panel-su"  
                element={  
                  <ProtectedRoute requiredRole="SU">  
                    <GestionUsuarios />  
                  </ProtectedRoute>  
                }  
              />  
              
              <Route path="calendario" element={<Calendario />} />  
              <Route path="facturas" element={<Facturacion />} />

              {/* RUTAS EN DESARROLLO (Ocultas para producción) */}
              {/* <Route path="reportes" element={<div><h1>Reportes Exportables</h1></div>} /> */}
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />  
          </Routes>  
        </BrowserRouter>  
      </GlobalProvider>
    </AuthProvider>  
  );  
}

export default App;
```

## File: src/components/ProtectedRoute.jsx
```javascript
import { Navigate, Outlet } from 'react-router-dom';
import { useContext } from 'react';
import { GlobalContext } from '../context/GlobalContext';

export default function ProtectedRoute({ children, requiredRole }) {
    // FIX A-6: Extraemos authLoading para evitar el race condition
    const { currentUser, userRole, authLoading } = useContext(GlobalContext);

    // 1. CAPA DE ESPERA: Evita expulsar al usuario mientras Firebase valida el token de seguridad
    if (authLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a192f] mb-3"></div>
                <p className="text-[#0a192f] text-sm font-medium animate-pulse">Verificando acceso protegido...</p>
            </div>
        );
    }

    // 2. CAPA DE AUTENTICACIÓN: Si no existe un usuario logueado, patada al Login
    if (!currentUser) {
        return <Navigate to="/login" replace />;
    }

    // 3. CAPA DE AUTORIZACIÓN: Si la ruta exige un rol (ej. "SU") y el usuario no lo tiene
    if (requiredRole && userRole !== requiredRole) {
        // Redirigimos al Dashboard para que no vea la pantalla prohibida
        return <Navigate to="/" replace />;
    }

    // 4. RENDERIZADO: Si pasa todas las capas de seguridad, mostramos el componente
    return children ? children : <Outlet />;
}
```

## File: src/config/firebase.js
```javascript
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const auth = getAuth(app);
```

## File: src/context/AuthContext.js
```javascript
import { createContext } from "react";

export const AuthContext = createContext(null);
```

## File: src/context/AuthProvider.jsx
```javascript
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { AuthContext } from "./AuthContext";

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const limpiarContexto = useCallback(() => {
    setCurrentUser(null);
    setUserRole(null);
    setUserName("");
  }, []);

  const clearAuthError = useCallback(() => {
    setAuthError("");
    localStorage.removeItem("authError");
  }, []);

  const registrarErrorAcceso = useCallback((mensaje) => {
    setAuthError(mensaje);
    localStorage.setItem("authError", mensaje);
  }, []);

  const logoutSesion = useCallback(async () => {
    limpiarContexto();

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setLoading(false);
    }
  }, [limpiarContexto]);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const detenerEscuchaPerfil = () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }
    };

    const expulsarUsuario = async (mensaje) => {
      registrarErrorAcceso(mensaje);
      detenerEscuchaPerfil();
      await logoutSesion();
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      detenerEscuchaPerfil();

      if (!user) {
        limpiarContexto();
        setLoading(false);
        return;
      }

      const userRef = doc(db, "usuarios", user.uid);

      unsubscribeSnapshot = onSnapshot(
        userRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            void expulsarUsuario(
              "Acceso Denegado: No tienes un perfil de acceso registrado en el sistema.",
            );
            return;
          }

          const data = docSnap.data();

          if (data.activo !== true) {
            void expulsarUsuario(
              "Acceso Denegado: Tu cuenta se encuentra inactiva o suspendida por el Súper Usuario.",
            );
            return;
          }

          const rolNormalizado = String(data.rol || "")
            .trim()
            .toUpperCase();

          if (!["SU", "ADMIN"].includes(rolNormalizado)) {
            void expulsarUsuario(
              "Acceso Denegado: Tu perfil no cuenta con permisos operativos válidos.",
            );
            return;
          }

          setCurrentUser(user);
          setUserRole(rolNormalizado);
          setUserName(data.nombre || user.displayName || "Usuario");
          setLoading(false);
        },
        (error) => {
          console.error(
            "Error del guardián escuchando al usuario:",
            error,
          );

          void expulsarUsuario(
            "No fue posible validar tu perfil de acceso. Intenta iniciar sesión nuevamente.",
          );
        },
      );
    });

    return () => {
      unsubscribeAuth();
      detenerEscuchaPerfil();
    };
  }, [
    limpiarContexto,
    logoutSesion,
    registrarErrorAcceso,
  ]);

  const contextValue = useMemo(
    () => ({
      currentUser,
      userRole,
      userName,
      loading,
      authError,
      clearAuthError,
      logoutSesion,
    }),
    [
      currentUser,
      userRole,
      userName,
      loading,
      authError,
      clearAuthError,
      logoutSesion,
    ],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f4f6f8]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0a192f] mb-3" />
        <p className="text-[#0a192f] text-sm font-medium animate-pulse">
          Autenticando sesión segura...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
```

## File: src/context/GlobalContext.js
```javascript
import { createContext } from "react";

export const GlobalContext = createContext(null);
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

import { db } from "../config/firebase";
import { usuariosService } from "../services/usuariosService";
import { facturasService } from "../services/facturasService";
import { clientesService } from "../services/clientesService";
import { formatearFechaSegura } from "../utils/normalizadores";
import { AuthContext } from "./AuthContext";
import { GlobalContext } from "./GlobalContext";

const AUTH_DATA_VACIO = Object.freeze({});
const CLIENTES_COLLECTION = "clientes";
const FACTURAS_COLLECTION = "facturas";
const STATS_COLLECTION = "metricas_globales";
const STATS_DOC = "stats_actuales";
const ACTIVIDAD_COLLECTION = "actividad";
const SOLICITUDES_COLLECTION = "solicitudes";

const normalizarFactura = (documento) => {
  const factura = documento.data();

  const emisionStr = factura.emision?.toDate
    ? factura.emision.toDate().toISOString().split("T")[0]
    : factura.emision;

  const vencimientoStr = factura.vencimiento?.toDate
    ? factura.vencimiento.toDate().toISOString().split("T")[0]
    : factura.vencimiento;

  let estatusReal = factura.estatus;

  if (
    (estatusReal === "Pendiente" || estatusReal === "Reprogramado") &&
    factura.vencimiento?.toDate
  ) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaVencimiento = factura.vencimiento.toDate();
    fechaVencimiento.setHours(0, 0, 0, 0);

    if (hoy > fechaVencimiento) {
      estatusReal = "Vencida";
    }
  }

  return {
    id: documento.id,
    ...factura,
    estatus: estatusReal,
    emision: emisionStr,
    vencimiento: vencimientoStr,
    _abonos_raw: factura.abonos || [],
    abonos: (factura.abonos || []).map((abono) => ({
      ...abono,
      fecha: abono.fecha?.toDate
        ? abono.fecha.toDate().toLocaleString("es-MX")
        : abono.fecha,
    })),
  };
};

const ordenarFacturas = (lista) =>
  [...lista].sort((primera, segunda) => {
    const fechaPrimera =
      primera.createdAt?.toMillis?.() ||
      primera.emision?.toDate?.().getTime?.() ||
      new Date(primera.emision || 0).getTime() ||
      0;

    const fechaSegunda =
      segunda.createdAt?.toMillis?.() ||
      segunda.emision?.toDate?.().getTime?.() ||
      new Date(segunda.emision || 0).getTime() ||
      0;

    return fechaSegunda - fechaPrimera;
  });

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
        clientes_activos: 0,
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
  const { currentUser, userName, userRole } = authData;

  const actorUid = currentUser.uid;

  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [statsDB, setStatsDB] = useState({
    cartera_total: 0,
    ingresos_mes: 0,
    ingresos_semana: 0,
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

    const unsubFacturas = onSnapshot(
      collection(db, FACTURAS_COLLECTION),
      (snap) => {
        setFacturas((facturasPrevias) => {
          const mapa = new Map(
            facturasPrevias.map((factura) => [factura.id, factura]),
          );

          snap.docChanges().forEach((cambio) => {
            if (cambio.type === "removed") {
              mapa.delete(cambio.doc.id);
              return;
            }

            mapa.set(cambio.doc.id, normalizarFactura(cambio.doc));
          });

          return ordenarFacturas(Array.from(mapa.values()));
        });
      },
      (error) => {
        console.error("Error escuchando facturas:", error);
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
      unsubFacturas();
      unsubStats();
      unsubActividad();
      unsubSolicitudes();
      unsubUsuarios();
    };
  }, [actorUid, userRole]);

  const stats = useMemo(() => {
    let vencida = 0;

    facturas.forEach((factura) => {
      if (factura.estatus === "Vencida") {
        vencida += Number(factura.saldo_pendiente) || 0;
      }
    });

    const clientesReales = clientes.filter(
      (cliente) => cliente.activo !== false && cliente.estatus !== "Inactivo",
    );

    return {
      cartera_total: statsDB.cartera_total || 0,
      cartera_vencida: statsDB.cartera_vencida ?? vencida,
      ingresos_mes: statsDB.ingresos_mes || 0,
      clientes_activos: clientesReales.length,
    };
  }, [facturas, clientes, statsDB]);

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
        facturas,
        clientes,
        userName,
        actor_uid: actorUid,
      });
    },
    [facturas, clientes, actorUid, userName],
  );

  const modificarFacturaEnNube = useCallback(async () => {
    window.alert(
      "La modificación de facturas requiere recálculo de métricas. Se implementará en el módulo de Facturación.",
    );

    return {
      success: false,
      error: "La modificación de facturas no está habilitada.",
    };
  }, []);

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
      setFacturas,
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

## File: src/hooks/useClientes.js
```javascript
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
```

## File: src/hooks/useFacturas.js
```javascript
import { useDeferredValue, useMemo, useState } from "react";

const normalizarTexto = (texto) =>
  texto
    ? texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
    : "";

const convertirFecha = (fecha) => {
  if (!fecha) return null;

  if (fecha instanceof Date) return fecha;

  if (typeof fecha === "string" && fecha.includes("/")) {
    const [dia, mes, anio] = fecha.split("/");
    return new Date(`${anio}-${mes}-${dia}T00:00:00`);
  }

  return new Date(`${fecha}T00:00:00`);
};

const redondearMoneda = (valor) =>
  Math.round((Number(valor) || 0) * 100) / 100;

export const useFacturas = (facturas) => {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("Todas");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const busquedaDiferida = useDeferredValue(busqueda);

  const facturasFiltradas = useMemo(() => {
    if (!Array.isArray(facturas)) return [];

    const textoBusquedaLimpio = normalizarTexto(busquedaDiferida);

    return facturas.filter((factura) => {
      const coincideTexto =
        textoBusquedaLimpio === "" ||
        normalizarTexto(factura.folio).includes(textoBusquedaLimpio) ||
        normalizarTexto(factura.cliente).includes(textoBusquedaLimpio);

      const coincideEstatus =
        filtroEstatus === "Todas" || factura.estatus === filtroEstatus;

      let coincideFecha = true;

      if (fechaInicio || fechaFin) {
        const fechaFactura = convertirFecha(factura.emision);

        if (!fechaFactura || Number.isNaN(fechaFactura.getTime())) {
          return false;
        }

        if (fechaInicio) {
          const desde = new Date(`${fechaInicio}T00:00:00`);
          if (fechaFactura < desde) coincideFecha = false;
        }

        if (fechaFin) {
          const hasta = new Date(`${fechaFin}T23:59:59`);
          if (fechaFactura > hasta) coincideFecha = false;
        }
      }

      return coincideTexto && coincideEstatus && coincideFecha;
    });
  }, [
    facturas,
    busquedaDiferida,
    filtroEstatus,
    fechaInicio,
    fechaFin,
  ]);

  const kpis = useMemo(() => {
    if (!Array.isArray(facturas)) {
      return {
        deuda_activa: 0,
        monto_vencido: 0,
        total_liquidado: 0,
        cobrado_historico: 0,
        abonos_registrados: 0,
      };
    }

    const deudaActiva = facturas
      .filter((factura) => factura.estatus !== "Pagada")
      .reduce(
        (acumulado, factura) =>
          acumulado + (Number(factura.saldo_pendiente) || 0),
        0,
      );

    const montoVencido = facturas
      .filter((factura) => factura.estatus === "Vencida")
      .reduce(
        (acumulado, factura) =>
          acumulado + (Number(factura.saldo_pendiente) || 0),
        0,
      );

    const totalLiquidado = facturas
      .filter((factura) => factura.estatus === "Pagada")
      .reduce(
        (acumulado, factura) =>
          acumulado + (Number(factura.monto_total) || 0),
        0,
      );

    const cobradoHistorico = facturas.reduce((acumulado, factura) => {
      const montoTotal = Number(factura.monto_total) || 0;
      const saldoPendiente = Number(factura.saldo_pendiente) || 0;

      return acumulado + Math.max(0, montoTotal - saldoPendiente);
    }, 0);

    const abonosRegistrados = facturas.reduce((acumulado, factura) => {
      const totalAbonosFactura = (factura.abonos || []).reduce(
        (suma, abono) => suma + (Number(abono.monto) || 0),
        0,
      );

      return acumulado + totalAbonosFactura;
    }, 0);

    return {
      deuda_activa: redondearMoneda(deudaActiva),
      monto_vencido: redondearMoneda(montoVencido),
      total_liquidado: redondearMoneda(totalLiquidado),
      cobrado_historico: redondearMoneda(cobradoHistorico),
      abonos_registrados: redondearMoneda(abonosRegistrados),
    };
  }, [facturas]);

  const limpiarFiltros = () => {
    setFechaInicio("");
    setFechaFin("");
    setBusqueda("");
    setFiltroEstatus("Todas");
  };

  return {
    busqueda,
    setBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    facturasFiltradas,
    kpis,
    limpiarFiltros,
  };
};
```

## File: src/layouts/MainLayout.jsx
```javascript
import { useContext } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import {
  Home,
  Users,
  FileText,
  Calendar,
  LogOut,
  Shield,
} from "lucide-react";

import { auth } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";
import logoMLH from "../assets/MLH LOGO1.png";

export default function MainLayout() {
  const navigate = useNavigate();

  const {
    userName,
    userRole,
    facturas,
  } = useContext(GlobalContext);

  const facturasPendientesCount = Array.isArray(facturas)
    ? facturas.filter(
        (factura) => factura.estatus !== "Pagada",
      ).length
    : 0;

  const handleCerrarSesion = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (error) {
      console.error(
        "Error al cerrar sesión:",
        error,
      );
    }
  };

  const navItems = [
    {
      name: "Inicio",
      path: "/",
      icon: Home,
    },
    {
      name: "Clientes",
      path: "/clientes",
      icon: Users,
    },
    {
      name: "Facturas",
      path: "/facturas",
      icon: FileText,
      badge: facturasPendientesCount,
    },
    {
      name: "Agenda",
      path: "/calendario",
      icon: Calendar,
    },
    ...(userRole === "SU"
      ? [
          {
            name: "Panel SU",
            path: "/panel-su",
            icon: Shield,
          },
        ]
      : []),
  ];

  const obtenerNombreVisible = (itemName) => {
    if (itemName === "Facturas") {
      return "Facturación y Pagos";
    }

    if (itemName === "Agenda") {
      return "Calendario";
    }

    return itemName;
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6f8] font-sans relative">
      <aside className="hidden md:flex w-64 bg-[#0a192f] flex-col flex-shrink-0 z-20 shadow-xl">
        <div className="h-28 flex items-center justify-center p-4 shrink-0">
          <img
            src={logoMLH}
            alt="MLH Cobranza"
            className="max-h-full object-contain"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1 custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-md transition-all ${
                  isActive
                    ? "bg-[#ffd700] text-[#0a192f] font-bold shadow-md shadow-[#ffd700]/10"
                    : "text-gray-300 hover:bg-[#112240] hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`h-5 w-5 mr-3 shrink-0 ${
                      isActive
                        ? "text-[#0a192f]"
                        : "text-gray-400"
                    }`}
                  />

                  <span className="flex-1 text-sm">
                    {obtenerNombreVisible(item.name)}
                  </span>

                  {Number(item.badge) > 0 && (
                    <span
                      className={`px-2 py-0.5 text-[10px] rounded-full font-black ${
                        isActive
                          ? "bg-[#0a192f] text-[#ffd700]"
                          : "bg-[#112240] text-gray-300"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-[#112240] shrink-0 bg-black/10">
          <button
            type="button"
            onClick={handleCerrarSesion}
            className="flex items-center justify-center w-full px-3 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors uppercase tracking-wider font-bold text-xs"
          >
            <LogOut className="h-4 w-4 mr-2 shrink-0" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#f4f6f8]">
        <header className="h-20 md:h-16 bg-white border-b border-gray-200 flex items-center justify-between md:justify-end px-4 md:px-8 shrink-0 shadow-sm z-10">
          <div className="flex md:hidden items-center">
            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-12 sm:h-14 object-contain"
            />
          </div>

          <div className="flex items-center space-x-3 md:space-x-4">
            <div className="text-right flex flex-col justify-center">
              <span className="text-sm font-black text-[#0a192f] leading-none">
                {userName || "Usuario"}
              </span>

              <span
                className={`text-[9px] font-black uppercase tracking-widest mt-1.5 md:mt-1 w-fit ml-auto px-1.5 py-0.5 rounded border ${
                  userRole === "SU"
                    ? "bg-amber-50 text-amber-600 border-amber-200 shadow-sm"
                    : "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                }`}
              >
                {userRole === "SU"
                  ? "SÚPER USUARIO"
                  : userRole || "ADMIN"}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCerrarSesion}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="md:hidden ml-1 p-2.5 rounded-xl bg-red-50 text-red-500 active:bg-red-100 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 pb-24 md:pb-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0a192f] shadow-[0_-4px_15px_rgba(0,0,0,0.15)] z-40 flex justify-around items-center px-1 safe-area-pb">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 relative transition-colors ${
                isActive
                  ? "text-[#ffd700]"
                  : "text-gray-400 hover:text-gray-200"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="relative">
                  <item.icon
                    className={`h-5 w-5 transition-transform duration-200 ${
                      isActive
                        ? "scale-110"
                        : "scale-100"
                    }`}
                  />

                  {Number(item.badge) > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 rounded-full border-2 border-[#0a192f]">
                      {item.badge}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-bold tracking-wider uppercase transition-all ${
                    isActive
                      ? "opacity-100"
                      : "opacity-70"
                  }`}
                >
                  {item.name}
                </span>

                {isActive && (
                  <div className="absolute bottom-0 w-8 h-0.5 bg-[#ffd700] rounded-t-full" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

## File: src/main.jsx
```javascript
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(<App />);
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
                                className={`text-[9px] font-black uppercase border rounded px-1.5 py-0.5 outline-none cursor-pointer transition-colors ${coloresSelector[ev.estatus_evento]}`}
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

## File: src/pages/Dashboard.jsx
```javascript
import { useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GlobalContext } from "../context/GlobalContext";
import {
  DollarSign, AlertTriangle, TrendingUp, Users, ArrowRight,
  Clock, CheckCircle, CalendarDays, BarChart3, Bell, ArrowUpRight,
  ChevronDown, ChevronUp
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { stats, facturas, solicitudes, userRole } = useContext(GlobalContext);

  const [panelExpandido, setPanelExpandido] = useState(false);

  const fechaActualTexto = new Date().toLocaleDateString('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
  });

  const solicitudesPendientes = useMemo(() => {
      return (solicitudes || []).filter(s => s.estatus === 'Pendiente');
  }, [solicitudes]);

  const cronogramaDias = useMemo(() => {
      if (!facturas) return [];
      const diasGenerados = [];
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      for (let i = 0; i < 7; i++) {
          const fechaIterada = new Date(hoy);
          fechaIterada.setDate(hoy.getDate() + i);
          
          const formatoCrudo = fechaIterada.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
          const fechaStrCorta = formatoCrudo.replace(/\./g, '').split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

          const diaPad = String(fechaIterada.getDate()).padStart(2, '0');
          const mesPad = String(fechaIterada.getMonth() + 1).padStart(2, '0');
          // Formato YYYY-MM-DD construido localmente para evitar el desfase de zona horaria de toISOString()
          const fechaFormateada = `${fechaIterada.getFullYear()}-${mesPad}-${diaPad}`;

          const eventosDelDia = [];
          facturas.forEach(f => {
              if (f.estatus !== 'Pagada' && f.estatus !== 'Cancelada') {
                  if (i === 0 && (f.estatus === 'Vencida' || f.estatus === 'vencida')) {
                      eventosDelDia.push({ id: f.id, type: 'vencida', cliente: f.cliente, folio: f.folio, monto: f.saldo_pendiente });
                  } else if (f.vencimiento === fechaFormateada) {
                      eventosDelDia.push({ id: f.id, type: i === 0 ? 'hoy' : 'proximo', cliente: f.cliente, folio: f.folio, monto: f.saldo_pendiente });
                  }
              }
          });

          diasGenerados.push({ id: `dia-${i}`, fechaStr: fechaStrCorta, esHoy: i === 0, eventos: eventosDelDia });
      }
      return diasGenerados;
  }, [facturas]);

  const notificacionesFeed = useMemo(() => {
    let feed = [];

    if (facturas) {
      facturas.filter(f => f.estatus === "Vencida").forEach(f => {
        feed.push({
          id: `venc-${f.id}`, tipo: "alerta", titulo: "Factura Vencida",
          descripcion: `${f.cliente} • Folio ${f.folio}`, fecha: f.vencimiento, isRedireccionable: true, ruta: "/facturas"
        });
      });
    }

   if (solicitudes) {
      solicitudes.filter(s => s.estatus !== 'Pendiente').forEach(s => {
         const montoSolicitado = Number(s.monto_solicitado) || 0;
         const nombreCliente = s.cliente || 'Cliente Comercial';
         const esAprobado = s.estatus === 'Autorizado' || s.estatus === 'Aprobado';

         feed.push({
           id: `solRes-${s.id}`,
           tipo: esAprobado ? 'aprobada' : 'rechazada',
           titulo: `Crédito ${s.estatus}`,
           descripcion: `${nombreCliente}: Línea ajustada a $${montoSolicitado.toLocaleString('es-MX')}`,
           fecha: s.fecha || new Date().toLocaleDateString('es-MX'),
           isRedireccionable: true, ruta: "/clientes"
         });
      });
    }

    if (userRole === "ADMIN" && solicitudesPendientes.length > 0) {
        feed.unshift({
            id: 'admin-alert-pending', tipo: 'alerta', titulo: 'Pendientes por revisar',
            descripcion: `Existen ${solicitudesPendientes.length} solicitudes de crédito en espera de dictamen del SU.`,
            fecha: new Date().toLocaleDateString('es-MX'), isRedireccionable: false
        });
    }

    return feed.sort((a, b) => (b.fecha > a.fecha ? 1 : -1));
  }, [facturas, solicitudes, userRole, solicitudesPendientes]);

  const notificacionesVisibles = panelExpandido ? notificacionesFeed : notificacionesFeed.slice(0, 4);

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 relative pb-6 text-sm animate-fade-in">
      
      {/* HEADER ADAPTATIVO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-2 md:gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center tracking-tight">
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 mr-2 text-blue-600" /> Resumen Financiero
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1">Visualización global del estado de cobranza, métricas clave y rendimiento mensual.</p>
        </div>
        <div className="text-left md:text-right w-full md:w-auto md:pb-1 hidden sm:block">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Fecha Actual</p>
          <p className="text-xs md:text-sm font-bold text-[#0a192f] capitalize">{fechaActualTexto}</p>
        </div>
      </div>

      {/* TARJETAS FINANCIERAS (1 COLUMNA EN MÓVIL, 4 EN PC) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        
        <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Cartera Total</p>
              <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">${stats?.cartera_total?.toLocaleString("es-MX") || 0}</h3>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0"><DollarSign className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <p className="text-[11px] md:text-xs text-gray-500 mt-2 md:mt-3 font-medium">Dinero total en la calle</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-red-100 shadow-sm flex flex-col bg-red-50/20">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-red-500 uppercase tracking-wider">Cartera Vencida</p>
              <h3 className="text-xl md:text-2xl font-black text-red-600 mt-1">${stats?.cartera_vencida?.toLocaleString("es-MX") || 0}</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-600 shrink-0"><AlertTriangle className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <p className="text-[11px] md:text-xs text-red-500 mt-2 md:mt-3 font-medium">
            {stats?.cartera_total ? ((stats?.cartera_vencida / stats?.cartera_total) * 100).toFixed(1) : 0}% de la cartera total
          </p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Ingresos del Mes</p>
              <h3 className="text-xl md:text-2xl font-black text-green-600 mt-1">${stats?.ingresos_mes?.toLocaleString("es-MX") || 0}</h3>
            </div>
            <div className="p-2 bg-green-50 rounded-lg text-green-600 shrink-0"><TrendingUp className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <p className="text-[11px] md:text-xs text-gray-500 mt-2 md:mt-3 font-medium">Flujo de caja recuperado</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-wider">Clientes Activos</p>
              <h3 className="text-xl md:text-2xl font-black text-[#0a192f] mt-1">{stats?.clientes_activos || 0}</h3>
            </div>
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600 shrink-0"><Users className="h-4 w-4 md:h-5 md:w-5" /></div>
          </div>
          <button 
            onClick={() => navigate("/clientes")} 
            className="text-[11px] md:text-xs text-blue-600 hover:text-blue-800 active:bg-blue-50 py-1 -ml-1 px-1 rounded mt-2 md:mt-3 font-bold flex items-center transition-colors w-fit"
          >
            Ver directorio completo <ArrowRight className="h-3 w-3 ml-1" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          
          {/* CALENDARIO DE FLUJO: CARRUSEL MAGNÉTICO MÓVIL */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-50 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h3 className="font-bold text-[#0a192f] flex items-center text-sm md:text-sm">
                <CalendarDays className="h-5 w-5 mr-2 text-blue-600" /> Flujo Semanal
              </h3>
              <button 
                onClick={() => navigate("/calendario")} 
                className="w-full sm:w-auto px-3 py-2.5 md:py-1.5 bg-blue-50 text-blue-700 active:bg-blue-100 hover:bg-blue-100 border border-blue-100 text-xs font-bold rounded-lg md:rounded-md flex items-center justify-center transition-colors"
              >
                Ir al Calendario <ArrowRight className="h-3.5 w-3.5 md:h-3 md:w-3 ml-1.5" />
              </button>
            </div>
            
            {/* Contenedor snap-x (Imantado) */}
            <div className="p-4 flex gap-3 md:gap-4 overflow-x-auto pb-4 custom-scrollbar hide-scrollbar-mobile snap-x snap-mandatory">
              {cronogramaDias.map((dia) => (
                <div key={dia.id} className="min-w-[240px] md:min-w-[260px] max-w-[240px] md:max-w-[260px] bg-gray-50/50 border border-gray-200 rounded-xl flex flex-col snap-start shrink-0">
                  <div className={`p-2.5 md:p-3 border-b rounded-t-xl font-bold text-xs md:text-sm flex justify-between items-center ${dia.esHoy ? "bg-blue-50 border-blue-100 text-blue-800" : "bg-gray-100/80 border-gray-200 text-gray-700"}`}>
                    <span>{dia.fechaStr}</span>
                    {dia.esHoy && <span className="text-[9px] md:text-[10px] uppercase bg-blue-200 px-1.5 py-0.5 rounded font-black tracking-wider">Hoy</span>}
                  </div>
                  <div className="p-3 flex flex-col gap-2.5 md:gap-3 min-h-[120px] max-h-[280px] overflow-y-auto custom-scrollbar">
                    {dia.eventos.length > 0 ? (
                      dia.eventos.map((ev) => (
                        <div key={`${dia.id}-${ev.id}`} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm relative active:border-blue-300 hover:border-blue-300 transition-all group/card">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${ev.type === "vencida" ? "bg-red-500" : ev.type === "hoy" ? "bg-blue-500" : "bg-gray-300"}`}></div>
                          <div className="pl-2 flex justify-between items-start">
                            <div className="flex-1 pr-2">
                              <p className={`text-base md:text-lg font-black leading-tight mb-1 ${ev.type === "vencida" ? "text-red-600" : "text-[#0a192f]"}`}>${ev.monto.toLocaleString("es-MX")}</p>
                              <p className="text-[11px] md:text-xs font-bold text-gray-700 line-clamp-1">{ev.cliente}</p>
                              <p className="text-[9px] md:text-[10px] text-gray-500 font-mono mt-1">{ev.folio}</p>
                            </div>
                            <button 
                              onClick={() => navigate('/facturas')} 
                              className="p-2 md:p-1.5 rounded-lg md:rounded bg-gray-50 text-gray-400 hover:bg-blue-50 active:bg-blue-50 hover:text-blue-600 active:text-blue-600 border border-gray-200 md:opacity-0 group-hover/card:opacity-100 transition-all" 
                              title="Ir a Gestión"
                            >
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-4">
                        <CheckCircle className="h-5 w-5 md:h-6 md:w-6 mb-1 text-gray-300" />
                        <p className="text-[11px] md:text-xs font-medium">Libre</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEED DE ACTIVIDAD */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden transition-all duration-300 mb-6 lg:mb-0">
          <div className="p-3.5 md:p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="font-bold text-[#0a192f] flex items-center text-xs md:text-sm">
              <Bell className="h-4 w-4 mr-2 text-blue-600" /> Centro de Actividad
            </h3>
            {notificacionesFeed.length > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                {notificacionesFeed.length} Alertas
              </span>
            )}
          </div>

          <div className={`transition-all duration-300 ease-in-out bg-white ${panelExpandido ? 'max-h-[420px] overflow-y-auto custom-scrollbar' : 'max-h-[300px] overflow-hidden'}`}>
            {notificacionesVisibles.length > 0 ? (
              notificacionesVisibles.map((noti) => (
                <div key={noti.id} className="p-3.5 md:p-3.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 active:bg-gray-50 transition-colors group flex items-start gap-3">
                  <div className="mt-0.5 shrink-0 bg-white rounded-full">
                    {noti.tipo === "pago" || noti.tipo === "aprobada" ? <CheckCircle className="h-4 w-4 md:h-4 md:w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 md:h-4 md:w-4 text-red-500" />}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-[11px] md:text-xs font-bold text-[#0a192f] truncate">{noti.titulo}</p>
                    <p className={`text-[10px] md:text-[11px] font-medium mt-0.5 leading-snug ${noti.tipo === "aprobada" ? "text-green-600" : (noti.tipo === "alerta" ? "text-red-600" : "text-gray-500")}`}>
                      {noti.descripcion}
                    </p>
                    <p className="text-[9px] md:text-[10px] text-gray-400 mt-1 flex items-center font-mono">
                      <Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" /> {noti.fecha}
                    </p>
                  </div>

                  {noti.isRedireccionable && (
                    <button 
                      onClick={() => navigate(noti.ruta)} 
                      className="p-2 md:p-1.5 bg-white border border-gray-200 text-gray-400 rounded-lg md:rounded hover:bg-blue-50 active:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-colors shrink-0" 
                      title="Atender"
                    >
                      <ArrowUpRight className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 bg-white">
                <CheckCircle className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-[11px] md:text-xs font-medium">Bandeja operativa limpia</p>
              </div>
            )}
          </div>
          
          {notificacionesFeed.length > 4 && (
            <div className="p-2 md:p-2 bg-gray-50 border-t border-gray-100 flex justify-center">
              <button 
                onClick={() => setPanelExpandido(!panelExpandido)} 
                className="w-full sm:w-auto justify-center text-[11px] md:text-[11px] font-bold text-gray-500 active:text-[#0a192f] hover:text-[#0a192f] transition-colors flex items-center px-4 py-3 md:py-1.5 rounded-lg md:rounded-md active:bg-gray-200/50 hover:bg-gray-200/50"
              >
                {panelExpandido ? <>Contraer Historial <ChevronUp className="h-4 w-4 md:h-3.5 md:w-3.5 ml-1" /></> : <>Ver historial completo ({notificacionesFeed.length}) <ChevronDown className="h-4 w-4 md:h-3.5 md:w-3.5 ml-1" /></>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
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

## File: src/pages/Facturacion.jsx
```javascript
import { useState, useMemo, useContext } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { useFacturas } from "../hooks/useFacturas";
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

export default function Facturacion() {
  const {
    facturas,
    userRole,
    clientes,
    crearFacturaEnNube,
    modificarFacturaEnNube,
    eliminarFacturaEnNube,
    registrarAbonoEnNube,
    eliminarAbonoEnNube,
  } = useContext(GlobalContext);

  const {
    busqueda,
    setBusqueda,
    filtroEstatus,
    setFiltroEstatus,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    facturasFiltradas,
    kpis,
    limpiarFiltros,
  } = useFacturas(facturas);

  const [modalActivo, setModalActivo] = useState(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null);
  const [notificacion, setNotificacion] = useState({
    titulo: "",
    descripcion: "",
    tipo: "exito",
  });

  const [invoiceForm, setInvoiceForm] = useState({
    cliente_id: "",
    cliente: "",
    grupo: "General",
    folio: "",
    monto_total: "",
    moneda: "MXN",
    emision: "",
    vencimiento: "",
    observaciones: "",
  });

  const [pagoForm, setPagoForm] = useState({ monto: "", metodo: "Efectivo" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paginaFacturas, setPaginaFacturas] = useState(1);
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

  const totalPaginasFacturas = Math.max(
    1,
    Math.ceil(facturasFiltradas.length / FACTURAS_POR_PAGINA),
  );

  const paginaActualFacturas = Math.min(paginaFacturas, totalPaginasFacturas);

  const facturasPaginadas = useMemo(() => {
    const inicio = (paginaActualFacturas - 1) * FACTURAS_POR_PAGINA;

    return facturasFiltradas.slice(inicio, inicio + FACTURAS_POR_PAGINA);
  }, [facturasFiltradas, paginaActualFacturas]);

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
    } else if (tipo === "nuevaFactura")
      setInvoiceForm({
        cliente_id: "",
        cliente: "",
        grupo: "General",
        folio: "",
        monto_total: "",
        moneda: "MXN",
        emision: "",
        vencimiento: "",
        observaciones: "",
      });
    else if (tipo === "editarFactura" && facturaSeleccionada)
      setInvoiceForm({
        ...facturaSeleccionada,
        grupo: normalizarGrupoFactura(facturaSeleccionada.grupo),
      });

    setModalActivo(tipo);
  };

  const cerrarModal = () => {
    setModalActivo(null);
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
      const nuevoMonto = parseFloat(invoiceForm.monto_total) || 0;

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
        setIsSubmitting(false);
        return;
      }

      // VALIDACIÓN LÓGICA DE FECHAS
      if (invoiceForm.vencimiento < invoiceForm.emision) {
        mostrarNotificacion(
          "Fechas inválidas",
          "La fecha de vencimiento no puede ser anterior a la fecha de emisión.",
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      const clienteBD =
        clientes.find((c) => c.id === invoiceForm.cliente_id) ||
        clientes.find((c) => c.nombre === invoiceForm.cliente);

      if (!clienteBD) {
        mostrarNotificacion(
          "Error",
          "Selecciona un cliente comercial válido.",
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      const limite = Number(clienteBD.limite_credito) || 0;

      if (limite <= 0) {
        mostrarNotificacion(
          "Línea de crédito no asignada",
          `El cliente ${clienteBD.nombre} todavía no tiene una línea de crédito configurada. Primero el SU debe asignarla para capturar nuevas facturas.`,
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      const deudaActual = Number(clienteBD.deuda_actual) || 0;
      const creditoDisponible = limite - deudaActual;

      let montoAIngresar = nuevoMonto;
      if (modalActivo === "editarFactura") {
        const montoAnterior = Number(facturaSeleccionada.monto_total) || 0;
        montoAIngresar = nuevoMonto - montoAnterior;
      }

      if (montoAIngresar > creditoDisponible) {
        mostrarNotificacion(
          "Límite de Crédito Excedido",
          `El cliente ${clienteBD.nombre} solo tiene $${Math.max(0, creditoDisponible).toLocaleString("es-MX")} de crédito libre. El nuevo monto supera el margen autorizado.`,
          "error",
        );
        setIsSubmitting(false);
        return;
      }

      const payloadFactura = {
        cliente_id: invoiceForm.cliente_id,
        cliente: invoiceForm.cliente,
        grupo: normalizarGrupoFactura(invoiceForm.grupo),
        folio: invoiceForm.folio.trim(),
        monto_total: nuevoMonto,
        moneda: "MXN",
        emision: invoiceForm.emision,
        vencimiento: invoiceForm.vencimiento,
        observaciones: invoiceForm.observaciones?.trim() || "",
      };

      if (modalActivo === "nuevaFactura") {
        const res = await crearFacturaEnNube(payloadFactura);

        if (!res?.success) {
          mostrarNotificacion(
            "Error",
            res?.error || "No se pudo crear la factura.",
            "error",
          );
          return;
        }

        mostrarNotificacion(
          "Factura Autorizada",
          `Se ha generado el folio ${invoiceForm.folio} sin exceder el límite del cliente.`,
        );
      } else if (modalActivo === "editarFactura") {
        const res = await modificarFacturaEnNube(
          facturaSeleccionada.id,
          payloadFactura,
        );

        if (!res?.success) {
          mostrarNotificacion(
            "Acción pendiente",
            res?.error || "La edición de facturas aún no está habilitada.",
            "error",
          );
          return;
        }

        mostrarNotificacion(
          "Factura Modificada",
          "Saldos y límites recalibrados automáticamente.",
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
            recibidos en tiempo real.
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
              placeholder="Buscar por Folio (F-1025) o Cliente..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaFacturas(1);
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
                  setPaginaFacturas(1);
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
                setPaginaFacturas(1);
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
                setPaginaFacturas(1);
              }}
              className="flex-1 sm:flex-none px-3 md:px-2 py-2.5 md:py-1.5 border border-gray-200 rounded-lg md:rounded text-xs focus:ring-2 focus:ring-blue-500 text-gray-600 outline-none"
            />
          </div>
          {(fechaInicio || fechaFin || busqueda) && (
            <button
              onClick={() => {
                limpiarFiltros();
                setPaginaFacturas(1);
              }}
              className="flex items-center justify-center px-4 md:px-3 py-3 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
            >
              <FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" />{" "}
              Limpiar Filtros
            </button>
          )}
        </div>
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
              {facturasPaginadas.length > 0 ? (
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
                        $
                        {(Number(fac.monto_total) || 0).toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right font-semibold text-green-600 bg-white whitespace-nowrap">
                        ${(Number(montoPagado) || 0).toLocaleString("es-MX")}
                      </td>
                      <td className="px-4 py-4 md:py-3 text-right bg-white whitespace-nowrap">
                        <span
                          className={`text-base font-black ${fac.saldo_pendiente > 0 ? (fac.estatus === "Vencida" ? "text-red-600" : "text-[#0a192f]") : "text-green-600"}`}
                        >
                          $
                          {(Number(fac.saldo_pendiente) || 0).toLocaleString(
                            "es-MX",
                          )}
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
                    <p>
                      No se encontraron facturas que coincidan con la búsqueda.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-medium text-gray-500">
            Mostrando{" "}
            {facturasFiltradas.length === 0
              ? 0
              : (paginaActualFacturas - 1) * FACTURAS_POR_PAGINA + 1}
            {" - "}
            {Math.min(
              paginaActualFacturas * FACTURAS_POR_PAGINA,
              facturasFiltradas.length,
            )}{" "}
            de {facturasFiltradas.length} facturas
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setPaginaFacturas((pagina) => Math.max(1, pagina - 1))
              }
              disabled={paginaActualFacturas <= 1}
              className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="text-xs font-black text-[#0a192f] min-w-20 text-center">
              Página {paginaActualFacturas} de {totalPaginasFacturas}
            </span>

            <button
              type="button"
              onClick={() =>
                setPaginaFacturas((pagina) =>
                  Math.min(totalPaginasFacturas, pagina + 1),
                )
              }
              disabled={paginaActualFacturas >= totalPaginasFacturas}
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
                {userRole === "SU" && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3 md:gap-2">
                    <button
                      disabled
                      title="Próximamente"
                      className="p-3 md:p-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs cursor-not-allowed"
                    >
                      <Edit className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Editar
                    </button>
                    <button
                      disabled
                      title="Próximamente"
                      className="p-3 md:p-2 bg-gray-100 text-gray-400 border border-gray-200 rounded-xl md:rounded-lg flex flex-col items-center justify-center font-bold text-xs cursor-not-allowed"
                    >
                      <Trash2 className="h-5 w-5 md:h-4 md:w-4 mb-1" /> Eliminar
                    </button>
                  </div>
                )}
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
                  {isSubmitting ? "Guardando..." : "Guardar Factura"}
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

## File: src/pages/GestionUsuarios.jsx
```javascript
import { useState, useContext, useMemo } from "react";
import { GlobalContext } from "../context/GlobalContext";
import { usuariosService } from "../services/usuariosService";
import { solicitudesService } from "../services/solicitudesService";
import { textoSeguro } from "../utils/normalizadores";

import {
  Shield, UserPlus, Key, Power, AlertTriangle, CheckCircle, XCircle, Clock, Search,
  User, Users, Check, X, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight,
  FilterX, Activity, Loader2
} from "lucide-react";

export default function GestionUsuarios() {
  // BLINDAJE: Extracción rigurosa para uso en servicios
  const {
    userRole,
    actividad,
    solicitudes,
    currentUser,
    usuarios, 
    userName
  } = useContext(GlobalContext);

  const [tabActiva, setTabActiva] = useState("usuarios");
  const isSuperUser = userRole && userRole.trim().toUpperCase() === "SU";
  const usuarioResponsable = userName || "SU_Admin";

  const [modalActivo, setModalActivo] = useState(null);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [tempSolicitud, setTempSolicitud] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notificacion, setNotificacion] = useState({ titulo: "", descripcion: "", tipo: "exito" });
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    usuario: "",
    password: "",
  });
  const [solicitudesExpandidas, setSolicitudesExpandidas] = useState({});

  const administradores = useMemo(() => {
    return (usuarios || []).filter((u) => u.rol === "ADMIN");
  }, [usuarios]);

  const solicitudesPendientesCount = useMemo(() => {
    return (solicitudes || []).filter((s) => s.estatus === "Pendiente").length;
  }, [solicitudes]);

  const [filtroActividad, setFiltroActividad] = useState({
    busqueda: "", modulo: "Todos", tipo: "Todos", fecha: "",
  });
  const [paginaActividad, setPaginaActividad] = useState(1);
  const registrosPorPaginaAct = 10;

  const actividadFiltrada = useMemo(() => {
    const busquedaLimpia = filtroActividad.busqueda.toLowerCase().trim();
    return (actividad || []).filter((act) => {
      const matchBusqueda =
        (act.cliente || "").toLowerCase().includes(busquedaLimpia) ||
        (act.detalle || "").toLowerCase().includes(busquedaLimpia);
      const matchModulo = filtroActividad.modulo === "Todos" || act.modulo === filtroActividad.modulo;
      const matchTipo = filtroActividad.tipo === "Todos" || act.tipo === filtroActividad.tipo;

      let matchFecha = true;
      if (filtroActividad.fecha) {
        const [y, m, d] = filtroActividad.fecha.split("-");
        const fechaCorta = `${d}/${m}/${y}`;
        matchFecha = act.fechaHora?.startsWith(fechaCorta);
      }
      return matchBusqueda && matchModulo && matchTipo && matchFecha;
    });
  }, [actividad, filtroActividad]);

  const actividadPaginada = useMemo(() => {
    const inicio = (paginaActividad - 1) * registrosPorPaginaAct;
    return actividadFiltrada.slice(inicio, inicio + registrosPorPaginaAct);
  }, [actividadFiltrada, paginaActividad]);

  const totalPaginasAct = Math.ceil(actividadFiltrada.length / registrosPorPaginaAct);

  const actualizarFiltroActividad = (campo, valor) => {
    setFiltroActividad((prev) => ({ ...prev, [campo]: valor }));
    setPaginaActividad(1);
  };

  const cerrarModal = () => {
    if (isSubmitting) return;
    setModalActivo(null);
    setUsuarioSeleccionado(null);
    setTempSolicitud(null);
  };

  const mostrarNotificacion = (titulo, descripcion, tipo = "exito") => {
    setNotificacion({ titulo, descripcion, tipo });
    setModalActivo("notificacion");
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    if (!currentUser?.uid) {
        mostrarNotificacion("Error", "No se pudo identificar al Súper Usuario responsable.", "error");
        return;
    }

    setIsSubmitting(true);
    const res = await usuariosService.crearAdmin({
        nombre: nuevoUsuario.nombre,
        usuario: nuevoUsuario.usuario,
        password: nuevoUsuario.password,
        userName: usuarioResponsable,
        actor_uid: currentUser.uid
    });
    setIsSubmitting(false);

    if (res.success) {
        mostrarNotificacion("Usuario Creado", `Las credenciales para ${nuevoUsuario.nombre} han sido generadas y registradas.`);
        setNuevoUsuario({ nombre: "", usuario: "", password: "" });
    } else {
        mostrarNotificacion("Alerta", res.error, "error");
    }
  };

  const abrirConfirmacionEstado = (usuario) => {
    setUsuarioSeleccionado(usuario);
    setModalActivo("confirmarEstado");
  };

  const alternarEstadoUsuario = async () => {
    if (!usuarioSeleccionado || !currentUser?.uid) {
      mostrarNotificacion(
        "Error",
        "No se pudo identificar al usuario o al Súper Usuario responsable.",
        "error",
      );
      return;
    }

    const nuevoEstado = !usuarioSeleccionado.activo;
    setIsSubmitting(true);

    try {
      const res = await usuariosService.actualizarEstadoUsuario({
        uid: usuarioSeleccionado.id,
        activo: nuevoEstado,
        correoObjetivo: usuarioSeleccionado.correo,
        userName: usuarioResponsable,
        actor_uid: currentUser.uid,
      });

      if (!res.success) {
        mostrarNotificacion(
          "Error",
          res.error || "No se pudo actualizar la cuenta.",
          "error",
        );
        return;
      }

      setUsuarioSeleccionado(null);

      mostrarNotificacion(
        nuevoEstado ? "Usuario Reactivado" : "Usuario Suspendido",
        nuevoEstado
          ? "La cuenta fue reactivada correctamente."
          : "La cuenta fue suspendida correctamente.",
      );
    } catch (error) {
      console.error("Error actualizando el usuario:", error);
      mostrarNotificacion(
        "Error crítico",
        "Ocurrió un error inesperado al actualizar la cuenta.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSolicitud = (id) => {
    setSolicitudesExpandidas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirEvaluarSolicitud = (solicitud, nuevoEstatus) => {
    setTempSolicitud({ ...solicitud, nuevoEstatus });
    setModalActivo("confirmarSolicitud");
  };

  const confirmarSolicitud = async () => {
    if (!tempSolicitud?.id || !currentUser?.uid) {
        mostrarNotificacion("Error", "No se pudo identificar la solicitud o al Súper Usuario.", "error");
        return;
    }

    setIsSubmitting(true);

    try {
        const res = await solicitudesService.resolverSolicitud({
            solicitud_id: tempSolicitud.id,
            decision: tempSolicitud.nuevoEstatus,
            actor_uid: currentUser.uid,
            actor_nombre: usuarioResponsable,
        });

        if (!res.success) {
            mostrarNotificacion("Error al resolver", res.error || "No se pudo procesar la solicitud.", "error");
            return;
        }

        mostrarNotificacion(
            tempSolicitud.nuevoEstatus === "Autorizado" ? "Solicitud Aprobada" : "Solicitud Rechazada",
            tempSolicitud.nuevoEstatus === "Autorizado"
                ? "El aumento fue aplicado al límite y al crédito disponible del cliente."
                : "La solicitud fue rechazada sin modificar la línea de crédito."
        );

        setTempSolicitud(null);
    } catch (error) {
        console.error("Error resolviendo solicitud:", error);
        mostrarNotificacion("Error crítico", "Ocurrió un error inesperado al resolver la solicitud.", "error");
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4 md:space-y-6 animate-fade-in relative pb-10 text-sm">
      {!isSuperUser ? (
        <div className="h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-gray-100 shadow-sm animate-in zoom-in duration-300">
          <div className="bg-red-50 p-4 rounded-full text-red-500 mb-4"><Shield className="h-10 w-10" /></div>
          <h2 className="text-xl font-black text-[#0a192f]">Área Privada Requerida</h2>
          <p className="text-gray-400 max-w-sm text-xs mt-1 leading-relaxed">
            No posees el rango maestro de SuperUsuario para modificar accesos de personal o auditar operaciones financieras.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mt-2 md:mt-4 gap-2 md:gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-[#0a192f] flex items-center">
                <Shield className="h-5 w-5 md:h-6 md:w-6 mr-2 text-amber-500" /> Panel de Control SU
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">Gestión interna de credenciales, bandeja de riesgo y monitor de actividad global.</p>
            </div>
          </div>

          <div className="flex border-b border-gray-200 bg-white p-1.5 md:p-1 rounded-xl md:rounded-lg border w-full md:w-fit shadow-sm overflow-x-auto custom-scrollbar hide-scrollbar-mobile shrink-0">
            <button onClick={() => setTabActiva("usuarios")} className={`whitespace-nowrap px-5 py-3 md:py-2 text-xs font-bold rounded-lg md:rounded-md transition-all flex-1 md:flex-none ${tabActiva === "usuarios" ? "bg-[#0a192f] text-white shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-100"}`}>Control de Personal</button>
            <button onClick={() => setTabActiva("solicitudes")} className={`whitespace-nowrap px-5 py-3 md:py-2 text-xs font-bold rounded-lg md:rounded-md transition-all flex items-center justify-center flex-1 md:flex-none ${tabActiva === "solicitudes" ? "bg-[#0a192f] text-white shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-100"}`}>
              Bandeja de Créditos
              {solicitudesPendientesCount > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 md:py-0.2 rounded-full font-mono">{solicitudesPendientesCount}</span>}
            </button>
            <button onClick={() => setTabActiva("actividad")} className={`whitespace-nowrap px-5 py-3 md:py-2 text-xs font-bold rounded-lg md:rounded-md transition-all flex-1 md:flex-none ${tabActiva === "actividad" ? "bg-[#0a192f] text-white shadow-sm" : "text-gray-500 hover:text-[#0a192f] active:bg-gray-100"}`}>Actividad del Sistema</button>
          </div>

          {tabActiva === "usuarios" && (
            <div className="space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-white p-4 md:p-4 rounded-xl shadow-sm border border-gray-100 gap-3">
                <div className="flex items-center text-gray-600 text-xs font-bold uppercase tracking-wider">
                  <Users className="h-4 w-4 mr-2 text-blue-600" />
                  Operadores Registrados: <span className="font-black ml-1 text-[#0a192f] text-sm md:text-sm">{administradores.length}</span>
                </div>
                <button onClick={() => setModalActivo("nuevoUsuario")} className="w-full sm:w-auto px-4 py-3 md:py-2 bg-[#0a192f] text-white font-bold text-xs rounded-xl md:rounded-md hover:bg-[#1a2b45] active:bg-[#1a2b45] flex items-center justify-center shadow-sm">
                  <UserPlus className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5" /> Crear Acceso Admin
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {administradores.map((usuario) => (
                  <div key={usuario.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${!usuario.activo ? "border-red-100 opacity-75" : "border-gray-100 hover:shadow-md"}`}>
                    <div className={`p-4 border-b flex justify-between items-start ${!usuario.activo ? "bg-red-50/20" : "bg-gray-50/40"}`}>
                      <div className="flex items-center min-w-0">
                        <div className={`h-10 w-10 md:h-9 md:w-9 rounded-full flex items-center justify-center font-black text-white shrink-0 text-sm bg-[#0a192f]`}>
                          {textoSeguro(usuario.nombre).charAt(0).toUpperCase()}
                        </div>
                        <div className="ml-3 min-w-0">
                          <p className="font-bold text-[#0a192f] text-base md:text-sm truncate">{textoSeguro(usuario.nombre)}</p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">{textoSeguro(usuario.correo)}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 md:py-0.2 rounded border shrink-0 bg-blue-50 text-blue-700 border-blue-100`}>
                        {textoSeguro(usuario.rol)}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 md:space-y-2 bg-white">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-4 w-4 md:h-3.5 md:w-3.5 mr-2 text-gray-400 shrink-0" />
                        <span className="truncate">Última entrada: <strong className="text-gray-700 font-mono">{textoSeguro(usuario.ultima_entrada, "Nunca")}</strong></span>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <div className={`h-2 w-2 md:h-1.5 md:w-1.5 rounded-full mr-2.5 shrink-0 ${usuario.activo ? "bg-green-500" : "bg-red-500"}`}></div>
                        <span>Estatus: <strong className={usuario.activo ? "text-green-700" : "text-red-600"}>{usuario.activo ? "OPERATIVO" : "SUSPENDIDO"}</strong></span>
                      </div>
                    </div>
                    <div className="p-2 md:p-2 bg-gray-50 border-t border-gray-100 flex flex-col gap-2">
                      <button
                        onClick={() => abrirConfirmacionEstado(usuario)}
                        className={`w-full flex items-center justify-center py-2.5 md:py-1.5 rounded-lg md:rounded text-xs font-bold transition-all ${usuario.activo ? "text-red-600 bg-white md:bg-transparent border border-gray-200 md:border-transparent active:bg-red-50 hover:bg-red-50" : "text-green-600 bg-white md:bg-transparent border border-gray-200 md:border-transparent active:bg-green-50 hover:bg-green-50"}`}
                      >
                        <Power className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" /> {usuario.activo ? "Suspender" : "Reactivar"}
                      </button>
                      
                      <div className="w-full flex items-center justify-center py-2 text-xs font-bold text-gray-400 bg-gray-100/50 rounded-lg cursor-not-allowed border border-gray-200/50 select-none">
                        <Key className="h-4 w-4 mr-1.5 opacity-50" /> Cambio manual
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tabActiva === "solicitudes" && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-100 p-4 md:p-3 rounded-xl flex items-start">
                <AlertTriangle className="h-5 w-5 md:h-4 md:w-4 text-amber-600 mr-3 md:mr-2.5 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed">Bandeja de riesgo activa. Las decisiones tomadas en este panel impactan de manera inmediata las carteras y líneas autorizadas.</p>
              </div>
              {(solicitudes || []).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <CheckCircle className="h-10 w-10 md:h-9 md:w-9 text-green-400 mx-auto mb-3 md:mb-2" />
                  <p className="text-gray-400 font-medium text-xs">No existen trámites de crédito en espera.</p>
                </div>
              ) : (
                <div className="grid gap-3 md:gap-3">
                  {(solicitudes || []).map((solicitud) => {
                    const estaExpandida = !!solicitudesExpandidas[solicitud.id];
                    return (
                      <div key={solicitud.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden relative shadow-sm">
                        <div className={`absolute left-0 top-0 bottom-0 w-1.5 md:w-1 ${solicitud.estatus === "Pendiente" ? "bg-amber-400" : solicitud.estatus === "Autorizado" ? "bg-green-500" : "bg-red-500"}`}></div>
                        <div onClick={() => toggleSolicitud(solicitud.id)} className="p-4 md:p-4 pl-5 md:pl-5 flex justify-between items-center cursor-pointer active:bg-gray-50/50 hover:bg-gray-50/20 select-none">
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center space-x-2.5 mb-1.5 md:mb-1 flex-wrap gap-y-1.5">
                              <span className={`text-[9px] font-black uppercase px-2 md:px-1.5 py-0.5 md:py-0.2 rounded border ${solicitud.estatus === "Pendiente" ? "bg-amber-50 text-amber-700 border-amber-200" : solicitud.estatus === "Autorizado" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                                {textoSeguro(solicitud.estatus)}
                              </span>
                              <span className="text-[11px] text-gray-400 flex items-center font-mono"><Clock className="h-3 w-3 mr-1" />{textoSeguro(solicitud.fecha, "Sin fecha")}</span>
                            </div>
                            <h3 className="font-bold text-sm md:text-sm text-[#0a192f] truncate">
                              Aumento de Límite de Crédito <span className="font-normal text-gray-400 text-xs hidden sm:inline">— solicitado por {textoSeguro(solicitud.solicitado_por_nombre)}</span>
                            </h3>
                          </div>
                          {estaExpandida ? <ChevronUp className="h-5 w-5 md:h-4 md:w-4 text-gray-400" /> : <ChevronDown className="h-5 w-5 md:h-4 md:w-4 text-gray-400" />}
                        </div>
                        {estaExpandida && (
                          <div className="p-4 md:p-4 pl-5 md:pl-5 border-t border-gray-50 bg-gray-50/30 flex flex-col md:flex-row justify-between md:items-center gap-4 md:gap-4 animate-in fade-in duration-200">
                            <div className="flex-1 text-xs md:text-xs">
                              <p className="font-black text-gray-700 text-sm md:text-sm uppercase tracking-tight">{textoSeguro(solicitud.cliente)}</p>
                              <div className="mt-2.5 md:mt-2 bg-white p-3 md:p-3 rounded-lg border border-gray-100 leading-relaxed text-gray-600 shadow-sm">
                                <p><strong className="text-gray-800">Argumento de Alta:</strong> "{textoSeguro(solicitud.motivo)}"</p>
                                <p className="mt-1.5 font-medium">
                                  Límite actual: ${(Number(solicitud.limite_anterior) || 0).toLocaleString("es-MX")}
                                  {" → "}
                                  <strong className="text-blue-600 font-bold block sm:inline mt-0.5 sm:mt-0">
                                    Nuevo límite: ${(Number(solicitud.nuevo_limite_propuesto) || 0).toLocaleString("es-MX")}
                                  </strong>
                                </p>
                                <p className="mt-1 text-gray-500">
                                  Incremento solicitado: <strong>${(Number(solicitud.monto_incremento) || 0).toLocaleString("es-MX")}</strong>
                                </p>
                              </div>
                            </div>
                            {solicitud.estatus === "Pendiente" && (
                              <div className="flex md:flex-col gap-3 md:gap-2 shrink-0 w-full md:w-auto">
                                <button onClick={() => abrirEvaluarSolicitud(solicitud, "Autorizado")} className="flex-1 px-4 py-3 md:py-2 bg-green-600 active:bg-green-700 hover:bg-green-700 text-white text-xs md:text-xs font-bold rounded-xl md:rounded shadow-sm flex items-center justify-center transition-colors"><Check className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1" /> Aprobar</button>
                                <button onClick={() => abrirEvaluarSolicitud(solicitud, "Rechazado")} className="flex-1 px-4 py-3 md:py-2 bg-white border border-red-200 text-red-600 text-xs md:text-xs font-bold rounded-xl md:rounded active:bg-red-50 hover:bg-red-50 flex items-center justify-center transition-colors"><X className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1" /> Denegar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tabActiva === "actividad" && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center space-x-2.5 md:space-x-2">
                  <Activity className="h-5 w-5 md:h-5 md:w-5 text-blue-600" />
                  <div>
                    <h2 className="font-black text-[#0a192f] text-sm md:text-sm tracking-tight">Registro Unificado de Actividad</h2>
                    <p className="text-[11px] md:text-[11px] text-gray-400 font-medium">Auditoría inmutable de eventos clave operativos.</p>
                  </div>
                </div>
                {(filtroActividad.busqueda || filtroActividad.modulo !== "Todos" || filtroActividad.tipo !== "Todos" || filtroActividad.fecha) && (
                  <button onClick={() => setFiltroActividad({ busqueda: "", modulo: "Todos", tipo: "Todos", fecha: "" })} className="flex items-center px-3 md:px-2.5 py-2.5 md:py-1.5 bg-red-50 text-red-600 text-xs font-bold rounded-lg md:rounded active:bg-red-100 hover:bg-red-100 transition-colors w-full sm:w-auto justify-center"><FilterX className="h-4 w-4 md:h-3.5 md:w-3.5 mr-1.5 md:mr-1" /> Limpiar Filtros</button>
                )}
              </div>
              <div className="p-4 border-b border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 md:left-2.5 top-3 md:top-2.5 h-4 w-4 md:h-4 md:w-4 text-gray-400" />
                  <input type="text" value={filtroActividad.busqueda} onChange={(e) => actualizarFiltroActividad("busqueda", e.target.value)} placeholder="Filtrar cliente o nota..." className="w-full pl-9 md:pl-8 pr-3 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs focus:outline-none focus:border-blue-400 focus:bg-white transition-all" />
                </div>
                <select value={filtroActividad.modulo} onChange={(e) => actualizarFiltroActividad("modulo", e.target.value)} className="w-full px-3 md:px-2 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs text-gray-600 outline-none">
                  <option value="Todos">Todos los Módulos</option><option value="Facturación">Facturación</option><option value="Calendario">Calendario</option><option value="Clientes">Clientes</option><option value="Sistema">Sistema Base</option>
                </select>
                <select value={filtroActividad.tipo} onChange={(e) => actualizarFiltroActividad("tipo", e.target.value)} className="w-full px-3 md:px-2 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs text-gray-600 outline-none">
                  <option value="Todos">Todos los Eventos</option><option value="Facturas">Facturas</option><option value="Pagos">Pagos / Abonos</option><option value="Crédito">Créditos</option><option value="WhatsApp">WhatsApp</option><option value="Recordatorios">Recordatorios</option><option value="Sistema">Ajustes Base</option>
                </select>
                <input type="date" value={filtroActividad.fecha} onChange={(e) => actualizarFiltroActividad("fecha", e.target.value)} className="w-full px-3 md:px-2 py-3 md:py-1.5 bg-gray-50 border border-gray-200 rounded-lg md:rounded text-xs text-gray-500 outline-none" />
              </div>
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                {actividadPaginada.length > 0 ? (
                  actividadPaginada.map((act) => (
                    <div key={act.id} className="p-4 md:p-3.5 hover:bg-gray-50/40 active:bg-gray-50/40 transition-colors flex flex-col md:flex-row justify-between items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-1.5 md:space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 md:gap-1.5">
                          <span className="text-[9px] font-black uppercase px-2 md:px-1.5 py-0.5 md:py-0.2 rounded border bg-gray-50 text-gray-500">{textoSeguro(act.modulo)}</span>
                          <span className="text-[9px] font-black uppercase px-2 md:px-1.5 py-0.5 md:py-0.2 rounded border bg-blue-50 text-blue-600 border-blue-100">{textoSeguro(act.tipo)}</span>
                          {act.cliente !== "N/A" && <span className="text-xs md:text-xs font-black text-[#0a192f] uppercase tracking-tight ml-1 truncate max-w-[220px]">{textoSeguro(act.cliente)}</span>}
                        </div>
                        <p className="text-xs md:text-xs text-gray-600 font-medium leading-relaxed">{textoSeguro(act.detalle)}</p>
                      </div>
                      <div className="shrink-0 text-left md:text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto border-t md:border-0 pt-2 md:pt-0 border-gray-100 gap-2">
                        <span className="text-[11px] font-mono text-gray-400 flex items-center"><Clock className="h-3.5 w-3.5 md:h-3 md:w-3 mr-1.5 md:mr-1" />{textoSeguro(act.fechaHora, "Sin fecha")}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center"><User className="h-3.5 w-3.5 md:h-3 md:w-3 mr-1.5 md:mr-1" />{textoSeguro(act.usuario)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400"><Activity className="h-9 w-9 mx-auto mb-2 opacity-25" /><p className="text-xs italic">Ningún movimiento coincide con los filtros establecidos.</p></div>
                )}
              </div>
              {totalPaginasAct > 1 && (
                <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center px-4 shrink-0">
                  <span className="text-[11px] font-medium text-gray-400">Pág. <strong className="text-gray-600">{paginaActividad}</strong> de {totalPaginasAct}</span>
                  <div className="flex space-x-2 md:space-x-1">
                    <button disabled={paginaActividad === 1} onClick={() => setPaginaActividad((p) => Math.max(p - 1, 1))} className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 transition-all"><ChevronLeft className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                    <button disabled={paginaActividad === totalPaginasAct} onClick={() => setPaginaActividad((p) => Math.min(p + 1, totalPaginasAct))} className="p-2 md:p-1 border bg-white rounded-lg md:rounded text-gray-500 hover:bg-gray-50 active:bg-gray-200 disabled:opacity-40 transition-all"><ChevronRight className="h-4 w-4 md:h-3.5 md:w-3.5" /></button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* MODALES "BOTTOM SHEET" DE SEGURIDAD */}
      {modalActivo && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
          <div className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-slide-up md:animate-zoom-in max-h-[90vh] pb-6 md:pb-0 m-auto md:m-0">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 md:hidden shrink-0"></div>

            {modalActivo !== "notificacion" && (
              <div className="flex justify-between items-center p-4 md:p-4 border-b border-gray-100 bg-white md:bg-gray-50 shrink-0">
                <h2 className="text-sm md:text-sm font-black text-[#0a192f] flex items-center">
                  {modalActivo === "nuevoUsuario" && <><UserPlus className="h-4 w-4 md:h-4 md:w-4 mr-1.5" /> Alta de Personal</>}
                  {modalActivo === "confirmarEstado" && <><Power className="h-4 w-4 md:h-4 md:w-4 mr-1.5 text-amber-500" /> Confirmar Cambio de Estado</>}
                  {modalActivo === "confirmarSolicitud" && <><Shield className="h-4 w-4 md:h-4 md:w-4 mr-1.5 text-amber-500" /> Resolver Movimiento</>}
                </h2>
                <button onClick={cerrarModal} className="text-gray-400 active:text-red-500 bg-gray-50 md:bg-transparent p-1 md:p-0 rounded-full"><XCircle className="h-6 w-6 md:h-5 md:w-5" /></button>
              </div>
            )}

            <div className="p-5 overflow-y-auto custom-scrollbar">
              {modalActivo === "nuevoUsuario" && (
                <form id="formUsuarioSU" onSubmit={handleCrearUsuario} className="space-y-5 md:space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Nombre Completo</label>
                    <input type="text" required value={nuevoUsuario.nombre} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl md:rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ffd700]" placeholder="Ej. Carlos Mendoza" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">ID Usuario (Acceso)</label>
                    <div className="flex">
                      <input type="text" required value={nuevoUsuario.usuario} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, usuario: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-50 focus:bg-white border border-r-0 border-gray-200 rounded-l-xl md:rounded-l text-xs focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-mono" placeholder="carlos.m" />
                      <span className="px-4 py-3 md:px-3 md:py-1.5 bg-gray-100 border border-l-0 border-gray-200 rounded-r-xl md:rounded-r text-xs text-gray-400 font-mono select-none flex items-center">@mlh.local</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Clave Inicial Temporal</label>
                    <input type="password" required minLength="6" value={nuevoUsuario.password} onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, password: e.target.value })} className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-50 focus:bg-white border border-gray-200 rounded-xl md:rounded text-xs focus:outline-none focus:ring-2 focus:ring-[#ffd700] font-mono" placeholder="Mínimo 6 caracteres" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1.5">Rol Operativo</label>
                    <input type="text" disabled value="ADMIN - Operativo Ventas" className="w-full px-4 py-3 md:px-3 md:py-1.5 bg-gray-100 border border-gray-200 rounded-xl md:rounded text-xs font-bold text-gray-500 cursor-not-allowed" />
                  </div>
                </form>
              )}

              {modalActivo === "confirmarEstado" && usuarioSeleccionado && (
                <div className="text-center space-y-4 md:space-y-3">
                  <AlertTriangle className="h-12 w-12 md:h-10 md:w-10 text-amber-500 mx-auto" />
                  <p className="text-gray-700 font-medium text-base md:text-sm leading-relaxed">
                    ¿Confirmas que deseas{" "}
                    <span
                      className={`font-black uppercase tracking-wider ${
                        usuarioSeleccionado.activo
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {usuarioSeleccionado.activo ? "suspender" : "reactivar"}
                    </span>{" "}
                    esta cuenta?
                  </p>
                  <p className="text-xs text-gray-500 bg-gray-50 p-3 md:p-2 rounded-xl md:rounded border border-gray-100">
                    <strong className="text-[#0a192f]">Usuario:</strong>{" "}
                    {textoSeguro(usuarioSeleccionado.nombre)}
                  </p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    {usuarioSeleccionado.activo
                      ? "El usuario perderá el acceso al sistema cuando su perfil vuelva a validarse."
                      : "El usuario podrá volver a iniciar sesión con sus credenciales actuales."}
                  </p>
                </div>
              )}

              {modalActivo === "confirmarSolicitud" && (
                <div className="text-center space-y-4 md:space-y-3">
                  <Info className="h-12 w-12 md:h-10 md:w-10 text-amber-500 mx-auto" />
                  <p className="text-gray-700 font-medium text-base md:text-sm leading-relaxed">
                    ¿Confirmar resolución de trámite comercial como <span className={`font-black uppercase tracking-wider ${tempSolicitud?.nuevoEstatus === "Autorizado" ? "text-green-600" : "text-red-600"}`}>{textoSeguro(tempSolicitud?.nuevoEstatus)}</span>?
                  </p>
                  <p className="text-xs text-gray-500 bg-gray-50 p-3 md:p-2 rounded-xl md:rounded border border-gray-100">
                    <strong className="text-[#0a192f]">Afectado:</strong> {textoSeguro(tempSolicitud?.cliente)}
                  </p>
                </div>
              )}

              {modalActivo === "notificacion" && (
                <div className="text-center py-4 md:py-2">
                  <div className={`h-14 w-14 md:h-12 md:w-12 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-3 ${notificacion.tipo === 'error' ? 'bg-red-100' : 'bg-green-100'}`}>
                    {notificacion.tipo === 'error' ? <X className="h-7 w-7 md:h-6 md:w-6 text-red-600" /> : <Check className="h-7 w-7 md:h-6 md:w-6 text-green-600" />}
                  </div>
                  <h3 className="text-lg md:text-base font-black text-[#0a192f] mb-1.5 md:mb-0.5">{textoSeguro(notificacion.titulo)}</h3>
                  <p className="text-sm md:text-xs text-gray-500 leading-relaxed px-2">{textoSeguro(notificacion.descripcion)}</p>
                </div>
              )}
            </div>

            <div className="p-4 md:p-3 border-t border-gray-100 bg-white md:bg-gray-50 flex flex-col-reverse md:flex-row justify-end gap-3 md:gap-2 md:rounded-b-xl shrink-0">
              {modalActivo === "notificacion" ? (
                <button onClick={cerrarModal} className={`w-full px-4 py-3.5 md:py-2 text-sm md:text-xs font-black text-white rounded-xl md:rounded shadow-sm transition-colors ${notificacion.tipo === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>Aceptar</button>
              ) : (
                <>
                  <button onClick={cerrarModal} disabled={isSubmitting} className="w-full md:w-auto px-4 py-3.5 md:py-1.5 text-sm md:text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl md:rounded active:bg-gray-100 hover:bg-gray-50 transition-colors disabled:opacity-50">Cancelar</button>
                  {modalActivo === "confirmarEstado" && usuarioSeleccionado && (
                    <button
                      onClick={alternarEstadoUsuario}
                      disabled={isSubmitting}
                      className={`w-full md:w-auto px-6 py-3.5 md:py-1.5 text-sm md:text-xs font-black text-white rounded-xl md:rounded shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 ${
                        usuarioSeleccionado.activo
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      }`}
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Power className="h-4 w-4 mr-1" />
                      )}
                      {isSubmitting
                        ? "Procesando..."
                        : usuarioSeleccionado.activo
                          ? "Sí, suspender"
                          : "Sí, reactivar"}
                    </button>
                  )}
                  {modalActivo === "confirmarSolicitud" && (
                    <button onClick={confirmarSolicitud} disabled={isSubmitting} className={`w-full md:w-auto px-6 py-3.5 md:py-1.5 text-sm md:text-xs font-black text-white rounded-xl md:rounded shadow-sm transition-colors flex items-center justify-center disabled:opacity-50 ${tempSolicitud?.nuevoEstatus === "Autorizado" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}>
                      {isSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : (tempSolicitud?.nuevoEstatus === "Autorizado" ? <Check className="h-4 w-4 mr-1" /> : <X className="h-4 w-4 mr-1" />)}
                      {isSubmitting ? "Procesando..." : "Aplicar"}
                    </button>
                  )}
                  {modalActivo === "nuevoUsuario" && (
                    <button type="submit" form="formUsuarioSU" disabled={isSubmitting} className="w-full md:w-auto px-8 py-3.5 md:py-1.5 text-sm md:text-xs font-black text-[#0a192f] bg-[#ffd700] rounded-xl md:rounded hover:bg-[#e6c200] active:bg-[#e6c200] shadow-sm transition-colors flex items-center justify-center disabled:opacity-50">
                      {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</> : "Generar Acceso"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: src/pages/Login.jsx
```javascript
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { User, Lock, AlertTriangle, Loader2, Info } from "lucide-react";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth } from "../config/firebase";
import { GlobalContext } from "../context/GlobalContext";

import logoMadereria from "../assets/MHA LOGO.png";
import logoMLH from "../assets/MLH LOGO1.png";
import fondoLogin from "../assets/fondo-login.jpg";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    () => localStorage.getItem("authError") || "",
  );
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const navigate = useNavigate();

  const { currentUser, userRole, authError, clearAuthError } =
    useContext(GlobalContext);

  useEffect(() => {
    if (currentUser && userRole) {
      navigate("/");
    }
  }, [currentUser, userRole, navigate]);

  useEffect(() => {
    localStorage.removeItem("authError");
  }, []);

  const errorVisible = error || authError || "";

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    clearAuthError?.();
    localStorage.removeItem("authError");

    if (!username.trim() || !password) {
      setError("Por favor, ingrese su usuario y contraseña.");
      return;
    }

    setIsAuthenticating(true);

    try {
      await setPersistence(auth, browserSessionPersistence);

      const emailFantasma = `${username.trim().toLowerCase()}@mlh.local`;

      await signInWithEmailAndPassword(auth, emailFantasma, password);
    } catch (errorLogin) {
      let mensajeError =
        "Credenciales incorrectas. Verifique su usuario y contraseña.";

      if (errorLogin.code === "auth/user-disabled") {
        mensajeError = "Su acceso ha sido inhabilitado administrativamente.";
      } else if (errorLogin.code === "auth/too-many-requests") {
        mensajeError =
          "Múltiples intentos fallidos. Su cuenta está bloqueada temporalmente.";
      }

      setError(mensajeError);

      console.error("Error de autenticación:", errorLogin);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full relative flex flex-col items-center justify-center font-sans select-none bg-[#0a192f] overflow-x-hidden">
      <div
        className="fixed inset-0 w-full h-full bg-cover bg-no-repeat z-0 pointer-events-none"
        style={{
          backgroundImage: `url(${fondoLogin})`,
          backgroundPosition: "center 20%",
        }}
      ></div>

      <div className="fixed inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/50 z-0 pointer-events-none"></div>

      <div className="relative z-10 w-full flex flex-col items-center p-4 py-8">
        <div className="bg-white/[0.06] backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] w-full max-w-xs md:max-w-sm border border-white/15 transition-all">
          <div className="flex flex-col items-center mb-6 md:mb-7 space-y-3">
            <img
              src={logoMadereria}
              alt="Maderería La Huerta"
              className="h-14 md:h-16 w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            />
            <div className="w-4/5 border-t border-white/10"></div>
            <img
              src={logoMLH}
              alt="MLH Cobranza"
              className="h-[70px] md:h-[80px] w-auto object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]"
            />
          </div>

          <h1 className="text-lg font-bold text-center text-white/90 mb-5 md:mb-6 tracking-widest uppercase font-mono text-xs">
            Control de Acceso
          </h1>

          {errorVisible && (
            <div className="mb-4 md:mb-5 p-3 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-200 text-[11px] md:text-xs font-semibold rounded-xl text-center animate-fade-in shadow-md">
              {errorVisible}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-black uppercase text-white/60 tracking-widest mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-white/40" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isAuthenticating}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white/[0.08] focus:border-transparent transition-all disabled:bg-black/30 disabled:text-white/20"
                  placeholder="Ingresa tu usuario"
                  autoComplete="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-white/60 tracking-widest mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-white/40" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAuthenticating}
                  className="block w-full pl-10 pr-3 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#ffd700] focus:bg-white/[0.08] focus:border-transparent transition-all disabled:bg-black/30 disabled:text-white/20"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-3 md:pt-4">
              <button
                type="submit"
                disabled={isAuthenticating}
                className="w-full bg-[#ffd700] text-[#0a192f] font-black py-3 px-4 rounded-xl hover:bg-[#ffed4a] transition-all flex justify-center items-center shadow-[0_4px_20px_rgba(255,215,0,0.2)] hover:shadow-[0_4px_30px_rgba(255,215,0,0.4)] text-[11px] md:text-xs tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-[#0a192f]" />
                    AUTENTICANDO...
                  </>
                ) : (
                  "INICIAR SESIÓN"
                )}
              </button>
            </div>

            {/* Aviso de cuentas corporativas locales */}
            <div className="flex items-center justify-center pt-2">
              <Info className="h-3 w-3 text-white/30 mr-1.5" />
              <p className="text-[9px] text-white/30 font-medium tracking-wide">
                ¿Problemas de acceso? Contacta al Súper Usuario.
              </p>
            </div>

            <div className="mt-5 md:mt-6 pt-4 border-t border-white/5 text-center">
              <p className="text-[9px] md:text-[10px] font-bold text-white/30 tracking-widest font-mono">
                © 2026 MLH COBRANZA
              </p>
            </div>
          </form>
        </div>

        <div className="mt-4 text-center w-full max-w-xs md:max-w-sm">
          <div className="bg-red-950/20 backdrop-blur-md border border-red-500/15 rounded-2xl p-3 flex items-start text-left shadow-lg">
            <AlertTriangle className="h-4 w-4 text-red-400/80 mr-2.5 shrink-0 mt-0.5" />
            <p className="text-[9px] md:text-[10px] text-white/50 leading-relaxed font-medium font-sans">
              SISTEMA PRIVADO INTERNO. El acceso no autorizado está
              estrictamente prohibido, registrado y monitoreado por seguridad
              corporativa.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## File: src/services/auditoriaService.js
```javascript
import { db } from '../config/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export const auditoriaService = {
    registrarMovimiento: async (movimiento) => {
        // BLINDAJE OBLIGATORIO: Las reglas de Firestore exigen la firma del actor.
        if (!movimiento || !movimiento.actor_uid) {
            console.error("Auditoría rechazada: No se puede registrar una actividad sin el actor_uid.");
            return { success: false, error: "Identidad del usuario no verificada." };
        }

        try {
            const nuevoDocRef = doc(collection(db, 'actividad'));
            
            const payload = {
                ...movimiento,
                id: nuevoDocRef.id,
                serverTime: serverTimestamp() // Registro plano ultra-rápido
            };
            
            await setDoc(nuevoDocRef, payload);
            return { success: true, data: payload };
        } catch (error) {
            // Este log es silencioso para no interrumpir al usuario si el internet falla por un microsegundo
            console.warn("Auditoría diferida (Fallo de conexión):", error);
            return { success: false, error: error.message };
        }
    }
};
```

## File: src/services/clientesService.js
```javascript
import { db } from "../config/firebase";
import {
  collection,
  doc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const normalizarGrupo = (valor = "GENERAL") =>
  valor
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase() || "GENERAL";

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La operación no pudo completarse.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica las reglas publicadas.";
  }

  return error?.message || "No se pudo completar la operación del cliente.";
};

export const clientesService = {
  crearCliente: async (
    clienteData,
    userName,
    actor_uid,
    userRole,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const batch = writeBatch(db);

      const limiteAsignado =
        userRole === "SU"
          ? Math.max(
              0,
              Number(clienteData.limite_credito) || 0,
            )
          : 0;

      const nuevoDocRef = doc(
        collection(db, "clientes"),
      );

      const folioManual = String(
        clienteData.numero_cliente ||
          clienteData.id ||
          "",
      ).trim();

      const clienteProcesado = {
        numero_cliente: folioManual,
        cliente_id: nuevoDocRef.id,
        nombre: String(clienteData.nombre || "").trim(),
        rfc: String(clienteData.rfc || "")
          .trim()
          .toUpperCase(),
        telefono: String(
          clienteData.telefono || "",
        ).trim(),
        correo: String(clienteData.correo || "")
          .trim()
          .toLowerCase(),
        direccion: String(
          clienteData.direccion || "",
        ).trim(),
        ultima_fecha_pago:
          clienteData.ultima_fecha_pago || "",
        grupo: normalizarGrupo(clienteData.grupo),
        segmentacion:
          clienteData.segmentacion || "Nuevo",
        dias_mensaje:
          Number(clienteData.dias_mensaje) || 0,
        pagare_monto:
          Number(clienteData.pagare_monto) || 0,
        pagare_fecha:
          clienteData.pagare_fecha || "",
        notas_internas: String(
          clienteData.notas ||
            clienteData.notas_internas ||
            "",
        ).trim(),
        limite_credito: limiteAsignado,
        deuda_actual: 0,
        credito_disponible: limiteAsignado,
        monto_ultimo_pago: null,
        fecha_ultimo_pago: null,
        clasificacion: "activo",
        activo: true,
        estatus: "Activo",
        createdAt: serverTimestamp(),
        createdBy: userName || "Sistema",
      };

      if (!clienteProcesado.nombre) {
        throw new Error(
          "El nombre del cliente es obligatorio.",
        );
      }

      batch.set(nuevoDocRef, clienteProcesado);

      const actividadRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Creación",
        cliente: clienteProcesado.nombre,
        detalle: `Se registró un nuevo cliente con un límite de crédito de $${limiteAsignado.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: {
          ...clienteProcesado,
          id: nuevoDocRef.id,
        },
      };
    } catch (error) {
      console.error(
        "Error al crear cliente:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  modificarCliente: async (
    id,
    datosActualizados,
    nombreCliente,
    userName,
    actor_uid,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const camposPermitidos = [
        "nombre",
        "numero_cliente",
        "rfc",
        "telefono",
        "correo",
        "direccion",
        "grupo",
        "segmentacion",
        "dias_mensaje",
        "pagare_monto",
        "pagare_fecha",
        "notas_internas",
      ];

      const datosSeguros = {};

      camposPermitidos.forEach((campo) => {
        if (
          Object.prototype.hasOwnProperty.call(
            datosActualizados,
            campo,
          )
        ) {
          datosSeguros[campo] =
            datosActualizados[campo];
        }
      });

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "grupo",
        )
      ) {
        datosSeguros.grupo = normalizarGrupo(
          datosSeguros.grupo,
        );
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "dias_mensaje",
        )
      ) {
        datosSeguros.dias_mensaje =
          Number(datosSeguros.dias_mensaje) || 0;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "pagare_monto",
        )
      ) {
        datosSeguros.pagare_monto =
          Number(datosSeguros.pagare_monto) || 0;
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "correo",
        )
      ) {
        datosSeguros.correo = String(
          datosSeguros.correo || "",
        )
          .trim()
          .toLowerCase();
      }

      if (
        Object.prototype.hasOwnProperty.call(
          datosSeguros,
          "rfc",
        )
      ) {
        datosSeguros.rfc = String(
          datosSeguros.rfc || "",
        )
          .trim()
          .toUpperCase();
      }

      if (Object.keys(datosSeguros).length === 0) {
        throw new Error(
          "No se recibieron campos editables.",
        );
      }

      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        ...datosSeguros,
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "Sistema",
        modulo: "Clientes",
        tipo: "Actualización",
        cliente:
          datosSeguros.nombre ||
          nombreCliente ||
          "S/N",
        detalle:
          "Se actualizaron los datos generales del expediente del cliente.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error al actualizar cliente:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  eliminarCliente: async (
    id,
    nombreCliente,
    userName,
    actor_uid,
  ) => {
    if (!actor_uid) {
      return {
        success: false,
        error: "No se identificó al usuario responsable.",
      };
    }

    try {
      const batch = writeBatch(db);
      const clienteRef = doc(db, "clientes", id);

      batch.update(clienteRef, {
        activo: false,
        estatus: "Inactivo",
        updatedAt: serverTimestamp(),
      });

      const actividadRef = doc(
        collection(db, "actividad"),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: userName || "SU",
        modulo: "Clientes",
        tipo: "Inactivación",
        cliente: nombreCliente || "S/N",
        detalle:
          "El SU inactivó el expediente del cliente. Sus facturas y abonos fueron conservados.",
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error al inactivar cliente:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
```

## File: src/services/compromisosService.js
```javascript
import { db } from '../config/firebase';
import { 
  collection, doc, serverTimestamp, onSnapshot, query, where, Timestamp, arrayUnion, writeBatch 
} from 'firebase/firestore';
import { formatearFechaSegura } from '../utils/normalizadores';

export const compromisosService = {
  
  escucharCompromisosMes: (mesAnio, callback) => {
    const q = query(
      collection(db, 'compromisos'),
      where('mes_anio', '==', mesAnio)
    );

    return onSnapshot(q, (snapshot) => {
      const compromisos = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          fecha_compromiso_texto: formatearFechaSegura(data.fecha_compromiso, "Sin fecha"),
          ultima_accion_fecha: formatearFechaSegura(data.ultima_accion?.fecha, "Reciente")
        };
      });
      callback(compromisos);
    }, (error) => {
      console.error("Error al escuchar compromisos:", error);
      callback([]);
    });
  },

  crearCompromiso: async (data, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);

      const [anio, mes, dia] = data.fecha.split('-');
      const mesAnio = `${anio}-${mes}`;
      const fechaCompromisoTs = Timestamp.fromDate(new Date(anio, mes - 1, dia));

      const accionInicial = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Creación",
        detalle: "Evento creado"
      };

      const nuevoCompromiso = {
        cliente_id: data.cliente_id || "N/A",
        cliente_nombre: data.cliente_nombre || "Sin Nombre",
        factura_id: data.factura_id || null,
        folio_factura: data.folio_factura || null,
        tipo_evento: data.tipo_evento || "Recordatorio",
        motivo: data.motivo || "Seguimiento",
        monto: Number(data.monto) || 0,
        telefono: data.telefono || "",
        fecha_compromiso: fechaCompromisoTs,
        mes_anio: mesAnio,
        estatus: "Pendiente",
        ultima_accion: accionInicial,
        historial_acciones: [accionInicial],
        creado_por: userName || "Admin",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const compRef = doc(collection(db, 'compromisos'));
      batch.set(compRef, nuevoCompromiso);

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Creación',
        cliente: nuevoCompromiso.cliente_nombre,
        detalle: `Se agendó un ${nuevoCompromiso.tipo_evento.toLowerCase()} para el ${dia}/${mes}/${anio}. Motivo: ${nuevoCompromiso.motivo}.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true, id: compRef.id };
    } catch (error) {
      console.error("Error al crear compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  completarCompromiso: async (id, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);
      const accion = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Completar",
        detalle: "Marcado como completado"
      };

      const compRef = doc(db, 'compromisos', id);
      batch.update(compRef, {
        estatus: "Completado",
        fecha_completado: serverTimestamp(),
        completado_por: userName || "Admin",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion)
      });

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Actualización',
        cliente: clienteNombre || "N/A",
        detalle: `El compromiso de seguimiento fue marcado como completado.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error completando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  reprogramarCompromiso: async (id, nuevaFechaStr, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);
      const [anio, mes, dia] = nuevaFechaStr.split('-');
      const mesAnio = `${anio}-${mes}`;
      const nuevaFechaTs = Timestamp.fromDate(new Date(anio, mes - 1, dia));

      const accion = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Reprogramación",
        detalle: `Reprogramado para el ${dia}/${mes}/${anio}`
      };

      const compRef = doc(db, 'compromisos', id);
      batch.update(compRef, {
        fecha_compromiso: nuevaFechaTs,
        mes_anio: mesAnio,
        estatus: "Reprogramado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion)
      });

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Reprogramación',
        cliente: clienteNombre || "N/A",
        detalle: `El compromiso fue reprogramado para la fecha ${dia}/${mes}/${anio}.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error reprogramando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  cancelarCompromiso: async (id, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);
      const accion = {
        responsable: userName || "Admin",
        fecha: Timestamp.now(),
        accion: "Cancelación",
        detalle: "Cancelado por el operador"
      };

      const compRef = doc(db, 'compromisos', id);
      batch.update(compRef, {
        estatus: "Cancelado",
        updatedAt: serverTimestamp(),
        ultima_accion: accion,
        historial_acciones: arrayUnion(accion)
      });

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'Cancelación',
        cliente: clienteNombre || "N/A",
        detalle: `Se canceló el compromiso de seguimiento.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error cancelando compromiso:", error);
      return { success: false, error: error.message };
    }
  },

  registrarWhatsAppCompromiso: async ({ idCompromiso, esFacturaAuto, clienteNombre, tipoMensaje, userName, actor_uid }) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);

      if (!esFacturaAuto && idCompromiso) {
        const accion = {
          responsable: userName || "Admin",
          fecha: Timestamp.now(),
          accion: "WhatsApp",
          detalle: `WhatsApp abierto (${tipoMensaje})`
        };

        const compRef = doc(db, 'compromisos', idCompromiso);
        batch.update(compRef, {
          updatedAt: serverTimestamp(),
          ultima_accion: accion,
          historial_acciones: arrayUnion(accion)
        });
      }

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'Admin',
        modulo: 'Calendario',
        tipo: 'WhatsApp',
        cliente: clienteNombre || "N/A",
        detalle: `Se abrió WhatsApp con una plantilla tipo "${tipoMensaje}".`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error registrando WhatsApp:", error);
      return { success: false, error: error.message };
    }
  },

  eliminarCompromiso: async (id, clienteNombre, userName, actor_uid) => {
    if (!actor_uid) {
      return { success: false, error: "No se identificó al usuario responsable de la acción." };
    }

    try {
      const batch = writeBatch(db);

      const compRef = doc(db, 'compromisos', id);
      batch.delete(compRef);

      const actRef = doc(collection(db, 'actividad'));
      batch.set(actRef, {
        actor_uid,
        usuario: userName || 'SU',
        modulo: 'Calendario',
        tipo: 'Eliminación',
        cliente: clienteNombre || "N/A",
        detalle: `El SU eliminó permanentemente un registro de compromiso del calendario.`,
        serverTime: serverTimestamp()
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      console.error("Error eliminando compromiso:", error);
      return { success: false, error: error.message };
    }
  }
};
```

## File: src/services/facturasService.js
```javascript
import { db } from "../config/firebase";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  increment,
  serverTimestamp,
  Timestamp,
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
    facturas,
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
      const factura = facturas.find(
        (item) => item.id === idFactura,
      );

      if (!factura) {
        throw new Error("La factura no fue encontrada.");
      }

      const abonoTarget = (
        factura._abonos_raw || []
      ).find((abono) => abono.id_abono === idAbono);

      if (!abonoTarget) {
        throw new Error("El abono no fue encontrado.");
      }

      const clienteBD = clientes.find(
        (cliente) => cliente.id === factura.cliente_id,
      );

      if (!clienteBD) {
        throw new Error(
          "No se encontró el cliente enlazado mediante cliente_id.",
        );
      }

      const montoAbono =
        Number(abonoTarget.monto) || 0;

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

      const batch = writeBatch(db);

      const facturaRef = doc(
        db,
        FACTURAS_COLLECTION,
        idFactura,
      );

      batch.update(facturaRef, {
        saldo_pendiente: nuevoSaldo,
        monto_pagado: nuevoMontoPagado,
        estatus: nuevoEstatus,
        abonos: arrayRemove(abonoTarget),
        updatedAt: serverTimestamp(),
      });

      const facturasCliente = facturas.filter(
        (item) => item.cliente_id === factura.cliente_id,
      );

      const abonosRestantes = [];

      facturasCliente.forEach((item) => {
        (item._abonos_raw || []).forEach((abono) => {
          if (abono.id_abono !== idAbono) {
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

      const clienteUpdatePayload = {
        deuda_actual: increment(montoAbono),
        credito_disponible: increment(-montoAbono),
        updatedAt: serverTimestamp(),
      };

      if (ultimoAbono) {
        clienteUpdatePayload.monto_ultimo_pago =
          ultimoAbono.monto;
        clienteUpdatePayload.fecha_ultimo_pago =
          ultimoAbono.fecha;
        clienteUpdatePayload.metodo_ultimo_pago =
          ultimoAbono.metodo;
        clienteUpdatePayload.ultimo_deposito_monto =
          ultimoAbono.monto;
        clienteUpdatePayload.ultimo_deposito_fecha =
          ultimoAbono.fecha;
        clienteUpdatePayload.ultimo_deposito_metodo =
          ultimoAbono.metodo;
      } else {
        clienteUpdatePayload.monto_ultimo_pago = null;
        clienteUpdatePayload.fecha_ultimo_pago = null;
        clienteUpdatePayload.metodo_ultimo_pago = null;
        clienteUpdatePayload.ultimo_deposito_monto = null;
        clienteUpdatePayload.ultimo_deposito_fecha = null;
        clienteUpdatePayload.ultimo_deposito_metodo = null;
      }

      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        clienteBD.id,
      );

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
        statsPayload.ingresos_semana =
          increment(-montoAbono);
      }

      if (pasaAVencida) {
        statsPayload.cartera_vencida =
          increment(montoAbono);
      }

      if (
        factura.estatus === "Pagada" &&
        nuevoSaldo > 0
      ) {
        statsPayload.facturas_pagadas = increment(-1);
        statsPayload.facturas_pendientes = increment(1);
        statsPayload.total_liquidado = increment(
          -montoTotal,
        );

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

  modificarFactura: async () => ({
    success: false,
    error:
      "La modificación de facturas requiere recalibración de saldos y límites. En construcción.",
  }),

  eliminarFactura: async () => ({
    success: false,
    error:
      "La anulación directa requiere estorno financiero en cascada. En construcción.",
  }),
};
```

## File: src/services/solicitudesService.js
```javascript
import { db } from "../config/firebase";
import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

const SOLICITUDES_COLLECTION = "solicitudes";
const CLIENTES_COLLECTION = "clientes";
const ACTIVIDAD_COLLECTION = "actividad";

const mapearErrorFirestore = (error) => {
  if (error?.code === "resource-exhausted") {
    return "La cuota diaria de Firestore fue agotada. La solicitud no pudo procesarse. Espera al restablecimiento de la cuota o utiliza el emulador local.";
  }

  if (error?.code === "permission-denied") {
    return "Firestore rechazó la operación por permisos. Verifica que las reglas publicadas coincidan con firestore.rules.";
  }

  if (error?.code === "aborted") {
    return "La solicitud cambió mientras se procesaba. Recarga la página e intenta nuevamente.";
  }

  if (error?.code === "unavailable") {
    return "Firestore no está disponible en este momento. Revisa tu conexión.";
  }

  return error?.message || "No se pudo completar la operación de crédito.";
};

export const solicitudesService = {
  crearSolicitudAumento: async ({
    cliente_id,
    cliente,
    monto_incremento,
    limite_anterior,
    motivo,
    solicitado_por_uid,
    solicitado_por_nombre,
  }) => {
    try {
      if (!cliente_id) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!solicitado_por_uid) {
        throw new Error(
          "No se identificó al usuario solicitante.",
        );
      }

      const monto = Number(monto_incremento);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      const limiteAnterior =
        Number(limite_anterior) || 0;

      const solicitudRef = doc(
        collection(db, SOLICITUDES_COLLECTION),
      );

      const payload = {
        id: solicitudRef.id,
        cliente_id,
        cliente: String(cliente || "S/N"),
        monto_incremento: monto,
        limite_anterior: limiteAnterior,
        nuevo_limite_propuesto:
          limiteAnterior + monto,
        motivo: String(motivo || "").trim(),
        estatus: "Pendiente",
        solicitado_por_uid,
        solicitado_por_nombre:
          solicitado_por_nombre || "ADMIN",
        createdAt: serverTimestamp(),
      };

      const batch = writeBatch(db);
      batch.set(solicitudRef, payload);

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid: solicitado_por_uid,
        usuario:
          solicitado_por_nombre || "ADMIN",
        modulo: "Crédito",
        tipo: "Solicitud de Aumento",
        cliente: payload.cliente,
        detalle: `Solicitó un aumento de $${monto.toLocaleString("es-MX")} para la línea de crédito. La solicitud quedó pendiente de autorización.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return {
        success: true,
        data: payload,
      };
    } catch (error) {
      console.error(
        "Error creando solicitud de crédito:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  aplicarAumentoDirectoSU: async ({
    cliente_id,
    cliente_nombre,
    monto_incremento,
    limite_actual,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      if (!cliente_id) {
        throw new Error(
          "El identificador del cliente es obligatorio.",
        );
      }

      if (!actor_uid) {
        throw new Error(
          "No se identificó al Súper Usuario responsable.",
        );
      }

      const monto = Number(monto_incremento);

      if (!Number.isFinite(monto) || monto <= 0) {
        throw new Error(
          "El monto del incremento debe ser mayor a cero.",
        );
      }

      const batch = writeBatch(db);
      const clienteRef = doc(
        db,
        CLIENTES_COLLECTION,
        cliente_id,
      );

      batch.update(clienteRef, {
        limite_credito: increment(monto),
        credito_disponible: increment(monto),
        updatedAt: serverTimestamp(),
      });

      const nuevoLimiteTotal =
        (Number(limite_actual) || 0) + monto;

      const actividadRef = doc(
        collection(db, ACTIVIDAD_COLLECTION),
      );

      batch.set(actividadRef, {
        actor_uid,
        usuario: actor_nombre || "SU",
        modulo: "Crédito",
        tipo: "Aumento Directo",
        cliente: cliente_nombre || "S/N",
        detalle: `El SU autorizó directamente un aumento de $${monto.toLocaleString("es-MX")}. El límite quedó en $${nuevoLimiteTotal.toLocaleString("es-MX")}.`,
        serverTime: serverTimestamp(),
      });

      await batch.commit();

      return { success: true };
    } catch (error) {
      console.error(
        "Error aplicando aumento directo:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },

  resolverSolicitud: async ({
    solicitud_id,
    decision,
    actor_uid,
    actor_nombre,
  }) => {
    try {
      if (
        !solicitud_id ||
        !decision ||
        !actor_uid
      ) {
        throw new Error(
          "Faltan datos obligatorios para resolver la solicitud.",
        );
      }

      if (
        !["Autorizado", "Rechazado"].includes(
          decision,
        )
      ) {
        throw new Error(
          "La decisión indicada no es válida.",
        );
      }

      await runTransaction(
        db,
        async (transaction) => {
          const solicitudRef = doc(
            db,
            SOLICITUDES_COLLECTION,
            solicitud_id,
          );

          const solicitudSnap =
            await transaction.get(solicitudRef);

          if (!solicitudSnap.exists()) {
            throw new Error(
              "La solicitud no existe.",
            );
          }

          const solicitudData =
            solicitudSnap.data();

          if (
            solicitudData.estatus !== "Pendiente"
          ) {
            throw new Error(
              `La solicitud ya fue resuelta como ${solicitudData.estatus}.`,
            );
          }

          const clienteId =
            solicitudData.cliente_id;

          if (!clienteId) {
            throw new Error(
              "La solicitud no contiene un cliente_id válido.",
            );
          }

          const clienteRef = doc(
            db,
            CLIENTES_COLLECTION,
            clienteId,
          );

          const clienteSnap =
            await transaction.get(clienteRef);

          if (!clienteSnap.exists()) {
            throw new Error(
              "El cliente asociado no existe.",
            );
          }

          const clienteData =
            clienteSnap.data();

          if (
            clienteData.activo === false ||
            clienteData.estatus === "Inactivo"
          ) {
            throw new Error(
              "No se puede resolver crédito para un cliente inactivo.",
            );
          }

          const montoIncremento = Number(
            solicitudData.monto_incremento,
          );

          if (
            !Number.isFinite(montoIncremento) ||
            montoIncremento <= 0
          ) {
            throw new Error(
              "La solicitud contiene un monto inválido.",
            );
          }

          if (decision === "Autorizado") {
            transaction.update(clienteRef, {
              limite_credito:
                increment(montoIncremento),
              credito_disponible:
                increment(montoIncremento),
              updatedAt: serverTimestamp(),
            });
          }

          transaction.update(solicitudRef, {
            estatus: decision,
            resolvedAt: serverTimestamp(),
            resolvedBy: actor_nombre || "SU",
            resolvedByUid: actor_uid,
          });

          const actividadRef = doc(
            collection(db, ACTIVIDAD_COLLECTION),
          );

          transaction.set(actividadRef, {
            actor_uid,
            usuario: actor_nombre || "SU",
            modulo: "Crédito",
            tipo: `Resolución (${decision})`,
            cliente:
              solicitudData.cliente || "S/N",
            detalle: `El SU resolvió como ${decision.toUpperCase()} la solicitud de aumento por $${montoIncremento.toLocaleString("es-MX")}.`,
            serverTime: serverTimestamp(),
          });
        },
        {
          maxAttempts: 1,
        },
      );

      return { success: true };
    } catch (error) {
      console.error(
        "Fallo transaccional al resolver solicitud:",
        error,
      );

      return {
        success: false,
        error: mapearErrorFirestore(error),
      };
    }
  },
};
```

## File: src/services/usuariosService.js
```javascript
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

## File: src/utils/normalizadores.js
```javascript
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
```

## File: src/utils/whatsapp.js
```javascript
export const normalizarTelefonoMX = (telefono) => {
  let numero = (telefono || "").replace(/\D/g, "");

  // Corrige formato viejo tipo +52 1 4431234567
  if (numero.startsWith("521") && numero.length === 13) {
    numero = `52${numero.slice(3)}`;
  }

  // Si ya viene con lada 52 y son 12 dígitos, lo respetamos
  if (numero.startsWith("52") && numero.length === 12) {
    return numero;
  }

  // Si viene como número mexicano normal de 10 dígitos
  if (numero.length === 10) {
    return `52${numero}`;
  }

  return numero;
};

export const generarMensajeWA = (plantilla, factura = {}) => {
  const cliente = factura.cliente || "cliente";
  const folio = factura.folio || "S/F";
  const vencimiento = factura.vencimiento || "los próximos días";

  const saldoNumero = Number(factura.saldo_pendiente || factura.monto || 0);
  const saldo = saldoNumero.toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const templates = {
    atrasado: `Hola ${cliente},

Te contactamos para recordarte que tu factura *${folio}* presenta un saldo vencido de *$${saldo} MXN*.

Te invitamos a regularizar tu cuenta lo antes posible para mantener tu historial al corriente.

Quedamos a tus órdenes para cualquier duda.`,

    proximo: `Hola ${cliente},

Este es un recordatorio amigable de que tu factura *${folio}* por el saldo de *$${saldo} MXN* está próxima a vencer el día *${vencimiento}*.

Agradecemos de antemano tu pago puntual.`,

    manual: `Hola ${cliente},

Te contactamos para dar seguimiento a tu cuenta.

Quedamos atentos a cualquier duda o comentario.`,
  };

  return templates[plantilla] || templates.manual;
};
```

## File: vite.config.js
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()
  ],
build: {
    minify: 'terser',
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
  },

})
```
