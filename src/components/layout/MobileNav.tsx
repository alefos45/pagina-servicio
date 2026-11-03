import { NavLink } from 'react-router-dom';
import { Home, GraduationCap, Wallet, HeartPulse } from 'lucide-react';

const items = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/capacitacion', label: 'Aprender', icon: GraduationCap, end: false },
  { to: '/nomina', label: 'RRHH', icon: Wallet, end: false },
  { to: '/bienestar', label: 'Bienestar', icon: HeartPulse, end: false },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-paper/95 backdrop-blur lg:hidden">
      <div className="grid grid-cols-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition ${
                isActive ? 'text-terracotta' : 'text-ink-muted'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}