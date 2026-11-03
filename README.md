# La Tierrita · Portal interno de empleados

Portal privado para el equipo de La Tierrita del Berriondo. Capacitación con IA, nómina, certificados, bienestar y consultas a administración.

## Roles y permisos

| Módulo | admin | cocinero | mesero | empleado |
|---|---|---|---|---|
| Dashboard | sí | sí | sí | sí |
| Capacitación IA | sí (con receta) | sí (con receta) | sí (sin receta) | sí (sin receta) |
| Nómina / Certificados | sí (todos) | sí (propios) | sí (propios) | sí (propios) |
| Bienestar | sí | sí | sí | sí |
| Consultas RRHH | sí | no | sí | sí |

**Regla crítica:** la receta se protege en tres capas — RLS + RPC filtran en el servidor, el prompt de la IA nunca la recibe para mesero/empleado, y la UI la oculta con candado.

## Instalación local

```bash
npm i
cp .env.example .env
# edita .env con tus claves (VITE_SUPABASE_*, GROQ_API_KEY)
npm run dev