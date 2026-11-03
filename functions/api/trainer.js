export async function onRequestPost(context) {
  try {
    // 1. Obtener la clave API de Groq desde Cloudflare
    const apiKey = context.env.GROQ_API_KEY;

    if (!apiKey) {
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
        // Modelos populares en Groq: "llama3-8b-8192", "llama3-70b-8192", "mixtral-8x7b-32768"
        model: "llama3-8b-8192", 
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
        console.error("Error desde Groq:", errorData);
        throw new Error("Error en la API de Groq");
    }

    // 5. Devolver la respuesta al frontend
    const data = await response.json();
    const botReply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply: botReply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error en el Capacitador:", error);
    return new Response(JSON.stringify({ error: "El Capacitador no responde. Intenta de nuevo." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}