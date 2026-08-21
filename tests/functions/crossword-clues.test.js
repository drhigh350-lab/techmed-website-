import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onRequestPost } from "../../functions/api/crossword-clues.js";

function makeContext({ body, env = { GEMINI_API_KEY: "test-key" } }) {
  const request =
    body === undefined
      ? new Request("https://example.com/api/crossword-clues", { method: "POST" })
      : typeof body === "string"
        ? new Request("https://example.com/api/crossword-clues", { method: "POST", body })
        : new Request("https://example.com/api/crossword-clues", {
            method: "POST",
            body: JSON.stringify(body),
          });
  return { request, env };
}

function geminiTextResponse(text, finishReason = "STOP") {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] }, finishReason }],
    }),
  };
}

describe("POST /api/crossword-clues", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an invalid JSON body", async () => {
    const res = await onRequestPost(makeContext({ body: "{not json" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/invalid json/i);
  });

  it("requires subject and topic", async () => {
    const res = await onRequestPost(makeContext({ body: { subject: "", topic: "" } }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/subject and topic/i);
  });

  it("returns 500 when GEMINI_API_KEY is not configured", async () => {
    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Cell structure" }, env: {} }),
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/GEMINI_API_KEY/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns 502 when the Gemini API can't be reached", async () => {
    fetch.mockRejectedValueOnce(new Error("network down"));
    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Cell structure" } }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/Could not reach Gemini/);
  });

  it("returns 502 when Gemini responds with a non-OK status", async () => {
    fetch.mockResolvedValueOnce({ ok: false, text: async () => "quota exceeded" });
    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Cell structure" } }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toBe("Gemini API error");
    expect(json.detail).toBe("quota exceeded");
  });

  it("returns 502 when Gemini's response body isn't valid JSON", async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error("bad body");
      },
    });
    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Cell structure" } }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/invalid JSON/);
  });

  it("returns 502 when there is no text content in the Gemini response", async () => {
    fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ candidates: [] }) });
    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Cell structure" } }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/No text content/);
  });

  it("parses, sanitizes, uppercases, and dedupes a clean Gemini response", async () => {
    const words = [
      { answer: "mitosis", clue: "Process of cell division" },
      { answer: "MITOSIS", clue: "Duplicate of the above, different case" }, // dupe after normalizing
      { answer: "dna", clue: "Genetic material" },
      { answer: "gene-splice", clue: "Should have the hyphen stripped" },
      { answer: "ab", clue: "Too short, dropped (2 letters)" },
      { answer: "thisanswerhasfarmorethantwelveletters", clue: "Too long, dropped" },
      { answer: "enzyme", clue: "" }, // empty clue is falsy, so dropped
      { answer: "ribosome", clue: "Protein synthesis site" },
      { answer: "nucleus", clue: "Control center of the cell" },
      { answer: "cytoplasm", clue: "Gel-like substance filling the cell" },
    ];
    fetch.mockResolvedValueOnce(geminiTextResponse(JSON.stringify(words)));

    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Cell structure" } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();

    const answers = json.words.map((w) => w.answer);
    expect(answers).toEqual(["MITOSIS", "DNA", "GENESPLICE", "RIBOSOME", "NUCLEUS", "CYTOPLASM"]);
    expect(json.words.every((w) => /^[A-Z]+$/.test(w.answer))).toBe(true);
  });

  it("strips ```json code fences before parsing", async () => {
    const clean = JSON.stringify([
      { answer: "gene", clue: "Unit of heredity" },
      { answer: "allele", clue: "Alternative form of a gene" },
      { answer: "genome", clue: "Complete set of genes" },
      { answer: "genotype", clue: "Genetic makeup" },
      { answer: "phenotype", clue: "Observable traits" },
    ]);
    fetch.mockResolvedValueOnce(geminiTextResponse("```json\n" + clean + "\n```"));

    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Genetics" } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.words).toHaveLength(5);
  });

  it("salvages a truncated (MAX_TOKENS) response via repairTruncatedArray", async () => {
    const complete = [
      { answer: "gene", clue: "Unit of heredity" },
      { answer: "allele", clue: "Alternative form of a gene" },
      { answer: "genome", clue: "Complete set of genes" },
      { answer: "genotype", clue: "Genetic makeup" },
      { answer: "phenotype", clue: "Observable traits" },
      { answer: "mutation", clue: "Observable trai" }, // cut off mid-string, whole object incomplete
    ];
    const fullJson = JSON.stringify(complete);
    // Cut the string off partway through the final (6th) object so the
    // overall array is invalid JSON, but the first 5 objects are intact.
    const cutIndex = fullJson.lastIndexOf('{"answer":"mutation"');
    const truncated = fullJson.slice(0, cutIndex);
    fetch.mockResolvedValueOnce(geminiTextResponse(truncated, "MAX_TOKENS"));

    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Genetics" } }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.words.map((w) => w.answer)).toEqual([
      "GENE",
      "ALLELE",
      "GENOME",
      "GENOTYPE",
      "PHENOTYPE",
    ]);
  });

  it("returns 502 when fewer than 5 usable clues survive sanitization", async () => {
    const words = [
      { answer: "gene", clue: "Unit of heredity" },
      { answer: "allele", clue: "Alternative form of a gene" },
    ];
    fetch.mockResolvedValueOnce(geminiTextResponse(JSON.stringify(words)));

    const res = await onRequestPost(
      makeContext({ body: { subject: "Biology", topic: "Genetics" } }),
    );
    expect(res.status).toBe(502);
    const json = await res.json();
    expect(json.error).toMatch(/too few usable clues/i);
    expect(json.count).toBe(2);
  });

  it("sends the subject and topic through to the Gemini prompt, and truncates oversized input", async () => {
    fetch.mockImplementationOnce((_url, opts) => {
      const parsedBody = JSON.parse(opts.body);
      const prompt = parsedBody.contents[0].parts[0].text;
      expect(prompt).toContain("subject: Chemistry");
      expect(prompt).toContain('topic: "Acids and bases"');
      return Promise.resolve(
        geminiTextResponse(
          JSON.stringify([
            { answer: "acid", clue: "Donates protons" },
            { answer: "base", clue: "Accepts protons" },
            { answer: "phscale", clue: "Measure of acidity" },
            { answer: "salt", clue: "Product of neutralization" },
            { answer: "buffer", clue: "Resists pH change" },
          ]),
        ),
      );
    });

    const res = await onRequestPost(
      makeContext({ body: { subject: "Chemistry", topic: "Acids and bases" } }),
    );
    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toContain("generativelanguage.googleapis.com");
    expect(opts.headers["x-goog-api-key"]).toBe("test-key");
  });
});
