import { useEffect, useState } from 'react';
import { Award, Download, FileText, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { supabase, type Certificate, type Payslip } from '../../lib/supabaseClient';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export function Payroll() {
  const { user, role } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (!user) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const [p, c] = await Promise.all([
        supabase.from('payslips').select('*').order('created_at', { ascending: false }),
        supabase.from('certificates').select('*').order('issued_at', { ascending: false }),
      ]);
      if (!active) return;
      if (!p.error) setPayslips((p.data ?? []) as Payslip[]);
      if (!c.error) setCerts((c.data ?? []) as Certificate[]);
      setLoading(false);
    };
    void load();
    return () => { active = false; };
  }, [user]);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Mi RRHH"
        title="Nómina y certificados"
        description={
          isAdmin
            ? 'Como administración ves la nómina y los certificados del equipo. Descarga y confirma vigencias.'
            : 'Tus colillas y certificados, siempre disponibles. Descarga y comparte cuando los necesites.'
        }
      />

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Colillas de pago</h2>
          <Badge tone="sage">{loading ? '…' : payslips.length}</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {loading && [0, 1, 2].map((n) => <div key={n} className="h-36 animate-pulse rounded-2xl border border-border bg-paper" />)}
          {!loading && payslips.length === 0 && (
            <p className="col-span-full text-sm text-ink-muted">Aún no hay colillas publicadas para ti.</p>
          )}
          {payslips.map((p) => (
            <Card key={p.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-forest text-cream">
                  <Wallet className="h-4 w-4" />
                </div>
                <Badge tone={p.status === 'pagada' ? 'sage' : 'saffron'}>{p.status}</Badge>
              </div>
              <p className="mt-4 text-xs text-ink-muted">{p.period}</p>
              <p className="mt-1 font-display text-2xl">{fmt.format(p.net_cop)}</p>
              <p className="text-xs text-ink-muted">Bruto {fmt.format(p.gross_cop)}</p>
              {p.file_path ? (
                <a href={p.file_path} target="_blank" rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-terracotta">
                  <Download className="h-3.5 w-3.5" /> Descargar PDF
                </a>
              ) : (
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <FileText className="h-3.5 w-3.5" /> Pendiente de cargar
                </span>
              )}
            </Card>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Certificados</h2>
          <Badge tone="terracotta">{loading ? '…' : certs.length}</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {loading && [0, 1].map((n) => <div key={n} className="h-24 animate-pulse rounded-2xl border border-border bg-paper" />)}
          {!loading && certs.length === 0 && (
            <p className="col-span-full text-sm text-ink-muted">Aún no hay certificados cargados.</p>
          )}
          {certs.map((c) => (
            <Card key={c.id} className="flex items-start gap-4 p-5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-saffron/30 text-ink">
                {c.expires_at ? <ShieldCheck className="h-4 w-4" /> : <Award className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.title}</p>
                <p className="mt-0.5 text-xs text-ink-muted">
                  Emitido el {dateFmt(c.issued_at)}
                  {c.expires_at ? ` · vence el ${dateFmt(c.expires_at)}` : ''}
                </p>
                <div className="mt-2 flex items-center gap-3">
                  {c.file_path ? (
                    <>
                      <a href={c.file_path} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-terracotta">
                        <FileText className="h-3.5 w-3.5" /> Abrir
                      </a>
                      <a href={c.file_path} target="_blank" rel="noopener noreferrer" download
                        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink">
                        <Download className="h-3.5 w-3.5" /> Descargar
                      </a>
                    </>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
                      <FileText className="h-3.5 w-3.5" /> Pendiente de cargar
                    </span>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}