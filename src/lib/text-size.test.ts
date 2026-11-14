import { describe, expect, test } from "vitest";
import { normalizeTextSize, textSizeProgress } from "./text-size";

describe("global text sizing", () => {
  test("text cannot shrink below 80 percent", () => {
    expect(normalizeTextSize(20)).toBe(80);
  });

  test("text cannot grow above 140 percent", () => {
    expect(normalizeTextSize(200)).toBe(140);
  });

  test("invalid stored values return to the unchanged 100 percent design", () => {
    expect(normalizeTextSize(Number.NaN)).toBe(100);
  });

  test("controls use ten-point increments", () => {
    expect(normalizeTextSize(124)).toBe(120);
    expect(normalizeTextSize(126)).toBe(130);
  });

  test("the progress bar covers the full 80 to 140 percent range", () => {
    expect(textSizeProgress(80)).toBe(0);
    expect(textSizeProgress(110)).toBe(50);
    expect(textSizeProgress(140)).toBe(100);
  });
});
