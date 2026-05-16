// Shared provider abstraction for the Vercel serverless functions.
// Picks OpenAI if OPENAI_API_KEY is set, otherwise Gemini if GEMINI_API_KEY
// is set. The chosen provider's call() returns the raw text content.
//
// OpenRouter is supported via the OpenAI branch: set OPENAI_BASE_URL to
// https://openrouter.ai/api/v1, OPENAI_API_KEY to your OpenRouter key,
// and OPENAI_MODEL to any OpenRouter route (e.g. google/gemini-2.0-flash-exp:free).
// The Authorization header + chat-completions shape are identical to OpenAI,
// so no separate code path is needed — only two extra recommended headers
// (HTTP-Referer + X-Title) get added automatically when the base looks
// like an OpenRouter endpoint.

export function pickProvider() {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

// Strip code fences and pull the first JSON object out of a string.
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

// Call any OpenAI-compatible chat-completions endpoint with optional
// vision input. Base URL is configurable so the same code works for
// OpenAI proper and OpenRouter.
//
// `image` should be { base64, mediaType } or null.
async function callOpenAI({ prompt, image }) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
    .replace(/\/$/, "");
  const isOpenRouter = base.includes("openrouter.ai");

  const content = [{ type: "text", text: prompt }];
  if (image) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
    });
  }

  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  // OpenRouter recommends both headers for analytics + leaderboard
  // attribution. They're harmless when present against OpenAI direct.
  if (isOpenRouter) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER || "https://ai-fitness-tracker.vercel.app";
    headers["X-Title"] = process.env.OPENROUTER_TITLE || "AI Fitness Tracker";
  }

  const body = {
    model,
    messages: [{ role: "user", content }],
    max_tokens: 768,
  };
  // OpenRouter doesn't reliably honor response_format on every model
  // (especially free Gemini routes), so only send it on OpenAI direct.
  // extractJson() in this file tolerates loose responses either way.
  if (!isOpenRouter) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    const tag = isOpenRouter ? "OpenRouter" : "OpenAI";
    throw new Error(`${tag} ${res.status}: ${errBody.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

// Call Gemini generateContent (free-tier-compatible model).
async function callGemini({ prompt, image }) {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const parts = [{ text: prompt }];
  if (image) {
    parts.push({
      inline_data: { mime_type: image.mediaType, data: image.base64 },
    });
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 768,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${body.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function callAI({ prompt, image }) {
  const provider = pickProvider();
  if (!provider) {
    throw new Error(
      "No AI provider configured. Set OPENAI_API_KEY or GEMINI_API_KEY in Vercel environment variables.",
    );
  }
  if (provider === "openai") return callOpenAI({ prompt, image });
  return callGemini({ prompt, image });
}
