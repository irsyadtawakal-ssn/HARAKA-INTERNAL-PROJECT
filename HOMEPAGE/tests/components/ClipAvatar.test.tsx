import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeAll } from "vitest";
import ClipAvatar from "@/components/avatar/ClipAvatar";

const clips = { idle: ["idle-1.mp4"], listening: ["l.mp4"], thinking: ["t.mp4"], speaking: ["s1.mp4", "s2.mp4"] };

beforeAll(() => {
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () {};
});

const videos = () => [...document.querySelectorAll("video")] as HTMLVideoElement[];
const visible = () => videos().find((v) => v.style.opacity === "1");

describe("ClipAvatar", () => {
  it("keeps the current clip visible until the next one can play", () => {
    const { rerender } = render(<ClipAvatar state="idle" clips={clips} />);
    const first = videos().find((v) => v.getAttribute("src"))!;
    fireEvent(first, new Event("canplay"));
    expect(visible()).toBe(first);
    rerender(<ClipAvatar state="speaking" clips={clips} />);
    expect(visible()).toBe(first);
    const next = videos().find((v) => v !== first)!;
    fireEvent(next, new Event("canplay"));
    expect(visible()).toBe(next);
  });

  it("ignores the end of a hidden clip", () => {
    const { rerender } = render(<ClipAvatar state="speaking" clips={clips} />);
    const a = videos().find((v) => v.getAttribute("src"))!;
    fireEvent(a, new Event("canplay"));
    rerender(<ClipAvatar state="thinking" clips={clips} />);
    const b = videos().find((v) => v !== a)!;
    fireEvent(b, new Event("canplay"));
    rerender(<ClipAvatar state="speaking" clips={clips} />);
    fireEvent(a, new Event("canplay"));
    // a is now front again; b (hidden, the old thinking clip) ending must not trigger a swap
    const before = videos().map((v) => v.getAttribute("src"));
    fireEvent(b, new Event("ended"));
    expect(videos().map((v) => v.getAttribute("src"))).toEqual(before);
  });
});
