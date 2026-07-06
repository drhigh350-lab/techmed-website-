// functions/api/crossword-clues.js
//
// Cloudflare Pages Function — proxies Crossworld's clue-generation requests to the
// Google Gemini API. This exists ONLY so the real API key never has to sit in browser
// code. The browser calls /api/crossword-clues; this function calls Gemini using
// a secret key that lives in Cloudflare, then hands back just the clue/answer JSON.
//
// SETUP (one-time):
//   1. Get a free API key (no credit card needed): go to https://aistudio.google.com,
//      sign in with a Google account, click "Get API key" -> "Create API key".
//   2. IMPORTANT — restrict the key: in Google Cloud Console (console.cloud.google.com)
//      -> APIs & Services -> Credentials -> click your key -> under "API restrictions"
//      choose "Restrict key" -> select "Generative Language API" only -> Save.
//      Google now blocks unrestricted keys, so this step is required, not optional.
//   3. In Cloudflare dashboard: Workers & Pages -> your Pages project -> Settings ->
//      Environment variables -> add a variable named  GEMINI_API_KEY , type "Secret",
//      value = the key from step 1. Do this for both Production and Preview.
//   4. Deploy (or redeploy) — Cloudflare Pages auto-detects any file under /functions
//      and turns it into a route, so no extra config is needed beyond the secret.
//
// After that, this file is live at:  https://techmedng.com/api/crossword-clues
// Free tier: Gemini 2.5 Flash gives a generous daily request allowance at no cost —
// more than enough for a bonus game like this. No card is ever required for this path.

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const subject = String(body.subject || "").slice(0, 100);
  const topic = String(body.topic || "").slice(0, 200);
  if (!subject || !topic) {
    return jsonResponse({ error: "subject and topic are required" }, 400);
  }

  if (!env.GEMINI_API_KEY) {
    return jsonResponse({ error: "Server is missing GEMINI_API_KEY. Add it in Cloudflare Pages > Settings > Environment variables." }, 500);
  }

  const prompt = `You are writing a crossword puzzle for Nigerian university admissions exam prep (JAMB/Post-UTME level), subject: ${subject}, topic: "${topic}".

Generate exactly 13 crossword entries as a JSON array. Each item must have:
- "answer": a single exam term, UPPERCASE, letters only (A-Z, no spaces, no hyphens, no numbers), between 3 and 12 letters, that a Post-UTME candidate studying "${topic}" would recognize.
- "clue": a short, exam-appropriate definition or description of that term (max 15 words), written like a real crossword clue — do not include the answer word in the clue.

Ensure variety in word length (mix of short and long words so they can interlock in a grid) and avoid duplicate or near-duplicate answers. Respond with ONLY the JSON array, no markdown, no preamble, no code fences.`;

  let geminiRes;
  try {
    geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.9,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
  } catch (e) {
    return jsonResponse({ error: "Could not reach Gemini API" }, 502);
  }

  if (!geminiRes.ok) {
    const errText = await geminiRes.text().catch(() => "");
    return jsonResponse({ error: "Gemini API error", detail: errText }, 502);
  }

  let data;
  try {
    data = await geminiRes.json();
  } catch (e) {
    return jsonResponse({ error: "Gemini API returned invalid JSON" }, 502);
  }

  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    return jsonResponse({ error: "No text content in Gemini response", detail: JSON.stringify(data).slice(0, 500) }, 502);
  }
  const truncated = candidate?.finishReason === "MAX_TOKENS";

  let clean = text
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch (e) {
    // The model got cut off mid-array (usually finishReason === MAX_TOKENS).
    // Salvage whichever complete { ... } objects exist before the cutoff instead
    // of failing the whole request over one incomplete trailing entry.
    const repaired = repairTruncatedArray(clean);
    if (repaired) {
      parsed = repaired;
    } else {
      return jsonResponse({
        error: "Could not parse clue JSON from model output",
        truncated,
        detail: clean.slice(-300),
      }, 502);
    }
  }

  // Sanitize server-side too (defense in depth — browser also sanitizes on receipt)
  const seen = new Set();
  const words = [];
  for (const item of Array.isArray(parsed) ? parsed : []) {
    if (!item || !item.answer || !item.clue) continue;
    const ans = String(item.answer).toUpperCase().replace(/[^A-Z]/g, "");
    if (ans.length < 3 || ans.length > 12) continue;
    if (seen.has(ans)) continue;
    seen.add(ans);
    words.push({ answer: ans, clue: String(item.clue).trim() });
  }

  if (words.length < 5) {
    return jsonResponse({
      error: "Gemini returned too few usable clues (response may have been truncated)",
      truncated,
      count: words.length,
    }, 502);
  }

  return jsonResponse({ words });
}

// Salvages a usable array from a JSON string that got cut off mid-object/mid-array
// (e.g. by a token limit). Strategy: find the last "}" that closes a complete
// top-level object, truncate there, close the array, and try parsing again.
function repairTruncatedArray(str) {
  const start = str.indexOf("[");
  if (start === -1) return null;
  const lastBrace = str.lastIndexOf("}");
  if (lastBrace === -1 || lastBrace < start) return null;
  const candidate = str.slice(start, lastBrace + 1) + "]";
  try {
    const arr = JSON.parse(candidate);
    return Array.isArray(arr) ? arr : null;
  } catch (e) {
    return null;
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
