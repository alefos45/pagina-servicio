export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Falta GROQ_API_KEY.");

    const requestBody = await context.request.json();
    const role = requestBody.role || 'empleado';
    const menu = requestBody.menu || [];
    const messages = requestBody.messages || [];

    // 1. Formatear la carta (Manejo de nulos seguro e inclusión de categoría)
    const menuText = menu.map(item => {
      const allergens = (item.allergens && Array.isArray(item.allergens) && item.allergens.length > 0) 
        ? item.allergens.join(', ') 
        : 'Ninguno';
      const recipeData = item.recipe ? JSON.stringify(item.recipe) : "Sin receta técnica.";
      return `- [${item.category || 'General'}] ${item.name || 'Plato'} | Desc: ${item.description || 'Sin descripción'} | Alérgenos: ${allergens} | Receta: ${recipeData}`;
    }).join('\n');

    // 2. El Prompt
    const systemPrompt = `Eres el Capacitador IA de La Tierrita del Berriondo.
El rol del usuario es: "${role}".
Carta actual:
${menuText}

REGLAS:
1. Si es "empleado" o "mesero": Da ingredientes enumerados, alérgenos exactos y maridajes. Prohibido dar gramajes o tiempos.
2. Si es "chef" o "admin": Da la tabla de receta completa (gramajes, tiempos, etc.).
3. FORMATO VISUAL ESTRICTO:
   - Usa tablas en Markdown estándar (con | y -). 
   - NO uses etiquetas HTML como <br>. Para separar ingredientes en una tabla, usa comas o viñetas cortas.
   - Usa negritas para resaltar nombres de platos o alérgenos.
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
        temperature: 0.3, // Temperatura baja para respuestas precisas y bien formateadas
      }),
    });

    // CAPTURAMOS EL ERROR REAL DE GROQ
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`❌ Groq falló (Status ${response.status}):`, errorData);
      
      if (response.status === 429) {
        throw new Error("El Capacitador está recibiendo muchas preguntas seguidas. Espera 10 segundos y vuelve a intentar.");
      }
      throw new Error(`Error de Groq (${response.status}). Revisa la consola.`);
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