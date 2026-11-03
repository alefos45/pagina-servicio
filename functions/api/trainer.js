export async function onRequestPost(context) {
  try {
    const apiKey = context.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Falta configurar GROQ_API_KEY" }), { status: 500 });
    }

    const requestBody = await context.request.json();
    
    // 1. Detectar el rol y el menú (por si el frontend los envía)
    const role = requestBody.role || 'empleado';
    const menu = requestBody.menu || [];
    
    // 2. Preparar el arreglo de mensajes (soporta 'messages' array o 'message' string)
    let messages = requestBody.messages || [];
    if (messages.length === 0 && requestBody.message) {
        messages = [{ role: "user", content: requestBody.message }];
    }

    // Si no hay mensajes de ninguna forma, ponemos uno por defecto
    if (messages.length === 0) {
        messages = [{ role: "user", content: "Hola" }];
    }

    // 3. Transformamos el menú (la carta) a texto para la IA
    const menuText = menu.map(item => {
      const recipeInfo = item.recipe ? "Receta disponible." : "Receta reservada a cocina.";
      return `- Plato: ${item.name}. Descripción: ${item.description || 'No disponible'}. Alérgenos: ${item.allergens ? item.allergens.join(', ') : 'Ninguno'}. ${recipeInfo}`;
    }).join('\n');

    // 4. El "cerebro" de la IA
    const systemPrompt = `Eres el Capacitador IA de La Tierrita del Berriondo. 
Tu objetivo es capacitar a los empleados y meseros.
El rol del usuario actual es: ${role}.

AQUÍ TIENES LA CARTA OFICIAL CON ALÉRGENOS:
${menuText || "No se ha cargado la carta en este momento."}

REGLAS ESTRICTAS:
1. Responde basándote ÚNICAMENTE en la carta proporcionada.
2. Si el usuario pregunta por una receta y la carta dice "Receta reservada a cocina", DEBES negarte amablemente y decir que eso es exclusivo del personal de cocina.
3. Si te preguntan por alérgenos, cita exactamente los que aparecen en la carta.
4. Sé amable y directo. No vuelvas a saludar si ya están conversando.`;

    // 5. Unimos el cerebro con el historial de la conversación
    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

    // 6. Llamamos a Groq
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
        console.error("❌ Error de Groq:", errorData);
        throw new Error(`Groq dice: ${response.status}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error en el backend:", error.message);
    return new Response(JSON.stringify({ error: "El Capacitador no responde.", detalle: error.message }), { status: 500 });
  }
}