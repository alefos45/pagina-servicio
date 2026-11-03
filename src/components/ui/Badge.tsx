import type { ReactNode } from 'react';

type Tone = 'sage' | 'terracotta' | 'saffron' | 'neutral' | 'rose';

const toneMap: Record<Tone, string> = {
  sage: 'bg-sage text-sage-ink',
  terracotta: 'bg-terracotta/10 text-terracotta',
  saffron: 'bg-saffron/25 text-ink',
  neutral: 'bg-ink/5 text-ink-muted',
  rose: 'bg-rose/10 text-rose',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`pill ${toneMap[tone]}`}>{children}</span>;
}
