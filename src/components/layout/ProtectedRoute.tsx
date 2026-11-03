import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import type { AppRole } from '../../lib/supabaseClient';

interface ProtectedRouteProps {
  allowedRoles: AppRole[];
  children: ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-cream" role="status" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-terracotta" aria-hidden="true" />
        <span className="sr-only">Cargando</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/403" replace />;

  return <>{children}</>;
}