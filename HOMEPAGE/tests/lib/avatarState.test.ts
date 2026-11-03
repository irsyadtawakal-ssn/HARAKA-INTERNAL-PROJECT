import { describe, it, expect } from "vitest";
import { avatarReducer, type AvatarState, type AvatarEvent } from "@/lib/avatarState";

describe("avatarReducer", () => {
  const cases: [AvatarState, AvatarEvent, AvatarState][] = [
    ["idle", "MIC_ON", "listening"],
    ["idle", "TYPING", "listening"],
    ["listening", "SUBMIT", "thinking"],
    ["idle", "SUBMIT", "thinking"],
    ["listening", "MIC_OFF", "idle"],
    ["thinking", "MIC_OFF", "thinking"],
    ["thinking", "AUDIO_START", "speaking"],
    ["speaking", "AUDIO_END", "idle"],
    ["thinking", "TEXT_ONLY", "speaking"],
  ];
  it.each(cases)("%s --%s→ %s", (from, ev, to) => {
    expect(avatarReducer(from, ev)).toBe(to);
  });

  it("CANCEL returns to idle from any state", () => {
    for (const s of ["idle", "listening", "thinking", "speaking"] as AvatarState[]) {
      expect(avatarReducer(s, "CANCEL")).toBe("idle");
    }
  });

  it("unknown pairs keep the same state", () => {
    expect(avatarReducer("speaking", "MIC_ON")).toBe("speaking");
    expect(avatarReducer("idle", "AUDIO_END")).toBe("idle");
  });
});
