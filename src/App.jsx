import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthProvider";
import { GlobalProvider } from "./context/GlobalProvider";
import MainLayout from "./layouts/MainLayout";
import Calendario from "./pages/Calendario";
import Reportes from "./pages/Reportes";
import Clientes from "./pages/Clientes";
import Dashboard from "./pages/Dashboard";
import ExpedienteCliente from "./pages/ExpedienteCliente";
import Facturacion from "./pages/Facturacion";
import GestionUsuarios from "./pages/GestionUsuarios";
import Login from "./pages/Login";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GlobalProvider>
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
              <Route path="reportes" element={<Reportes />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </GlobalProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;