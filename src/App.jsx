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