import { useEffect, useState, type FormEvent } from 'react';
import DOMPurify from 'dompurify';
import {
  supabase,
  type Json,
  type MenuItemPublic,
  type MenuItemResult,
} from '../../lib/supabaseClient';

const MAX_RESULTS = 3;

const STOPWORDS = new Set([
  'como', 'lleva', 'tiene', 'tienen', 'receta', 'ingredientes', 'ingrediente', 'alergenos',
  'alergeno', 'plato', 'cual', 'cuales', 'para', 'sobre', 'esta', 'este', 'que', 'quiero',
  'saber', 'dime', 'carta', 'preparar', 'preparacion',
]);

const ANSWER_CONFIG = {
  ALLOWED_TAGS: ['h3', 'h4', 'p', 'strong', 'em', 'ul', 'li', 'dl', 'dt', 'dd'],
  ALLOWED_ATTR: [] as string[],
};

interface Answer {
  id: string;
  html: string;
}

const normalize = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function recipeToHtml(value: Json | undefined): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) {
    return `<ul>${value.map((entry) => `<li>${recipeToHtml(entry)}</li>`).join('')}</ul>`;
  }
  if (typeof value === 'object') {
    return `<dl>${Object.entries(value)
      .map(([key, entry]) => `<dt>${escapeHtml(key)}</dt><dd>${recipeToHtml(entry)}</dd>`)
      .join('')}</dl>`;
  }
  return escapeHtml(String(value));
}

function buildAnswerHtml(item: MenuItemResult): string {
  const allergens =
    item.allergens && item.allergens.length > 0
      ? item.allergens.map(escapeHtml).join(', ')
      : 'Sin alérgenos declarados';

  const parts: string[] = [
    `<h3>${escapeHtml(item.name)}</h3>`,
    item.description ? `<p>${escapeHtml(item.description)}</p>` : '',
    `<p><strong>Alérgenos:</strong> ${allergens}</p>`,
  ];

  if (!('recipe' in item)) {
    parts.push('<p><em>La receta está restringida para tu rol.</em></p>');
  } else if (item.recipe === null || item.recipe === undefined) {
    parts.push('<p><em>Sin receta registrada.</em></p>');
  } else {
    parts.push(`<h4>Receta</h4>${recipeToHtml(item.recipe)}`);
  }

  return DOMPurify.sanitize(parts.join(''), ANSWER_CONFIG);
}

function findMatches(question: string, items: MenuItemPublic[]): MenuItemPublic[] {
  const q = normalize(question);
  if (q === '') return [];

  const exact = items.filter((item) => {
    const name = normalize(item.name);
    return name !== '' && q.includes(name);
  });
  if (exact.length > 0) return exact.slice(0, MAX_RESULTS);

  const tokens = q.split(/[^a-z0-9]+/).filter((token) => token.length >= 4 && !STOPWORDS.has(token));
  if (tokens.length === 0) return [];

  return items
    .map((item) => {
      const name = normalize(item.name);
      return { item, score: tokens.filter((token) => name.includes(token)).length };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((entry) => entry.item);
}

export default function MenuAgent() {
  const [items, setItems] = useState<MenuItemPublic[]>([]);
  const [loadingMenu, setLoadingMenu] = useState<boolean>(true);
  const [question, setQuestion] = useState<string>('');
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [searched, setSearched] = useState<boolean>(false);
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async (): Promise<void> => {
      const { data, error: fetchError } = await supabase
        .from('menu_items_public')
        .select('*')
        .order('name', { ascending: true });

      if (!active) return;

      if (fetchError) {
        console.error('Error cargando la carta:', fetchError.message);
        setError('No se pudo cargar la carta.');
      } else {
        setItems(data ?? []);
      }
      setLoadingMenu(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const handleAsk = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy) return;

    setBusy(true);
    setSearched(false);
    setError(null);

    const matches = findMatches(text, items);

    try {
      const results = await Promise.all(
        matches.map(async (match) => {
          const { data, error: rpcError } = await supabase.rpc('get_menu_item_for_role', {
            item_id: match.id,
          });
          if (rpcError) throw rpcError;
          return data as unknown as MenuItemResult | null;
        }),
      );

      setAnswers(
        results
          .filter((result): result is MenuItemResult => result !== null)
          .map((result) => ({ id: result.id, html: buildAnswerHtml(result) })),
      );
    } catch (caught) {
      console.error('Error consultando el plato:', caught instanceof Error ? caught.message : caught);
      setError('No se pudo consultar el plato.');
      setAnswers([]);
    } finally {
      setBusy(false);
      setSearched(true);
    }
  };

  return (
    <section>
      <h1>Agente de carta</h1>

      <form onSubmit={(event) => void handleAsk(event)} className="menu-form">
        <label htmlFor="menu-question" className="sr-only">
          Pregunta por un plato
        </label>
        <input
          id="menu-question"
          type="text"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          maxLength={200}
          placeholder="Ej.: ¿Qué lleva la lasaña?"
          disabled={loadingMenu}
          required
        />
        <button type="submit" className="btn" disabled={busy || loadingMenu || question.trim() === ''}>
          {busy ? 'Consultando…' : 'Preguntar'}
        </button>
      </form>

      {loadingMenu && <p className="muted">Cargando carta…</p>}

      {!loadingMenu && items.length > 0 && (
        <ul className="chips" aria-label="Platos disponibles">
          {items.map((item) => (
            <li key={item.id} className="chip">
              {item.name}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      {searched && !busy && !error && answers.length === 0 && (
        <p className="muted">No encontré ese plato en la carta.</p>
      )}

      {answers.map((answer) => (
        <article
          key={answer.id}
          className="card answer"
          dangerouslySetInnerHTML={{ __html: answer.html }}
        />
      ))}
    </section>
  );
}
