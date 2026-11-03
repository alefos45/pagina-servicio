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
  
  const data = (await res.json()) as { reply?: string; error?: string; detalle?: string };
  
  if (!res.ok || !data.reply) {
    // Lanzamos el error exacto que viene del backend
    throw new Error(data.detalle || data.error || 'No se pudo enviar.');
  }
  
  return data.reply;
}