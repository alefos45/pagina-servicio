export async function onRequestPost(context) {
  try {
    // 1. Verificación inicial de la API Key
    const apiKey = context.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error("Falta la variable de entorno GROQ_API_KEY en Cloudflare.");
    }

    // 2. Parseo seguro del JSON que envía React
    let requestBody;
    try {
      requestBody = await context.request.json();
    } catch (parseError) {
      throw new Error("El cuerpo de la petición no es un JSON válido. Revisa lo que envía el frontend.");
    }

    const role = requestBody.role || 'empleado';
    const menu = requestBody.menu || [];
    const messages = requestBody.messages || [];

    // 3. Procesamiento del menú con validación (Evita errores si falta algún campo)
    const menuText = menu.map((item, index) => {
      if (!item || typeof item !== 'object') {
        return `- Plato inválido en la posición ${index}`;
      }
      const name = item.name || 'Plato sin nombre';
      const allergens = Array.isArray(item.allergens) ? item.allergens.join(', ') : 'Ninguno';
      const recipeStatus = item.recipe ? "Receta disponible." : "Receta reservada a cocina.";
      return `- ${name}. Alérgenos: ${allergens}. ${recipeStatus}`;
    }).join('\n');

    // 4. Construcción del prompt para Groq
    const systemPrompt = `Eres el Capacitador IA de La Tierrita. Tu rol actual es: ${role}.
Carta disponible:
${menuText || "No hay platos en la carta."}

REGLAS:
1. Responde basándote en la carta.
2. Si faltan recetas, niégalas amablemente.
3. Sé conciso.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // 5. Llamada a Groq con manejo de errores HTTP
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: groqMessages,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq falló (Status ${response.status}): ${errorData}`);
    }

    const data = await response.json();
    
    // 6. Validación final de la estructura de la respuesta
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("La respuesta de Groq no tiene el formato esperado.");
    }

    return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // 🔥 MODO DIAGNÓSTICO: Devolvemos el error real con el stack trace
    console.error("❌ ERROR EN EL BACKEND:", error.message, error.stack);
    
    return new Response(JSON.stringify({ 
      error: "Error en el servidor", 
      detalle: error.message 
    }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}