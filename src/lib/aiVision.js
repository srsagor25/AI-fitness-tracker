// Ported verbatim from Diet & Grocery Manager. Browser-direct Anthropic API calls.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const PROMPT = (quantity) => `You are a nutrition analyst. A user has shared a photo of food they are about to eat.

Their stated quantity is: ${JSON.stringify(quantity || "as shown in the photo")}.

Estimate the macros for that quantity. Be realistic — if the photo is ambiguous, lean toward typical portion sizes for the cuisine you can identify.

Return ONLY a single JSON object — no markdown, no commentary, no code fences. Use these exact keys:
- name           (string)  : short dish name
- kcal           (integer) : total calories for the stated quantity
- protein_g      (number)  : grams of protein
- fat_g          (number)  : grams of fat
- carbs_g        (number)  : grams of carbohydrates
- confidence     (string)  : one of "low" | "medium" | "high"
- notes          (string, max 1 short sentence) : caveat or assumption

Example output (do not copy values, just the shape):
{"name":"Chicken biryani","kcal":620,"protein_g":34,"fat_g":18,"carbs_g":78,"confidence":"medium","notes":"Assumed 1 plate ≈ 350g."}`;

function extractJson(text) {
  if (!text) return null;
  const stripped = text.replace(/```json\s*|\s*```/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

export async function analyzeFoodPhoto({ apiKey, base64, mediaType = "image/jpeg", quantity = "", model = DEFAULT_MODEL }) {
  if (!apiKey) throw new Error("Anthropic API key is not set.");
  if (!base64) throw new Error("No image provided.");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
          { type: "text", text: PROMPT(quantity) },
        ],
      }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 240) || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.content?.find((c) => c.type === "text")?.text || "";
  const parsed = extractJson(text);
  if (!parsed) throw new Error("Could not parse JSON from model response.");

  return {
    name: String(parsed.name ?? "Photo meal"),
    kcal: Math.max(0, Math.round(Number(parsed.kcal) || 0)),
    protein_g: Math.max(0, Number(parsed.protein_g) || 0),
    fat_g: Math.max(0, Number(parsed.fat_g) || 0),
    carbs_g: Math.max(0, Number(parsed.carbs_g) || 0),
    confidence: ["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium",
    notes: parsed.notes ? String(parsed.notes) : "",
  };
}

const EAT_OUT_PROMPT = ({ target, logged, remaining, slot, location, notes, eatingWindow }) => `You are a nutrition coach. The user is eating out and wants help ordering.

Daily targets:        ${target.kcal} kcal, ${target.protein}g protein
Logged so far today:  ${logged.kcal} kcal, ${logged.protein}g protein
Remaining for today:  ${remaining.kcal} kcal, ${remaining.protein}g protein
This meal slot:       ${slot}${eatingWindow ? ` (eating window ${eatingWindow})` : ""}
Restaurant / cuisine: ${location || "unspecified"}
User notes:           ${notes || "—"}

Suggest 3 distinct orders the user could realistically place. Aim each order at ~60–95% of the remaining kcal for this meal (leave room for an end-of-day snack), and prioritise hitting remaining protein. Reflect typical menu items at the stated cuisine/restaurant. Avoid suggesting items that obviously blow the kcal budget.

Then give one short paragraph of advice on how to balance the rest of the day.

Return ONLY a single JSON object — no markdown, no commentary, no code fences. Use these exact keys:
{
  "suggestions": [
    { "name": "string", "kcal": integer, "protein_g": number, "fat_g": number, "carbs_g": number, "why": "1 short sentence" },
    { "name": "string", "kcal": integer, "protein_g": number, "fat_g": number, "carbs_g": number, "why": "1 short sentence" },
    { "name": "string", "kcal": integer, "protein_g": number, "fat_g": number, "carbs_g": number, "why": "1 short sentence" }
  ],
  "advice": "1-2 sentences"
}`;

export async function suggestEatOut({ apiKey, model = DEFAULT_MODEL, target, logged, slot, location, notes, eatingWindow }) {
  if (!apiKey) throw new Error("Anthropic API key is not set.");
  const remaining = {
    kcal: Math.max(0, (target?.kcal || 0) - (logged?.kcal || 0)),
    protein: Math.max(0, (target?.protein || 0) - (logged?.protein || 0)),
  };

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 768,
      messages: [{ role: "user", content: EAT_OUT_PROMPT({ target, logged, remaining, slot, location, notes, eatingWindow }) }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 240) || res.statusText}`);
  }

  const data = await res.json();
  const text = data?.content?.find((c) => c.type === "text")?.text || "";
  const parsed = extractJson(text);
  if (!parsed || !Array.isArray(parsed.suggestions)) throw new Error("Could not parse suggestions from model response.");

  return {
    suggestions: parsed.suggestions.slice(0, 3).map((s) => ({
      name: String(s.name ?? "Suggested order"),
      kcal: Math.max(0, Math.round(Number(s.kcal) || 0)),
      protein_g: Math.max(0, Number(s.protein_g) || 0),
      fat_g: Math.max(0, Number(s.fat_g) || 0),
      carbs_g: Math.max(0, Number(s.carbs_g) || 0),
      why: s.why ? String(s.why) : "",
    })),
    advice: parsed.advice ? String(parsed.advice) : "",
    remaining,
  };
}

export async function fileToResizedBase64(file, maxDim = 1568, quality = 0.85) {
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Could not decode image."));
    i.src = dataUrl;
  });

  const longSide = Math.max(img.width, img.height);
  const scale = longSide > maxDim ? maxDim / longSide : 1;
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", quality);
  const base64 = out.split(",")[1] || "";
  return { base64, mediaType: "image/jpeg", width: w, height: h, dataUrl: out };
}
