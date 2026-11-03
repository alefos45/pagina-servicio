import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handleChat } from './functions/_lib/groq';
import { buildTrainerPrompt, type MenuItemForPrompt } from './functions/_lib/prompts';

function trainerDevApi(apiKey: string | undefined): Plugin {
  return {
    name: 'trainer-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/trainer', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        let raw = '';
        req.on('data', (c: Buffer) => { raw += c.toString(); });
        req.on('end', async () => {
          res.setHeader('Content-Type', 'application/json');
          if (!apiKey) { res.statusCode = 500; res.end(JSON.stringify({ error: 'Falta GROQ_API_KEY' })); return; }
          try {
            const body = JSON.parse(raw) as { role?: string; menu?: unknown; messages?: unknown };
            const role = typeof body.role === 'string' ? body.role : 'mesero';
            const menu: MenuItemForPrompt[] = Array.isArray(body.menu)
              ? (body.menu as MenuItemForPrompt[]).slice(0, 100)
              : [];
            const list = Array.isArray(body.messages) ? body.messages : [];
            const messages = list
              .filter((m): m is { role: 'user' | 'assistant'; content: string } =>
                !!m && typeof m === 'object' && 'role' in m && 'content' in m &&
                (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
              .slice(-12)
              .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
            if (messages.length === 0) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Sin mensajes.' }));
              return;
            }
            const reply = await handleChat(apiKey, [
              { role: 'system', content: buildTrainerPrompt(role, menu) },
              ...messages,
            ]);
            res.statusCode = 200;
            res.end(JSON.stringify({ reply }));
          } catch (err) {
            console.error(err);
            res.statusCode = 502;
            res.end(JSON.stringify({ error: 'Capacitador no disponible.' }));
          }
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), trainerDevApi(env.GROQ_API_KEY)],
    build: { outDir: 'dist', sourcemap: false, target: 'es2020' },
  };
});