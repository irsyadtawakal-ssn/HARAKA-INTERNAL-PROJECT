import { describe, it, expect, vi, afterEach } from "vitest";
import { createRecognizer } from "@/lib/speech";

class FakeRecognition {
  static last: FakeRecognition;
  lang = "";
  interimResults = true;
  continuous = true;
  onresult: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  constructor() { FakeRecognition.last = this; }
}

const handlers = () => ({ lang: "id-ID" as const, onResult: vi.fn(), onEnd: vi.fn(), onError: vi.fn() });

afterEach(() => {
  delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
});

describe("createRecognizer", () => {
  it("returns null when the browser has no speech API", () => {
    expect(createRecognizer(handlers())).toBeNull();
  });

  it("starts recognition in Indonesian", () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    const r = createRecognizer(handlers())!;
    r.start();
    expect(FakeRecognition.last.start).toHaveBeenCalled();
    expect(FakeRecognition.last.lang).toBe("id-ID");
  });

  it("reports a final transcript", () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    const h = handlers();
    createRecognizer(h)!.start();
    FakeRecognition.last.onresult!({ resultIndex: 0, results: [Object.assign([{ transcript: "berapa moq" }], { isFinal: true })] });
    expect(h.onResult).toHaveBeenCalledWith("berapa moq");
  });

  it("reports a permission error", () => {
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = FakeRecognition;
    const h = handlers();
    createRecognizer(h)!.start();
    FakeRecognition.last.onerror!({ error: "not-allowed" });
    expect(h.onError).toHaveBeenCalledWith("not-allowed");
  });
});
