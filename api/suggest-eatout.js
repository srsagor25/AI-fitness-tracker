import { callAI, extractJson, pickProvider } from "./_provider.js";

const PROMPT = ({ target, logged, remaining, slot, location, notes, eatingWindow }) => `You are a nutrition coach. The user is eating out and wants help ordering.

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
    const { target, logged, slot, location, notes, eatingWindow } = req.body || {};
    if (!target || !logged) {
      res.status(400).json({ error: "Missing target/logged values." });
      return;
    }
    const remaining = {
      kcal: Math.max(0, (target?.kcal || 0) - (logged?.kcal || 0)),
      protein: Math.max(0, (target?.protein || 0) - (logged?.protein || 0)),
    };

    const text = await callAI({
      prompt: PROMPT({ target, logged, remaining, slot, location, notes, eatingWindow }),
      image: null,
    });
    const parsed = extractJson(text);
    if (!parsed || !Array.isArray(parsed.suggestions)) {
      res.status(502).json({ error: "Could not parse suggestions from model response." });
      return;
    }
    const suggestions = parsed.suggestions.slice(0, 3).map((s) => ({
      name: String(s.name ?? "Suggested order"),
      kcal: Math.max(0, Math.round(Number(s.kcal) || 0)),
      protein_g: Math.max(0, Number(s.protein_g) || 0),
      fat_g: Math.max(0, Number(s.fat_g) || 0),
      carbs_g: Math.max(0, Number(s.carbs_g) || 0),
      why: s.why ? String(s.why) : "",
    }));
    res.status(200).json({
      suggestions,
      advice: parsed.advice ? String(parsed.advice) : "",
      remaining,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown error" });
  }
}
