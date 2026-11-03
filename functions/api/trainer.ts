// Definimos los tipos para que TypeScript no dé error con context.env
interface Env {
  GROQ_API_KEY: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const apiKey = context.env.GROQ_API_KEY;

    // 1. Verificación estricta de la API Key
    if (!apiKey) {
      console.error("❌ ERROR: La variable GROQ_API_KEY no está definida en Cloudflare.");
      return new Response(JSON.stringify({ error: "Falta configurar la API Key en el servidor." }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Obtener el mensaje
    const requestBody = await context.request.json() as { message?: string };
    const userMessage = requestBody.message || "Hola";

    // 3. Llamar a Groq
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Modelo actualizado y rápido de Groq
        messages: [
          {
            role: "system",
            content: "Eres el Capacitador IA de La Tierrita. Explicas ingredientes, alérgenos, maridajes y cómo recomendar platos. Eres amable y profesional."
          },
          { role: "user", content: userMessage }
        ],
        temperature: 0.7,
      }),
    });

    // 4. Si Groq falla, imprimimos el error exacto en los logs
    if (!response.ok) {
        const errorData = await response.text();
        console.error(`❌ Error de Groq (Status ${response.status}):`, errorData);
        throw new Error(`Fallo en Groq: ${response.status}`);
    }

    // 5. Leer la respuesta de forma segura
    const data = await response.json() as any;
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("❌ Respuesta inesperada de Groq:", JSON.stringify(data));
        throw new Error("Formato de respuesta inválido");
    }

    const botReply = data.choices[0].message.content;

    return new Response(JSON.stringify({ reply: botReply }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("❌ Error en el bloque catch:", error.message || error);
    return new Response(JSON.stringify({ error: "El Capacitador no responde. Revisa los logs." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}