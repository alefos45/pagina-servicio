import { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { HeartPulse, AlertCircle, Loader2 } from 'lucide-react';
import { supabase, type WellnessResource } from '../../lib/supabaseClient';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'h3', 'h4', 'blockquote'],
  ALLOWED_ATTR: [] as string[],
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });

export default function WellnessDashboard() {
  const [resources, setResources] = useState<WellnessResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from('wellness_resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (fetchError) setError('No se pudieron cargar los recursos.');
      else setResources(data ?? []);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, []);

  const safe = useMemo(
    () => resources.map((r) => ({ ...r, html: DOMPurify.sanitize(r.content, SANITIZE_CONFIG) })),
    [resources],
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Bienestar"
        title="Cuidarse también es parte del turno"
        description="Guías cortas, pensadas para antes, durante y después del servicio."
      />

      {loading && (
        <div className="flex justify-center py-12" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-terracotta" />
        </div>
      )}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose/20 bg-rose/5 p-4 text-sm text-rose">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {!loading && !error && safe.length === 0 && (
        <p className="text-sm text-ink-muted">Aún no hay recursos publicados.</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {safe.map((r) => (
          <Card key={r.id} className="flex flex-col p-6">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sage text-sage-ink">
              <HeartPulse className="h-4 w-4" />
            </div>
            <div className="mt-3"><Badge tone="sage">{r.category}</Badge></div>
            <h2 className="mt-3 font-display text-xl leading-tight">{r.title}</h2>
            <div className="rich mt-3" dangerouslySetInnerHTML={{ __html: r.html }} />
            <p className="mt-auto pt-5 text-xs text-ink-muted">{formatDate(r.created_at)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}