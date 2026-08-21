import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enginePath = path.resolve(__dirname, "../../js/engine.js");
const engineSource = readFileSync(enginePath, "utf8");

// js/engine.js is written as a plain <script> (not a module) that expects to
// run in a full page: most of its DOM wiring — event listeners for specific
// element IDs, an IntersectionObserver jsdom doesn't implement — is done
// inside a single `document.addEventListener('DOMContentLoaded', ...)`
// block at the bottom of the file. We want the pure calculation functions
// underneath that (calcAggregate, olevelScore, getCourseTier, ...) without
// triggering any of it.
//
// Trick: let a blank document finish its load lifecycle FIRST — so
// DOMContentLoaded fires and passes with zero listeners attached — and only
// THEN eval the script. Any `addEventListener('DOMContentLoaded', ...)` it
// registers at that point is for an event that has already fired, so it
// never runs. Every top-level `function foo(){}` declaration still lands on
// `window` as it would from a real <script> tag, which is what the tests
// actually need.
export async function loadEngine() {
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
    runScripts: "outside-only",
  });
  await new Promise((resolve) => {
    if (dom.window.document.readyState === "complete") resolve();
    else dom.window.addEventListener("load", resolve);
  });
  dom.window.eval(engineSource);
  return dom.window;
}
