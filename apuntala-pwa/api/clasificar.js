// Función serverless (Vercel) OPCIONAL para el asistente de clasificación por fotografía.
// Requiere la variable de entorno ANTHROPIC_API_KEY configurada en Vercel.
// No almacena ninguna imagen ni dato: reenvía la solicitud a la API de Anthropic y devuelve la respuesta.

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: "Asistente no configurado" });
  try {
    const { data, media_type, prompt } = req.body || {};
    if (!data || !prompt) return res.status(400).json({ error: "Solicitud incompleta" });
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: media_type || "image/jpeg", data } }, { type: "text", text: prompt }] }],
      }),
    });
    const j = await r.json();
    return res.status(r.status).json(j);
  } catch (e) {
    return res.status(502).json({ error: "Error al contactar el servicio de IA" });
  }
}
