import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap, Sparkles, Wallet, HeartPulse, MessageSquare } from 'lucide-react';
import { useAuth, ROLE_LABEL, canSeeRecipes, canUseHRChat } from '../../auth/useAuth';
import { supabase, type Payslip } from '../../lib/supabaseClient';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export function Dashboard() {
  const { user, role, profile } = useAuth();
  const [lastPayslip, setLastPayslip] = useState<Payslip | null>(null);

  useEffect(() => {
    if (!user || !role) return;
    let active = true;
    const q = supabase.from('payslips').select('*').order('created_at', { ascending: false }).limit(1);
    // RLS ya limita por usuario; admin verá cualquiera.
    const run = async () => {
      const { data } = await q;
      if (!active) return;
      setLastPayslip((data?.[0] as Payslip | undefined) ?? null);
    };
    void run();
    return () => { active = false; };
  }, [user, role]);

  if (!role) return null;
  const recipes = canSeeRecipes(role);
  const firstName = (profile?.full_name ?? 'equipo').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">{new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-2 font-display text-4xl leading-tight sm:text-5xl">
          {greeting}, <span className="italic text-terracotta">{firstName}</span>.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-ink-muted">
          Este es tu portal como {ROLE_LABEL[role].toLowerCase()}. Aprende la carta con el Capacitador, revisa tus pagos y cuida tu turno.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Link to="/capacitacion" className="group relative col-span-1 overflow-hidden rounded-2xl bg-forest p-6 text-cream shadow-card sm:col-span-2 lg:col-span-4">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-terracotta/30 blur-3xl transition group-hover:bg-terracotta/50" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cream/60">
              <Sparkles className="h-3.5 w-3.5" /> Capacitador IA
            </div>
            <div className="mt-10">
              <h2 className="font-display text-2xl leading-tight sm:text-3xl">
                Aprende la carta hablando con <span className="italic text-saffron">Capacitador</span>.
              </h2>
              <p className="mt-2 max-w-md text-sm text-cream/70">
                {recipes
                  ? 'Pídele recetas, técnicas y quizzes. Como cocina, tienes la receta completa.'
                  : 'Pídele explicaciones, alérgenos, maridajes y quizzes de servicio.'}
              </p>
              <span className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-cream px-4 py-2 text-sm font-semibold text-forest transition group-hover:gap-2.5">
                Empezar <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </div>
        </Link>

        <Card className="col-span-1 p-5 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sage text-sage-ink">
              <Wallet className="h-4 w-4" />
            </div>
            <Badge tone={lastPayslip?.status === 'pagada' ? 'sage' : 'saffron'}>
              {lastPayslip?.status ?? 'sin pagos'}
            </Badge>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Última colilla</p>
          <p className="mt-1 font-display text-2xl">{lastPayslip ? fmt.format(lastPayslip.net_cop) : '—'}</p>
          <p className="text-xs text-ink-muted">{lastPayslip?.period ?? 'Sin pagos recientes'}</p>
          <Link to="/nomina" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-terracotta">
            Ver todas <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card className="col-span-1 p-5 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-terracotta/10 text-terracotta">
              <GraduationCap className="h-4 w-4" />
            </div>
            <Badge tone="terracotta">{recipes ? 'cocina' : 'sala'}</Badge>
          </div>
          <p className="mt-4 text-xs text-ink-muted">Modo de aprendizaje</p>
          <p className="mt-1 font-display text-2xl">{recipes ? 'Con receta' : 'Sin receta'}</p>
          <p className="text-xs text-ink-muted">
            {recipes ? 'Ves técnicas y tiempos completos.' : 'Recetas reservadas a cocina y administración.'}
          </p>
          <Link to="/capacitacion" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-terracotta">
            Ir al Capacitador <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        <Card className="col-span-1 p-5 sm:col-span-1 lg:col-span-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-saffron/30 text-ink">
            <HeartPulse className="h-4 w-4" />
          </div>
          <p className="mt-4 text-xs text-ink-muted">Bienestar</p>
          <p className="mt-1 font-display text-2xl">3 minutos</p>
          <p className="text-xs text-ink-muted">Pausa activa recomendada antes del pico.</p>
          <Link to="/bienestar" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-terracotta">
            Ver guía <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>

        {canUseHRChat(role) && (
          <Card className="col-span-1 p-5 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-forest text-cream">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="eyebrow">Consultas RRHH</p>
                <p className="mt-0.5 font-display text-lg leading-snug">Escribe a administración sobre horarios o pagos.</p>
              </div>
              <Link to="/rrhh" className="btn-ghost shrink-0 !px-3 !py-2 text-xs">Abrir</Link>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}