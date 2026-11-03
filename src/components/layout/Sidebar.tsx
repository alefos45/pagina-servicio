import { NavLink } from 'react-router-dom';
import { Home, GraduationCap, Wallet, HeartPulse, MessageSquare, LogOut, Sparkles } from 'lucide-react';
import { useAuth, ROLE_LABEL, canUseHRChat } from '../../auth/useAuth';

const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true, requiresHR: false },
  { to: '/capacitacion', label: 'Capacitación', icon: GraduationCap, end: false, requiresHR: false },
  { to: '/nomina', label: 'Mi RRHH', icon: Wallet, end: false, requiresHR: false },
  { to: '/bienestar', label: 'Bienestar', icon: HeartPulse, end: false, requiresHR: false },
  { to: '/rrhh', label: 'Consultas', icon: MessageSquare, end: false, requiresHR: true },
];

export function Sidebar() {
  const { profile, role, signOut } = useAuth();
  const items = NAV_ITEMS.filter((item) => !item.requiresHR || canUseHRChat(role));

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-forest px-4 py-6 text-cream lg:flex">
      <div className="flex items-center gap-2.5 px-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-terracotta text-white">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <p className="font-display text-lg leading-none">La Tierrita</p>
          <p className="text-[11px] text-cream/50">Portal interno</p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-cream/10 text-cream' : 'text-cream/60 hover:bg-cream/5 hover:text-cream'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-4 border-t border-cream/10 pt-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-saffron text-sm font-semibold text-forest">
            {(profile?.full_name ?? 'U').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{profile?.full_name ?? 'Usuario'}</p>
            <p className="truncate text-[11px] text-cream/50">{role ? ROLE_LABEL[role] : ''}</p>
          </div>
          <button onClick={() => void signOut()} aria-label="Cerrar sesión" className="text-cream/50 hover:text-cream">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}