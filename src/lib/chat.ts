import type { AppRole, Json } from './supabaseClient';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface MenuItemForTrainer {
  id: string;
  name: string;
  description: string | null;
  allergens: string[];
  recipe: Json | null;
}

// Enviamos el menú que el cliente YA obtuvo por RPC.
// Como el RPC filtra la receta por rol, para meseros/empleados
// el arreglo llega con recipe = null. Aunque alguien manipule el
// payload, no puede inventar recetas reales.
export async function sendTrainerMessage(
  role: AppRole,
  menu: MenuItemForTrainer[],
  messages: ChatMessage[],
): Promise<string> {
  const res = await fetch('/api/trainer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, menu, messages }),
  });
  const data = (await res.json()) as { reply?: string; error?: string };
  if (!res.ok || !data.reply) throw new Error(data.error ?? 'No se pudo enviar.');
  return data.reply;
}