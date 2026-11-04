import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const recognizer = { start: vi.fn(), stop: vi.fn() };
let recognizerAvailable = true;
let recognizerOpts: { onResult(t: string): void; onEnd(): void; onError(c: string): void } | null = null;
vi.mock("@/lib/speech", () => ({
  createRecognizer: vi.fn((opts) => { recognizerOpts = opts; return recognizerAvailable ? recognizer : null; }),
}));

import { useConversation, GREETING } from "@/lib/controller";

class FakeAudio {
  static last: FakeAudio;
  static created = 0;
  static plays: string[] = [];
  onplay: (() => void) | null = null;
  onended: (() => void) | null = null;
  constructor(public src = "") { FakeAudio.last = this; FakeAudio.created++; }
  play() { FakeAudio.plays.push(this.src); this.onplay?.(); return Promise.resolve(); }
  pause() {}
}

let ttsGate: Promise<void> | null = null;
let chatBody: (() => BodyInit) | null = null;
let ttsCount = 0;

let chatReply = "Halo Kak, MOQ kami fleksibel.";
let chatStatus = 200;
let ttsStatus = 200;
const fetchMock = vi.fn(async (url: string) => {
  if (url === "/api/chat") {
    if (chatStatus !== 200) return new Response(JSON.stringify({ error: "Sesi demo ini sudah mencapai batas." }), { status: chatStatus });
    return new Response(chatBody ? chatBody() : chatReply);
  }
  if (url === "/api/tts") {
    const n = ++ttsCount;
    if (n === 1 && ttsGate) await ttsGate;
    if (ttsStatus !== 200) return new Response(JSON.stringify({ error: "tts_unavailable" }), { status: ttsStatus });
    return new Response(new Uint8Array([1]), { headers: { "content-type": "audio/mpeg" } });
  }
  return new Response("{}");
});

beforeEach(() => {
  chatReply = "Halo Kak, MOQ kami fleksibel.";
  chatStatus = 200;
  ttsStatus = 200;
  recognizerAvailable = true;
  ttsGate = null;
  chatBody = null;
  ttsCount = 0;
  FakeAudio.created = 0;
  FakeAudio.plays = [];
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("Audio", FakeAudio);
  let blob = 0;
  URL.createObjectURL = vi.fn(() => "blob:" + ++blob);
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.useRealTimers());

const ttsCalls = () => fetchMock.mock.calls.filter((c) => c[0] === "/api/tts");

describe("useConversation", () => {
  it("starts idle with the greeting and does not speak before a user gesture", () => {
    const { result } = renderHook(() => useConversation());
    expect(result.current.state).toBe("idle");
    expect(result.current.line).toBe(GREETING);
    expect(GREETING).toBe("Halo Kak, aku Mira. Ceritakan produk impianmu.");
    expect(ttsCalls()).toHaveLength(0);
  });

  it("thinks, streams the reply, speaks it once, then returns to idle", async () => {
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    const states: string[] = [];
    await act(async () => {
      const p = result.current.send("berapa moq?");
      states.push(result.current.state);
      await p;
    });
    expect(result.current.line).toBe("Halo Kak, MOQ kami fleksibel.");
    expect(ttsCalls()).toHaveLength(1);
    expect(result.current.state).toBe("speaking");
    act(() => FakeAudio.last.onended!());
    expect(result.current.state).toBe("idle");
  });

  it("keeps every turn in the chat thread and survives a remount", async () => {
    const { result, unmount } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("berapa moq?"); });
    await act(async () => { await result.current.send("bisa parfum?"); });
    const texts = result.current.thread.map((m) => `${m.role}:${m.content}`);
    expect(texts).toEqual([
      `assistant:${GREETING}`,
      "user:berapa moq?", "assistant:Halo Kak, MOQ kami fleksibel.",
      "user:bisa parfum?", "assistant:Halo Kak, MOQ kami fleksibel.",
    ]);
    expect(result.current.streaming).toBeNull();
    unmount();
    const again = renderHook(() => useConversation());
    expect(again.result.current.thread).toHaveLength(5);
    expect(again.result.current.messages).toHaveLength(4);
    act(() => again.result.current.reset());
    expect(again.result.current.thread.map((m) => m.content)).toEqual([GREETING]);
  });

  it("falls back to text when TTS is unavailable", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    ttsStatus = 503;
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    await act(async () => { await result.current.send("halo"); });
    expect(result.current.line).toBe("Halo Kak, MOQ kami fleksibel.");
    expect(result.current.state).toBe("speaking");
    await act(async () => { vi.advanceTimersByTime(Math.min(6000, 60 * chatReply.length)); });
    expect(result.current.state).toBe("idle");
  });

  it("shows the WhatsApp button when the reply carries the marker, without showing or speaking the marker", async () => {
    chatReply = "Yuk lanjut chat tim kami lewat tombol WhatsApp di bawah, Kak.\n[[LEAD]]";
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    await act(async () => { await result.current.send("harganya berapa?"); });
    expect(result.current.showWhatsApp).toBe(true);
    expect(result.current.line).not.toContain("[[LEAD]]");
    const ttsBody = JSON.parse(ttsCalls()[0][1].body);
    expect(ttsBody.text).not.toContain("[[LEAD]]");
  });

  it("keeps the WhatsApp button after it is opened and marks the lead logged", async () => {
    chatReply = "Langsung chat tim kami ya, Kak.\n[[LEAD]]";
    const { result } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("harga?"); });
    act(() => result.current.whatsappOpened());
    expect(result.current.showWhatsApp).toBe(true);
    expect(result.current.leadDone).toBe(true);
  });

  it("reports no mic support when speech recognition is missing", async () => {
    recognizerAvailable = false;
    const { result } = renderHook(() => useConversation());
    await waitFor(() => expect(result.current.micSupported).toBe(false));
  });

  it("shows the limit error when chat returns 429", async () => {
    chatStatus = 429;
    const { result } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("halo"); });
    expect(result.current.line).toBe("Sesi demo ini sudah mencapai batas.");
    expect(result.current.state).toBe("idle");
    expect(result.current.showWhatsApp).toBe(true);
  });

  it("stays silent and remembers it when the visitor mutes Rara", async () => {
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    act(() => result.current.toggleVoice());
    expect(result.current.voiceOn).toBe(false);
    await act(async () => { await result.current.send("berapa moq?"); });
    expect(ttsCalls()).toHaveLength(0);
    expect(localStorage.getItem("rara-voice")).toBe("off");
    localStorage.clear();
  });

  it("shows a network error and returns to idle when the stream breaks", async () => {
    chatBody = () => new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode("Halo")); c.error(new Error("drop")); } });
    const { result } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("halo"); });
    expect(result.current.line).toBe("Maaf Kak, koneksinya terputus. Coba kirim lagi ya.");
    expect(result.current.state).toBe("idle");
  });

  it("shows a network error when the reply is empty", async () => {
    chatReply = "";
    const { result } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("halo"); });
    expect(result.current.line).toBe("Maaf Kak, koneksinya terputus. Coba kirim lagi ya.");
    expect(result.current.state).toBe("idle");
  });

  it("drops the previous turn's audio when the visitor sends again", async () => {
    let open!: () => void;
    ttsGate = new Promise((r) => { open = r; });
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    let first!: Promise<void>;
    await act(async () => {
      first = result.current.send("satu");
      await vi.waitFor(() => expect(ttsCount).toBe(1));
    });
    await act(async () => { await result.current.send("dua"); });
    await act(async () => { open(); await first; });
    expect(FakeAudio.plays).toHaveLength(1);
    expect(result.current.messages.filter((m) => m.role === "user").map((m) => m.content)).toEqual(["satu", "dua"]);
  });

  it("reuses one audio element across replies", async () => {
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    await act(async () => { await result.current.send("satu"); });
    act(() => FakeAudio.last.onended!());
    await act(async () => { await result.current.send("dua"); });
    expect(FakeAudio.created).toBe(1);
    expect(FakeAudio.plays).toHaveLength(2);
  });

  it("tracks whether the mic is really on", async () => {
    const { result } = renderHook(() => useConversation());
    await waitFor(() => expect(result.current.micSupported).toBe(true));
    act(() => result.current.startMic());
    expect(result.current.micActive).toBe(true);
    act(() => recognizerOpts!.onEnd());
    expect(result.current.micActive).toBe(false);
    expect(result.current.state).toBe("idle");
  });

  it("returns to idle when the visitor clears what they were typing", () => {
    const { result } = renderHook(() => useConversation());
    act(() => result.current.typing(true));
    expect(result.current.state).toBe("listening");
    act(() => result.current.typing(false));
    expect(result.current.state).toBe("idle");
  });
});
