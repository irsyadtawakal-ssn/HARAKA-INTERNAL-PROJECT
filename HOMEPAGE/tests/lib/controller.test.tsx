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
    expect(GREETING).toBe("Halo Kak, aku Rara. Ceritakan produk impianmu.");
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

  it("shows the lead form when the reply carries the marker, without showing or speaking the marker", async () => {
    chatReply = "Boleh minta nama dan nomor WhatsApp, Kak?\n[[LEAD]]";
    const { result } = renderHook(() => useConversation());
    act(() => result.current.userGestured());
    await act(async () => { await result.current.send("harganya berapa?"); });
    expect(result.current.showLeadForm).toBe(true);
    expect(result.current.line).not.toContain("[[LEAD]]");
    const ttsBody = JSON.parse(ttsCalls()[0][1].body);
    expect(ttsBody.text).not.toContain("[[LEAD]]");
  });

  it("thanks the visitor by name after the lead is submitted", async () => {
    chatReply = "Boleh minta nomornya, Kak?\n[[LEAD]]";
    const { result } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("harga?"); });
    act(() => result.current.leadSubmitted("Dina"));
    expect(result.current.line).toBe("Terima kasih Kak Dina! Tim kami akan menghubungi lewat WhatsApp.");
    expect(result.current.showLeadForm).toBe(false);
    expect(result.current.leadDone).toBe(true);
  });

  it("pre-fills the phone number the visitor typed in chat", async () => {
    const { result } = renderHook(() => useConversation());
    await act(async () => { await result.current.send("nomorku 0812 3456 7890"); });
    expect(result.current.chatPhone).toBe("081234567890");
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
