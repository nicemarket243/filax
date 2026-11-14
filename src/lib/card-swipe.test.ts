import { describe, expect, it } from "vitest";
import { swipeAxis, swipeDirection } from "./card-swipe";

describe("card swipe intent", () => {
  it("ignores short movements and slow diagonal gestures", () => {
    expect(swipeDirection(-24, -1.2, 353)).toBe(0);
    expect(swipeDirection(-50, -0.2, 353)).toBe(0);
    expect(swipeAxis(-11, -10)).toBe("pending");
  });

  it("requires a clear horizontal intention and preserves vertical scrolling", () => {
    expect(swipeAxis(-16, -4)).toBe("horizontal");
    expect(swipeAxis(-8, -18)).toBe("vertical");
    expect(swipeAxis(-12, -11)).toBe("pending");
  });

  it("changes only one account after a deliberate drag or committed flick", () => {
    expect(swipeDirection(-90, -0.3, 353)).toBe(-1);
    expect(swipeDirection(48, 0.8, 353)).toBe(1);
    expect(swipeDirection(-48, 0.8, 353)).toBe(0);
  });
});
