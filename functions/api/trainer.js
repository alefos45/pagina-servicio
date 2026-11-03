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
      const allergens = (item.allergens && item.allergens.length > 0) ? item.allergens.join(', ') : 'Ninguno declarado';
      const recipeData = item.recipe ? JSON.stringify(item.recipe) : "Sin receta técnica asignada aún.";
      return `- ${item.name} | Descripción: ${item.description || 'Sin descripción'} | Alérgenos: ${allergens} | Receta: ${recipeData}`;
    }).join('\n');

    // 2. El Prompt (Cerebro)
    const systemPrompt = `Eres el Capacitador IA de La Tierrita del Berriondo.
El rol del usuario es: "${role}".
Aquí está la carta actual con la que debes trabajar:
${menuText}

REGLAS DE COMPORTAMIENTO:

1. SI EL ROL ES "EMPLEADO", "MESERO" O "SALA":
   - Tu objetivo es ayudarles a vender y advertir al cliente.
   - SI TE PIDEN INGREDIENTES: Deduce los ingredientes basándote en el nombre y la descripción del plato. Preséntalos en una lista enumerada. (Ej: "El cocido lleva: 1. Cerdo, 2. Cubios...").
   - SI TE PIDEN MARIDAJES: Recomienda vinos, cervezas o cocteles que combinen bien con el plato (usa tu conocimiento gastronómico general).
   - SI TE PIDEN ALÉRGENOS: Diles EXACTAMENTE lo que dice la columna de alérgenos de la carta. Si dice "Ninguno", indícales que no tiene alérgenos declarados, pero que siempre se debe advertir sobre contacto cruzado.
   - TIENES PROHIBIDO dar: gramajes, tiempos de cocción, pasos de cocina. Si te preguntan, di: "Esa información es exclusiva del personal de cocina".

2. SI EL ROL ES "CHEF", "COCINERO" O "ADMIN":
   - SÍ PUEDES dar recetas.
   - Si te piden la receta de un plato y en la carta dice "Sin receta técnica asignada aún", diles: "Aún no has cargado los gramajes y tiempos de este plato en el sistema".
   - Si la receta sí existe en los datos, muéstrala en una tabla Markdown con: Producto, Clase, Gramaje/Unidad, Tiempo de Cocción y Tiempo de Emplatado.

Responde siempre de forma amable, profesional y concisa.`;

    const groqMessages = [
      { role: "system", content: systemPrompt },
      ...messages
    ];

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
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq falló: ${errorData}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify({ reply: data.choices[0].message.content }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ ERROR EN EL BACKEND:", error.message);
    return new Response(JSON.stringify({ error: "Error en el servidor", detalle: error.message }), { 
      status: 500, 
      headers: { "Content-Type": "application/json" } 
    });
  }
}