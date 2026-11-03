import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from './auth/useAuth';
import ProtectedRoute from './components/layout/ProtectedRoute';
import { Layout } from './components/layout/Layout';
import type { AppRole } from './lib/supabaseClient';
import { Login } from './modules/auth/Login';
import { Dashboard } from './modules/dashboard/Dashboard';
import { Trainer } from './modules/trainer/Trainer';
import { Payroll } from './modules/payroll/Payroll';
import WellnessDashboard from './modules/wellness/WellnessDashboard';
import HRChat from './modules/hr-chat/HRChat';

const ALL_ROLES: AppRole[] = ['admin', 'cocinero', 'mesero', 'empleado'];
const HR_ROLES: AppRole[] = ['admin', 'mesero', 'empleado'];

function Guarded({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  return <ProtectedRoute allowedRoles={roles}>{children}</ProtectedRoute>;
}

function Forbidden() {
  const { signOut } = useAuth();
  return (
    <div className="grid min-h-screen place-items-center bg-cream px-6">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-terracotta" aria-hidden="true" />
        <p className="mt-6 font-display text-6xl tracking-tight">403</p>
        <h1 className="mt-3 text-xl font-medium">No tienes acceso a esta sección</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Tu rol no incluye este contenido. Si crees que es un error, pide a tu administrador que revise tus permisos.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/" className="btn-primary">Ir al inicio</Link>
          <button type="button" onClick={() => void signOut()} className="btn-ghost">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/403" element={<Forbidden />} />
      <Route
        element={
          <Guarded roles={ALL_ROLES}>
            <Layout />
          </Guarded>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="capacitacion" element={<Trainer />} />
        <Route path="nomina" element={<Payroll />} />
        <Route path="bienestar" element={<WellnessDashboard />} />
        <Route
          path="rrhh"
          element={
            <Guarded roles={HR_ROLES}>
              <HRChat />
            </Guarded>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}