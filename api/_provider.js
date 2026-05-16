// Shared provider abstraction for the Vercel serverless functions.
//
// Provider priority (first env var set wins):
//   1. OPENROUTER_API_KEY  → OpenRouter, defaults to google/gemini-2.0-flash-exp:free
//   2. OPENAI_API_KEY      → OpenAI (or any OpenAI-compatible endpoint via OPENAI_BASE_URL)
//   3. GEMINI_API_KEY      → Google Gemini direct
//
// All three speak the same callAI({ prompt, image }) interface so the
// /api/analyze-photo and /api/suggest-eatout endpoints don't have to
// branch on provider.

export function pickProvider() {
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

// Strip code fences and pull the first JSON object out of a string.
// Used by every endpoint since the smaller / free routes don't always
// honour response_format and may wrap their reply in prose.
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

// Generic caller for any OpenAI-compatible /chat/completions endpoint —
// OpenAI proper, OpenRouter, or self-hosted vLLM. Vision input passes
// through the `image_url` content part with a data URL.
async function callOpenAICompatible({ prompt, image, key, model, base, tag, isOpenRouter }) {
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
  // OpenRouter recommends both headers for leaderboard attribution +
  // analytics. Harmless when sent to native OpenAI.
  if (isOpenRouter) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_REFERER || "https://ai-fitness-tracker.vercel.app";
    headers["X-Title"] = process.env.OPENROUTER_TITLE || "AI Fitness Tracker";
  }

  const body = {
    model,
    messages: [{ role: "user", content }],
    max_tokens: 768,
  };
  // OpenRouter's free Gemini routes don't reliably honour the OpenAI
  // response_format option, so only send it on native OpenAI calls.
  // extractJson() copes with prose-wrapped or code-fenced JSON either way.
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
    throw new Error(`${tag} ${res.status}: ${errBody.slice(0, 240) || res.statusText}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callOpenAI({ prompt, image }) {
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const base = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")
    .replace(/\/$/, "");
  const isOpenRouter = base.includes("openrouter.ai");
  return callOpenAICompatible({
    prompt,
    image,
    key,
    model,
    base,
    tag: isOpenRouter ? "OpenRouter" : "OpenAI",
    isOpenRouter,
  });
}

// Dedicated OpenRouter branch. Defaults to a free Gemini route that
// supports vision input so the analyze-photo endpoint works out of the
// box. Override with OPENROUTER_MODEL if you want Claude, Llama, etc.
async function callOpenRouter({ prompt, image }) {
  const key = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free";
  return callOpenAICompatible({
    prompt,
    image,
    key,
    model,
    base: "https://openrouter.ai/api/v1",
    tag: "OpenRouter",
    isOpenRouter: true,
  });
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
      "No AI provider configured. Set OPENROUTER_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in Vercel environment variables.",
    );
  }
  if (provider === "openrouter") return callOpenRouter({ prompt, image });
  if (provider === "openai") return callOpenAI({ prompt, image });
  return callGemini({ prompt, image });
}
