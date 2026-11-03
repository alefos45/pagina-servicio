import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import DOMPurify from 'dompurify';
import { AlertCircle, Loader2, MessageSquarePlus, Send } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { supabase, type HRMessage, type HRQuery, type HRQueryStatus } from '../../lib/supabaseClient';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';

const STATUS_LABEL: Record<HRQueryStatus, string> = { open: 'Abierta', answered: 'Respondida', closed: 'Cerrada' };
const cleanText = (v: string) => DOMPurify.sanitize(v, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function HRChat() {
  const { user, role } = useAuth();
  const userId = user?.id ?? null;
  const isAdmin = role === 'admin';

  const [queries, setQueries] = useState<HRQuery[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HRMessage[]>([]);
  const [loadingQueries, setLoadingQueries] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => queries.find((q) => q.id === selectedId) ?? null, [queries, selectedId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const load = async () => {
      setLoadingQueries(true);
      const base = supabase.from('hr_queries').select('*');
      const scoped = isAdmin ? base : base.eq('user_id', userId);
      const { data, error: err } = await scoped.order('created_at', { ascending: false });
      if (!active) return;
      if (err) setError('No se pudieron cargar las consultas.');
      else setQueries(data ?? []);
      setLoadingQueries(false);
    };
    void load();
    return () => { active = false; };
  }, [userId, isAdmin]);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    let active = true;
    const load = async () => {
      setLoadingMessages(true);
      const { data, error: err } = await supabase
        .from('hr_messages').select('*').eq('query_id', selectedId).order('created_at', { ascending: true });
      if (!active) return;
      if (err) { setMessages([]); setError('No se pudieron cargar los mensajes.'); }
      else setMessages(data ?? []);
      setLoadingMessages(false);
    };
    void load();
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    const s = subject.trim();
    if (!userId || !s || busy || cooldown) return;
    setBusy(true); setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
    setError(null);
    const { data, error: err } = await supabase.from('hr_queries')
      .insert({ user_id: userId, subject: s }).select('*').single();
    setBusy(false);
    if (err || !data) { setError('No se pudo crear la consulta.'); return; }
    setQueries((p) => [data, ...p]);
    setSubject('');
    setSelectedId(data.id);
  };

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!userId || !selectedId || !text || busy || cooldown) return;
    setBusy(true); setCooldown(true);
    setTimeout(() => setCooldown(false), 3000);
    setError(null);
    const { data, error: err } = await supabase.from('hr_messages')
      .insert({ query_id: selectedId, sender_id: userId, message: text }).select('*').single();
    setBusy(false);
    if (err || !data) { setError('No se pudo enviar el mensaje.'); return; }
    setMessages((p) => [...p, data]);
    setDraft('');
  };

  const isClosed = selected?.status === 'closed';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Consultas RRHH"
        title="Habla con administración"
        description={isAdmin
          ? 'Responde las consultas del equipo. Cada hilo queda registrado.'
          : 'Escribe sobre horarios, pagos o cualquier duda laboral. Administración te responde aquí.'}
      />

      <div className="grid h-[calc(100dvh-15rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-border bg-paper shadow-card lg:grid-cols-[320px_1fr]">
        <aside className={`${selectedId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r`}>
          <form onSubmit={(e) => void handleCreate(e)} className="space-y-2 border-b border-border p-4">
            <label htmlFor="hr-subject" className="eyebrow">Nueva consulta</label>
            <input id="hr-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200}
              placeholder="Asunto" required
              className="w-full rounded-xl border border-border bg-paper-2 px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20" />
            <button type="submit" disabled={busy || cooldown || !subject.trim()}
              className="btn-primary w-full !py-2 text-xs">
              <MessageSquarePlus className="h-3.5 w-3.5" /> {cooldown ? 'Espera…' : 'Crear consulta'}
            </button>
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingQueries && <div className="flex justify-center p-8"><Loader2 className="h-5 w-5 animate-spin text-terracotta" /></div>}
            {!loadingQueries && queries.length === 0 && <p className="p-5 text-sm text-ink-muted">No hay consultas todavía.</p>}
            <ul>
              {queries.map((q) => (
                <li key={q.id}>
                  <button type="button" onClick={() => setSelectedId(q.id)} disabled={busy}
                    className={`w-full border-b border-border px-4 py-3 text-left transition ${q.id === selectedId ? 'bg-paper-2' : 'hover:bg-paper-2'}`}>
                    <span className="block truncate text-sm font-medium">{q.subject}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-muted">
                      <span>{formatDate(q.created_at)}</span>
                      <Badge tone={q.status === 'open' ? 'sage' : q.status === 'closed' ? 'neutral' : 'saffron'}>
                        {STATUS_LABEL[q.status]}
                      </Badge>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className={`${selectedId ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col`}>
          {error && (
            <div role="alert" className="m-4 flex items-start gap-2 rounded-xl border border-rose/20 bg-rose/5 p-3 text-sm text-rose">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-ink-muted">
              Selecciona o crea una consulta para ver la conversación.
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between border-b border-border px-5 py-4">
                <h2 className="font-display text-lg">{selected.subject}</h2>
                <Badge tone={selected.status === 'open' ? 'sage' : 'neutral'}>{STATUS_LABEL[selected.status]}</Badge>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5" aria-live="polite">
                {loadingMessages && <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-terracotta" /></div>}
                {!loadingMessages && messages.length === 0 && <p className="text-sm text-ink-muted">Aún no hay mensajes.</p>}
                {messages.map((m) => {
                  const mine = m.sender_id === userId;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                      <p className="mb-1 text-[11px] text-ink-muted">
                        {mine ? 'Tú' : isAdmin ? 'Empleado' : 'Administración'} · {formatDate(m.created_at)}
                      </p>
                      <p className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm ${
                        mine ? 'bg-forest text-cream' : 'bg-paper-2 text-ink'
                      }`}>{cleanText(m.message)}</p>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={(e) => void handleSend(e)} className="flex items-end gap-2 border-t border-border p-3">
                <label htmlFor="hr-draft" className="sr-only">Mensaje</label>
                <textarea id="hr-draft" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)}
                  maxLength={2000} disabled={isClosed} required placeholder="Escribe tu mensaje…"
                  className="min-h-0 flex-1 resize-none rounded-xl border border-border bg-paper-2 px-3 py-2 text-sm focus:border-terracotta focus:outline-none focus:ring-2 focus:ring-terracotta/20 disabled:opacity-50" />
                <button type="submit" disabled={busy || cooldown || !draft.trim() || isClosed}
                  className="grid h-10 w-10 place-items-center rounded-full bg-terracotta text-white disabled:opacity-40"
                  aria-label="Enviar">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}