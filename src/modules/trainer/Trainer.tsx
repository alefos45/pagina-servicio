import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChefHat, Lock, Loader2, Send, Sparkles, X } from 'lucide-react';
import { useAuth, canSeeRecipes, ROLE_LABEL } from '../../auth/useAuth';
import { supabase, type Json } from '../../lib/supabaseClient';
import { sendTrainerMessage, type ChatMessage } from '../../lib/chat';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  allergens: string[];
  recipe: Json | null;
}

const SUGGESTIONS_CHEF = [
  'Receta del cocido paso a paso',
  'Hazme un quiz de técnicas',
  'Tiempos del mute boyacense',
  'Errores comunes en el risotto',
];
const SUGGESTIONS_SALA = [
  'Explícame el cocido boyacense',
  'Hazme un quiz de entradas',
  '¿Qué alérgenos tiene el brownie?',
  '¿Qué vino recomiendo con la longaniza?',
];

function greeting(role: string, withRecipe: boolean): string {
  if (withRecipe) return 'Soy tu Capacitador de cocina. Puedo repasar recetas, técnicas y tiempos contigo. ¿Qué plato entrenamos hoy?';
  if (role === 'admin') return 'Soy tu Capacitador. Como administración puedes ver recetas y acompañar al equipo. ¿Qué revisamos?';
  return 'Soy tu Capacitador de sala. Puedo explicarte ingredientes, alérgenos, maridajes y cómo recomendar cada plato. Las recetas quedan reservadas a cocina. ¿Por dónde empezamos?';
}

export function Trainer() {
  const { role } = useAuth();
  const withRecipe = canSeeRecipes(role);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setMenuLoading(true);
      const { data, error: err } = await supabase.rpc('get_menu_for_role');
      if (!active) return;
      if (err) {
        console.error('Error cargando el menú:', err.message);
        setError('No se pudo cargar la carta.');
      } else {
        setMenu((data ?? []) as MenuItem[]);
      }
      setMenuLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [role]);

  useEffect(() => {
    if (messages.length === 0 && !menuLoading) {
      setMessages([{ role: 'assistant', content: greeting(role ?? 'empleado', withRecipe) }]);
    }
  }, [messages.length, menuLoading, role, withRecipe]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const suggestions = useMemo(() => (withRecipe ? SUGGESTIONS_CHEF : SUGGESTIONS_SALA), [withRecipe]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading || !role) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content }];
    setMessages(next);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const reply = await sendTrainerMessage(role, menu, next);
      setMessages((p) => [...p, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      console.error("Error real del chat:", err);
      // 🔥 AQUÍ ESTÁ EL CAMBIO: Mostramos el mensaje real del error
      setError(err.message || 'El Capacitador no responde. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Capacitación · ${ROLE_LABEL[role ?? 'empleado']}`}
        title="Capacitador IA"
        description={
          withRecipe
            ? 'Pídele recetas, técnicas, tiempos o quizzes. Tienes la receta completa porque tu rol es de cocina.'
            : 'Pídele explicaciones, alérgenos, maridajes o quizzes de servicio. Las recetas están reservadas a cocina y administración.'
        }
        action={
          <span className={`pill ${withRecipe ? 'bg-saffron/30 text-ink' : 'bg-sage text-sage-ink'}`}>
            {withRecipe ? <><ChefHat className="h-3.5 w-3.5" /> Modo cocina</> : <><Lock className="h-3.5 w-3.5" /> Modo servicio</>}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex h-[calc(100dvh-16rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-paper shadow-card">
          <div className="flex-1 space-y-3 overflow-y-auto p-5">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                  m.role === 'user' ? 'bg-forest text-cream' : 'bg-paper-2 text-ink'
                }`}>{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex gap-1.5 rounded-2xl bg-paper-2 px-4 py-3">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-ink/30" />
                </div>
              </div>
            )}
            {error && <p className="text-center text-xs text-rose">{error}</p>}
            <div ref={endRef} />
          </div>

          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-5 pb-3">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => void send(s)}
                  className="rounded-full border border-border bg-paper-2 px-3 py-1.5 text-left text-[11px] text-ink-muted transition hover:border-terracotta/30 hover:text-ink">
                  {s}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); void send(input); }}
            className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="Pregúntale al Capacitador…" maxLength={500}
              className="min-w-0 flex-1 rounded-full border border-border bg-paper-2 px-4 py-2.5 text-sm outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/20"
            />
            <button type="submit" disabled={loading || !input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-terracotta text-white transition hover:bg-terracotta-hover disabled:opacity-40"
              aria-label="Enviar">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>

        <aside className="hidden h-[calc(100dvh-16rem)] min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-paper p-4 shadow-card lg:flex">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Sparkles className="h-4 w-4 text-terracotta" />
            <p className="text-sm font-semibold">Carta para entrenar</p>
          </div>
          <div className="mt-3 flex-1 space-y-1 overflow-y-auto pr-1">
            {menuLoading && <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-terracotta" /></div>}
            {!menuLoading && menu.length === 0 && <p className="text-xs text-ink-muted">Sin platos cargados.</p>}
            {menu.map((m) => (
              <button key={m.id} type="button" onClick={() => void send(`Explícame ${m.name}.`)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-paper-2">
                <p className="font-medium">{m.name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {m.allergens.length > 0
                    ? m.allergens.map((a) => <Badge key={a} tone="saffron">{a}</Badge>)
                    : <Badge tone="sage">sin alérgenos</Badge>}
                  {withRecipe && m.recipe && <Badge tone="terracotta">receta</Badge>}
                  {!withRecipe && <Badge tone="neutral"><Lock className="h-2.5 w-2.5" /> receta</Badge>}
                </div>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}