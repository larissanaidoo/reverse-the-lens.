// Serverless proxy: holds the Anthropic API key server-side so testers need none.
// Vercel auto-deploys this at /api/analyze. The key is read from the
// ANTHROPIC_API_KEY environment variable you set in the Vercel dashboard.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "Use POST." } });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: { message: "Server is missing ANTHROPIC_API_KEY. Set it in Vercel → Settings → Environment Variables." } });
    return;
  }

  const body = req.body || {};

  // Light guard so this proxy can't be casually misused as a general chatbot
  // on your key — only allow the coaching debrief request shape.
  const toolName = body.tools && body.tools[0] && body.tools[0].name;
  if (toolName !== "deliver_debrief") {
    res.status(400).json({ error: { message: "Unexpected request." } });
    return;
  }
  if (typeof body.max_tokens !== "number" || body.max_tokens > 4000) {
    body.max_tokens = 3200;
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(body)
    });
    const text = await r.text();
    res.status(r.status).setHeader("content-type", "application/json").send(text);
  } catch (e) {
    res.status(502).json({ error: { message: "Proxy error: " + (e && e.message) } });
  }
}
