import { createContext, useContext } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import type { AppRole, Profile } from '../lib/supabaseClient';

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return context;
}

// ---- Helpers de permisos (fuente única de verdad en la UI) ----
export const CAN_SEE_RECIPES: AppRole[] = ['cocinero', 'admin'];
export const CAN_USE_HR_CHAT: AppRole[] = ['admin', 'mesero', 'empleado'];

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: 'Administración',
  cocinero: 'Cocina',
  mesero: 'Servicio de sala',
  empleado: 'Empleado',
};

export function canSeeRecipes(role: AppRole | null): boolean {
  return role !== null && CAN_SEE_RECIPES.includes(role);
}

export function canUseHRChat(role: AppRole | null): boolean {
  return role !== null && CAN_USE_HR_CHAT.includes(role);
}