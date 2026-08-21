import { beforeAll, describe, expect, it } from "vitest";
import { loadEngine } from "../setup/load-engine.js";

// These exercise the core of the admission predictor (js/engine.js) — the
// site's main product. The functions under test are pure (given data tables
// baked into the file itself), but the file as a whole is not currently
// structured as a testable module: it's a browser <script> that mutates
// `window` and wires up the page on DOMContentLoaded. See load-engine.js for
// how these tests get at the pure functions without triggering that DOM
// wiring, and TEST_COVERAGE_ANALYSIS.md for the refactor this motivates.
let win;

beforeAll(async () => {
  win = await loadEngine();
});

describe("olevelScore", () => {
  it("sums the top N grades for the given formula type", () => {
    // UNILAG mapping: A1=4.0, B2=3.6, B3=3.2, C4=2.8, C6=2.0
    const result = win.olevelScore(["C4", "A1", "B3", "B2", "C6"], "unilag", 5);
    expect(result.count).toBe(5);
    expect(result.score).toBeCloseTo(4.0 + 3.6 + 3.2 + 2.8 + 2.0, 5);
  });

  it("caps at maxSubjects, keeping the best-scoring grades even if more are supplied", () => {
    const result = win.olevelScore(["C6", "C6", "A1", "A1", "A1", "B2"], "unilag", 5);
    // 6 grades supplied; only the best 5 count — one C6 gets dropped.
    expect(result.count).toBe(5);
    expect(result.score).toBeCloseTo(4.0 * 3 + 3.6 + 2.0, 5);
  });

  it("ignores blank/unmapped grade slots instead of scoring them as zero", () => {
    const result = win.olevelScore(["A1", "", null, undefined, "B2"], "unilag", 5);
    expect(result.count).toBe(2);
    expect(result.score).toBeCloseTo(4.0 + 3.6, 5);
  });
});

describe("hasFailingGrade / hasF9", () => {
  it("flags D7, E8, or F9 as a failing grade", () => {
    expect(win.hasFailingGrade(["A1", "B2", "D7"])).toBe(true);
    expect(win.hasFailingGrade(["A1", "B2", "E8"])).toBe(true);
    expect(win.hasFailingGrade(["A1", "B2", "F9"])).toBe(true);
    expect(win.hasFailingGrade(["A1", "B2", "C6"])).toBe(false);
  });

  it("flags F9 specifically, distinct from other failing grades", () => {
    expect(win.hasF9(["A1", "F9"])).toBe(true);
    expect(win.hasF9(["A1", "D7", "E8"])).toBe(false);
  });
});

describe("getCourseTier", () => {
  it("classifies medicine and surgery as elite", () => {
    expect(win.getCourseTier("Medicine and Surgery")).toBe("elite");
  });

  it("classifies computer science as premium", () => {
    expect(win.getCourseTier("computer science")).toBe("premium");
  });

  it("falls back to accessible for a course not in any tier list", () => {
    expect(win.getCourseTier("underwater basket weaving")).toBe("accessible");
  });
});

describe("getCourseCutoff", () => {
  it("returns the university-specific cutoff when one is defined", () => {
    expect(win.getCourseCutoff("medicine and surgery", "UNILAG")).toBe(85.025);
  });

  it("falls back to the course's base cutoff for a university with no override", () => {
    expect(win.getCourseCutoff("medicine and surgery", "SOME_UNKNOWN_UNI")).toBe(75);
  });

  it("falls back to a default cutoff (55) for an entirely unknown course", () => {
    expect(win.getCourseCutoff("underwater basket weaving", "UNILAG")).toBe(55);
  });
});

describe("calcAggregate", () => {
  it("computes UNILAG's JAMB/8 + PostUTME(/30) + O'Level(/20) formula", () => {
    // O'Level A1,A1,B2,B3,C4 -> 4.0+4.0+3.6+3.2+2.8 = 17.6 (unilag mapping)
    const aggregate = win.calcAggregate(280, 25, ["A1", "A1", "B2", "B3", "C4"], "UNILAG");
    expect(aggregate).toBeCloseTo(280 / 8 + 25 + 17.6, 5);
  });

  it("computes LASU's 50:50 JAMB/8 + O'Level formula (no PostUTME component)", () => {
    // O'Level A1,B2,B3,C4,C5 -> 10+9+8+7+6 = 40 (lasu mapping)
    const aggregate = win.calcAggregate(250, 0, ["A1", "B2", "B3", "C4", "C5"], "LASU");
    expect(aggregate).toBeCloseTo(250 / 8 + 40, 5);
  });
});
