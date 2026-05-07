// Client-side wrappers for the Vercel serverless functions in /api/.
// The provider key (OpenAI or Gemini) lives only in Vercel env vars —
// never in the browser.

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `${res.status}`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function analyzeFoodPhoto({ base64, mediaType = "image/jpeg", quantity = "" }) {
  if (!base64) throw new Error("No image provided.");
  return postJSON("/api/analyze-photo", { base64, mediaType, quantity });
}

export async function suggestEatOut({ target, logged, slot, location, notes, eatingWindow }) {
  return postJSON("/api/suggest-eatout", {
    target,
    logged,
    slot,
    location,
    notes,
    eatingWindow,
  });
}

// Unchanged — purely client-side helper to resize an image File before
// sending it to the API. Same signature/output as before.
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
