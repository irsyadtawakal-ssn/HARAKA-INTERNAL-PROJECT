import { describe, it, expect } from "vitest";
import { checkLimit } from "@/lib/rateLimit";

describe("checkLimit", () => {
  it("allows 30 calls per window and refuses the 31st", () => {
    const key = "ip-a";
    for (let i = 0; i < 30; i++) expect(checkLimit(key, 30, 60_000, 1000)).toBe(true);
    expect(checkLimit(key, 30, 60_000, 1000)).toBe(false);
  });
  it("allows again after the window passes", () => {
    const key = "ip-b";
    for (let i = 0; i < 30; i++) checkLimit(key, 30, 60_000, 0);
    expect(checkLimit(key, 30, 60_000, 0)).toBe(false);
    expect(checkLimit(key, 30, 60_000, 60_001)).toBe(true);
  });
});
