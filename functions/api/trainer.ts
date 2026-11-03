import { handleChat, type ChatMessage } from '../_lib/groq';
import { buildTrainerPrompt, type MenuItemForPrompt } from '../_lib/prompts';

interface Env { GROQ_API_KEY?: string; }
interface PagesContext { request: Request; env: Env; }

const MAX_MESSAGES = 12;
const MAX_CONTENT = 2000;
const MAX_MENU_ITEMS = 100;

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

  if (!context.env.GROQ_API_KEY) return json({ error: 'Capacitador no configurado.' }, 500);

  let body: { role?: unknown; menu?: unknown; messages?: unknown };
  try { body = await context.request.json() as typeof body; }
  catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const role = typeof body.role === 'string' ? body.role : 'empleado';

  const menu: MenuItemForPrompt[] = [];
  if (Array.isArray(body.menu)) {
    for (const raw of body.menu.slice(0, MAX_MENU_ITEMS)) {
      if (!raw || typeof raw !== 'object') continue;
      const m = raw as Record<string, unknown>;
      if (typeof m.id !== 'string' || typeof m.name !== 'string') continue;
      menu.push({
        id: m.id,
        name: m.name.slice(0, 200),
        description: typeof m.description === 'string' ? m.description.slice(0, 500) : null,
        allergens: Array.isArray(m.allergens)
          ? (m.allergens as unknown[]).filter((a): a is string => typeof a === 'string').slice(0, 20)
          : [],
        recipe: (m.recipe as MenuItemForPrompt['recipe']) ?? null,
      });
    }
  }

  const messages: ChatMessage[] = [];
  const raw = Array.isArray(body.messages) ? body.messages : [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const m = item as { role?: unknown; content?: unknown };
    if ((m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string') {
      messages.push({ role: m.role, content: m.content.slice(0, MAX_CONTENT) });
    }
  }
  const trimmed = messages.slice(-MAX_MESSAGES);
  if (trimmed.length === 0) return json({ error: 'Escribe un mensaje para empezar.' }, 400);

  try {
    const reply = await handleChat(context.env.GROQ_API_KEY, [
      { role: 'system', content: buildTrainerPrompt(role, menu) },
      ...trimmed,
    ]);
    return json({ reply });
  } catch (err) {
    console.error('Groq error:', err);
    return json({ error: 'Capacitador no disponible.' }, 502);
  }
}