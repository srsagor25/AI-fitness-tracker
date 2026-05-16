// AI provider — OpenRouter only.
//
// Env vars:
//   OPENROUTER_API_KEY   (required)  Your OpenRouter API key
//   OPENROUTER_MODEL     (optional)  Defaults to google/gemini-2.0-flash-exp:free
//   OPENROUTER_REFERER   (optional)  Sent as HTTP-Referer for leaderboard attribution
//   OPENROUTER_TITLE     (optional)  Sent as X-Title for leaderboard attribution
//
// One callAI({ prompt, image }) function used by /api/analyze-photo and
// /api/suggest-eatout. Image input flows through the OpenAI-shape
// `image_url` content part with a base64 data URL.

const DEFAULT_MODEL = "google/gemini-2.0-flash-exp:free";

export function pickProvider() {
  return process.env.OPENROUTER_API_KEY ? "openrouter" : null;
}

// Strip code fences and pull the first JSON object out of a string.
// Free Gemini routes don't always honour structured-output requests so
// every caller passes responses through this to be safe.
export function extractJson(text) {
  if (!text) return null;
  const stripped = text.replace(/```json\s*|\s*```/g, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {}
  const m = stripped.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

export async function callAI({ prompt, image }) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it in Vercel project → Settings → Environment Variables and redeploy.",
    );
  }
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;

  const content = [{ type: "text", text: prompt }];
  if (image) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
    });
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      // OpenRouter uses these for leaderboard / dashboard attribution.
      "HTTP-Referer": process.env.OPENROUTER_REFERER || "https://ai-fitness-tracker.vercel.app",
      "X-Title": process.env.OPENROUTER_TITLE || "AI Fitness Tracker",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content }],
      max_tokens: 768,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status}: ${errBody.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}
