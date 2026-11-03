import { describe, it, expect } from "vitest";
import {
  applyPronunciationDictionary,
  compileKnowledgeMarkdown,
  compileSystemPrompt,
  DEFAULT_RARA_CONFIG,
} from "@/lib/raraConfig";
import { buildKnowledgeFallbackReply } from "@/lib/llm";

describe("raraConfig engine & harakaerfi.com knowledge compiler", () => {
  it("compiles structured harakaerfi.com knowledge including MOQ 1.000 pcs, 6 steps, and 18 portfolio brands", () => {
    const md = compileKnowledgeMarkdown(DEFAULT_RARA_CONFIG.knowledge);
    expect(md).toContain("https://harakaerfi.com/");
    expect(md).toContain("PT Haraka Erfi");
    expect(md).toContain("1.000 pcs");
    expect(md).toContain("3 bulan");
    expect(md).toContain("Cloris Men");
    expect(md).toContain("D'Gekira Parfume");
  });

  it("respects the allowMention toggle on commercial rules", () => {
    const clone = structuredClone(DEFAULT_RARA_CONFIG.knowledge);
    const priceItem = clone.commercial.find((c) => c.id === "com-price")!;
    expect(priceItem.allowMention).toBe(false);
    const mdSecret = compileKnowledgeMarkdown(clone);
    expect(mdSecret).toContain("Kisaran Harga Produksi / HPP per Pcs (RAHASIA / ARAHKAN KE SALES)");

    priceItem.allowMention = true;
    priceItem.value = "Mulai Rp 25.000 per pcs";
    const mdAllowed = compileKnowledgeMarkdown(clone);
    expect(mdAllowed).toContain("**Kisaran Harga Produksi / HPP per Pcs (BOLEH DISEBUT):** Mulai Rp 25.000 per pcs");
  });

  it("builds system prompt with persona, BPOM guardrails, and lead qualification rules", () => {
    const prompt = compileSystemPrompt(DEFAULT_RARA_CONFIG);
    expect(prompt).toContain("Rara");
    expect(prompt).toContain("CPKB");
    expect(prompt).toContain("[[LEAD]]");
    expect(prompt).toContain("0831-3703-0656");
  });

  it("transforms acronyms using the pronunciation dictionary", () => {
    const out = applyPronunciationDictionary(
      "Pabrik CPKB kami mengurus BPOM dan HAKI dengan MOQ 1000 pcs.",
      DEFAULT_RARA_CONFIG.voice.pronunciationDictionary
    );
    expect(out).toContain("C P K B");
    expect(out).toContain("Be-Pom");
    expect(out).toContain("Ha-Ki");
    expect(out).toContain("M O Q");
  });

  it("answers accurately from built-in harakaerfi.com knowledge when no LLM key is set", () => {
    const reply = buildKnowledgeFallbackReply([{ role: "user", content: "Berapa MOQ maklon?" }]);
    expect(reply).toContain("1.000 pcs");
  });
});
