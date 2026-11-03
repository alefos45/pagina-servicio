export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Falta GROQ_API_KEY.");

    const requestBody = await context.request.json();
    const role = requestBody.role || 'empleado';
    const menu = requestBody.menu || [];
    const messages = requestBody.messages || [];

    // 1. Formatear la carta
    const menuText = menu.map(item => {
      const allergens = (item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0) 
        ? item.allergens.join(', ') 
        : 'Ninguno';
      const recipeData = item.recipe ? JSON.stringify(item.recipe) : "Sin receta técnica.";
      return `- [${item.category || 'General'}] ${item.name || 'Plato'} | Desc: ${item.description || 'Sin descripción'} | Alérgenos: ${allergens} | Receta: ${recipeData}`;
    }).join('\n');

    // 2. El Prompt (Con reglas estrictas de formato)
    const systemPrompt = `Eres el Capacitador IA de La Tierrita del Berriondo.
El rol del usuario es: "${role}".
Carta actual:
${menuText}

REGLAS ESTRICTAS DE COMPORTAMIENTO:

SI EL ROL ES "EMPLEADO", "MESERO" O "SALA":
Cuando te pidan explicar un plato, DEBES responder SIEMPRE usando una tabla en Markdown con EXACTAMENTE estas 4 columnas:
| Plato | Ingredientes (incluye acompañamientos) | Alérgenos | Maridaje Recomendado |
- **Plato**: El nombre del plato consultado.
- **Ingredientes**: Lista los ingredientes del plato Y SUS ACOMPAÑAMIENTOS (ej. papa criolla, arroz, aguacate) separados por comas. NO hagas una fila por cada ingrediente.
- **Alérgenos**: Los alérgenos del plato completo.
- **Maridaje**: Da UNA recomendación (vino, cerveza, etc.) que combine con el plato completo en general. NO des un maridaje por cada ingrediente.
- **Tip**: Debajo de la tabla, agrega un "Tip:" breve ofreciendo alternativas para clientes con alergias (ej. sustituir lácteos o gluten).
- PROHIBIDO dar gramajes o tiempos de cocción.

SI EL ROL ES "CHEF", "COCINERO" O "ADMIN":
- Da la tabla de receta completa (gramajes, tiempos, emplatado) basándote en el JSON de la receta.

REGLAS DE FORMATO VISUAL:
- Usa tablas en Markdown estándar (con | y -). 
- NO uses etiquetas HTML como <br>. Usa comas o viñetas cortas.
- Usa negritas para resaltar nombres de platos o alérgenos.

EJEMPLO DE RESPUESTA PARA MESERO (Úsalo como plantilla):
| Plato | Ingredientes (incluye acompañamientos) | Alérgenos | Maridaje Recomendado |
|---|---|---|---|
| Chicharrón Toteado | Chicharrón de cerdo, papa criolla, sal y especias | Ninguno | Vino tinto robusto (Malbec) o Cerveza Lager |
**Tip**: Si el cliente no come cerdo, se puede ofrecer chicharrón de pollo.

Responde de forma concisa y elegante.`;

    const groqMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // 3. Llamar a Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: groqMessages,
        temperature: 0.2, // Temperatura baja para que sea muy estricto con las reglas
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Groq falló (Status ${response.status}):`, errorData);
      if (response.status === 429) {
        throw new Error("El Capacitador está recibiendo muchas preguntas seguidas. Espera 10 segundos.");
      }
      throw new Error(`Error de Groq (${response.status}).`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ ERROR EN EL BACKEND:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}