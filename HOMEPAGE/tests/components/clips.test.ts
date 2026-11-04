import { describe, it, expect } from "vitest";
import { parseManifest, pickClip } from "@/components/avatar/clips";

describe("parseManifest", () => {
  it("round-trips a valid clips manifest", () => {
    const m = { mode: "clips", clips: { idle: ["a.mp4"], listening: ["b.mp4"], thinking: ["c.mp4"], speaking: ["d.mp4", "e.mp4"] } };
    expect(parseManifest(m)).toEqual(m);
  });
  it("keeps the optional greeting clip", () => {
    const clips = { idle: ["a.mp4"], listening: ["b.mp4"], thinking: ["c.mp4"], speaking: ["d.mp4"] };
    expect(parseManifest({ mode: "clips", clips, greeting: "greeting-1.mp4" })).toEqual({ mode: "clips", clips, greeting: "greeting-1.mp4" });
    expect(parseManifest({ mode: "clips", clips, greeting: 5 })).toEqual({ mode: "clips", clips });
  });
  it("falls back to placeholder when clips are missing", () => {
    expect(parseManifest({ mode: "clips" })).toEqual({ mode: "placeholder" });
    expect(parseManifest(null)).toEqual({ mode: "placeholder" });
  });
});

describe("pickClip", () => {
  it("never repeats the previous clip when there is a choice", () => {
    expect(pickClip(["a", "b", "c"], "a", () => 0)).not.toBe("a");
  });
  it("returns the only clip when the list has one", () => {
    expect(pickClip(["a"], "a")).toBe("a");
  });
});
