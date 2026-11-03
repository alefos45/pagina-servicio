export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Falta GROQ_API_KEY en Cloudflare" }), { status: 500 });
    }

    const requestBody = await context.request.json();
    
    // Validación de los datos que llegan
    const role = requestBody.role || 'empleado';
    const menu = requestBody.menu || [];
    let messages = requestBody.messages || [];
    
    if (messages.length === 0 && requestBody.message) {
        messages = [{ role: "user", content: requestBody.message }];
    }
    if (messages.length === 0) {
        messages = [{ role: "user", content: "Hola" }];
    }

    // Procesar la carta
    const menuText = menu.map(item => {
      return `- Plato: ${item.name}. Alérgenos: ${item.allergens ? item.allergens.join(', ') : 'Ninguno'}. Receta: ${item.recipe ? 'Sí' : 'No'}`;
    }).join('\n');

    const systemPrompt = `Eres el Capacitador IA de La Tierrita. Tu rol actual es: ${role}.\nCarta:\n${menuText}\nResponde basándote en la carta sin dar recetas si no están permitidas.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", // EL ÚNICO MODELO VÁLIDO
        messages: groqMessages,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        // Esto enviará el error de Groq directo al frontend
        return new Response(JSON.stringify({ error: `Error Groq: ${response.status}`, detalle: errorData }), { status: 500 });
    }

    const data = await response.json();
    return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    // Si el backend explota por cualquier cosa, enviamos la causa exacta
    return new Response(JSON.stringify({ error: "Fallo en el servidor", detalle: error.message }), { status: 500 });
  }
}