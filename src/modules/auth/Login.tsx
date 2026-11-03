import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { supabase } from '../../lib/supabaseClient';

export function Login() {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to={from} replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSubmitting(false);
    if (err) setError('Credenciales inválidas.');
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden flex-col justify-between bg-forest p-12 text-cream lg:flex">
        <p className="font-display text-xl tracking-tight">La Tierrita del Berriondo · Portal interno</p>
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight">
            El turno empieza <span className="italic text-saffron">aquí</span>.
          </h1>
          <p className="mt-5 text-cream/70">
            Capacitación, nómina, certificados y bienestar. Solo para el equipo de La Tierrita del Berriondo.
          </p>
        </div>
        <p className="text-xs text-cream/40">Acceso exclusivo para personal autorizado.</p>
      </div>

      <div className="flex items-center justify-center bg-cream px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 className="font-display text-3xl tracking-tight">Iniciar sesión</h2>
          <p className="mt-2 text-sm text-ink-muted">Usa el correo con el que te registró tu administrador.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium">Correo electrónico</label>
              <input
                id="email" type="email" autoComplete="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm shadow-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium">Contraseña</label>
              <input
                id="password" type="password" autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm shadow-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20"
              />
            </div>
            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose/20 bg-rose/5 p-3 text-sm text-rose">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !email || !password}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-terracotta px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-terracotta-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Iniciar sesión
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}