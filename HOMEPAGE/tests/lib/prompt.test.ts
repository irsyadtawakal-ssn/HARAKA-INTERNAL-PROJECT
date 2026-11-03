import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "@/lib/prompt";

describe("buildSystemPrompt", () => {
  const p = buildSystemPrompt("PENGETAHUAN-X");
  it("embeds the knowledge", () => expect(p).toContain("PENGETAHUAN-X"));
  it("sets the persona", () => {
    expect(p).toContain("Rara");
    expect(p).toContain("Kak");
  });
  it("forbids inventing numbers", () => expect(p.toLowerCase()).toContain("jangan mengarang angka"));
  it("explains the lead marker", () => expect(p).toContain("[[LEAD]]"));
  it("names the WhatsApp CS", () => expect(p).toContain("0831-3703-0656"));
});
