import { render, fireEvent, waitFor } from "@testing-library/react";
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

  it("plays the greeting clip on top with sound, then hands back to the loop", () => {
    const ref = { current: null as { play(): boolean } | null };
    let ended = 0;
    const { rerender } = render(
      <ClipAvatar state="idle" clips={clips} greeting="greeting-1.mp4" greetingRef={ref} onGreetingEnd={() => ended++} />,
    );
    const greet = videos().find((v) => v.getAttribute("src") === "/avatar/greeting-1.mp4")!;
    expect(ref.current?.play()).toBe(false); // not buffered yet: caller falls back to TTS
    Object.defineProperty(greet, "readyState", { value: 4, configurable: true });
    expect(ref.current?.play()).toBe(true);
    expect(greet.muted).toBe(false);
    rerender(<ClipAvatar state="speaking" clips={clips} greeting="greeting-1.mp4" greetingRef={ref} onGreetingEnd={() => ended++} />);
    expect(greet.style.opacity).toBe("1");
    fireEvent(greet, new Event("ended"));
    expect(ended).toBe(1);
    expect(greet.style.opacity).toBe("0");
  });

  it("cuts the greeting short when the visitor asks something", () => {
    const ref = { current: null as { play(): boolean } | null };
    let ended = 0;
    const props = { clips, greeting: "greeting-1.mp4", greetingRef: ref, onGreetingEnd: () => ended++ };
    const { rerender } = render(<ClipAvatar state="idle" {...props} />);
    const greet = videos().find((v) => v.getAttribute("src") === "/avatar/greeting-1.mp4")!;
    Object.defineProperty(greet, "readyState", { value: 4, configurable: true });
    ref.current?.play();
    rerender(<ClipAvatar state="speaking" {...props} />);
    rerender(<ClipAvatar state="thinking" {...props} />);
    expect(greet.style.opacity).toBe("0");
    expect(ended).toBe(0);
  });

  it("greets muted when the browser refuses sound before a tap, then reports it", async () => {
    const ref = { current: null as { play(): boolean } | null };
    const modes: string[] = [];
    render(<ClipAvatar state="idle" clips={clips} greeting="greeting-1.mp4" greetingRef={ref} onGreetingPlayback={(m) => modes.push(m)} />);
    const greet = videos().find((v) => v.getAttribute("src") === "/avatar/greeting-1.mp4")!;
    Object.defineProperty(greet, "readyState", { value: 4, configurable: true });
    let calls = 0;
    greet.play = () => (++calls === 1 ? Promise.reject(Object.assign(new Error("no"), { name: "NotAllowedError" })) : Promise.resolve());
    expect(ref.current?.play()).toBe(true);
    await waitFor(() => expect(modes).toEqual(["muted"]));
    expect(greet.muted).toBe(true);
    expect(greet.style.opacity).toBe("1");
  });
});
