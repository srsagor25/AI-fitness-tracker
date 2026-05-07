import { callAI, extractJson, pickProvider } from "./_provider.js";

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed. Use POST." });
    return;
  }
  if (!pickProvider()) {
    res.status(500).json({
      error:
        "No AI provider configured. Add OPENAI_API_KEY or GEMINI_API_KEY in Vercel project Environment Variables.",
    });
    return;
  }

  try {
    const { base64, mediaType = "image/jpeg", quantity = "" } = req.body || {};
    if (!base64) {
      res.status(400).json({ error: "Missing image (base64)." });
      return;
    }

    const text = await callAI({
      prompt: PROMPT(quantity),
      image: { base64, mediaType },
    });
    const parsed = extractJson(text);
    if (!parsed) {
      res.status(502).json({ error: "Could not parse JSON from model response." });
      return;
    }
    const out = {
      name: String(parsed.name ?? "Photo meal"),
      kcal: Math.max(0, Math.round(Number(parsed.kcal) || 0)),
      protein_g: Math.max(0, Number(parsed.protein_g) || 0),
      fat_g: Math.max(0, Number(parsed.fat_g) || 0),
      carbs_g: Math.max(0, Number(parsed.carbs_g) || 0),
      confidence: ["low", "medium", "high"].includes(parsed.confidence)
        ? parsed.confidence
        : "medium",
      notes: parsed.notes ? String(parsed.notes) : "",
    };
    res.status(200).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
