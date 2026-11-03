export async function onRequestPost(context) {
  try {
    // 1. Obtener la clave API de Groq
    const apiKey = context.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error("❌ ERROR: Falta GROQ_API_KEY en Cloudflare.");
      return new Response(JSON.stringify({ error: "Capacitador no configurado." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Obtener el mensaje del frontend
    const requestBody = await context.request.json();
    const userMessage = requestBody.message || "Hola";

    // 3. Llamar a la API de Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // MODELO ACTUALIZADO: llama3-8b-8192 ya no existe, usamos la versión 3.1
        model: "openai/gpt-oss-20b", 
        messages: [
          {
            role: "system",
            content: "Eres el Capacitador IA de La Tierrita. Explicas ingredientes, alérgenos, maridajes y cómo recomendar platos de la cocina boyacense. Eres amable y profesional."
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        temperature: 0.7,
      }),
    });

    // 4. Manejo de errores de la API de Groq
    if (!response.ok) {
        const errorData = await response.text();
        // Esto imprimirá el error REAL en los logs de Cloudflare
        console.error(`❌ Error de Groq (Status ${response.status}):`, errorData);
        throw new Error(`Error en la API de Groq: ${response.status}`);
    }

    // 5. Devolver la respuesta al frontend
    const data = await response.json();
    const botReply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply: botReply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Error en el bloque catch:", error.message || error);
    return new Response(JSON.stringify({ error: "El Capacitador no responde. Intenta de nuevo." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}