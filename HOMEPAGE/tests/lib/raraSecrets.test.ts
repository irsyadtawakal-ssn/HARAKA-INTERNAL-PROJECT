import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let dir: string;
let cwd: string;

beforeEach(() => {
  cwd = process.cwd();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "rara-"));
  fs.mkdirSync(path.join(dir, "public", "avatar"), { recursive: true });
  process.chdir(dir);
  vi.resetModules();
  vi.stubEnv("LLM_API_KEY", "");
});

afterEach(() => {
  process.chdir(cwd);
  vi.unstubAllEnvs();
  fs.rmSync(dir, { recursive: true, force: true });
});

describe("dashboard API keys", () => {
  it("are saved to rara-secrets.json, never to rara-config.json", async () => {
    const { DEFAULT_RARA_CONFIG, getRaraConfig, saveRaraConfig } = await import("@/lib/raraConfig");
    const cfg = structuredClone(DEFAULT_RARA_CONFIG);
    cfg.llm.apiKey = "sk-router";
    cfg.llm.model = "rara-cs";
    saveRaraConfig(cfg);

    const publicJson = fs.readFileSync(path.join(dir, "data", "rara-config.json"), "utf8");
    expect(publicJson).not.toContain("sk-router");
    expect(JSON.parse(publicJson).llm.model).toBe("rara-cs");
    expect(JSON.parse(fs.readFileSync(path.join(dir, "data", "rara-secrets.json"), "utf8")).llmApiKey).toBe("sk-router");
    expect(getRaraConfig().llm.apiKey).toBe("sk-router");
  });

  it("keeps the stored key when the dashboard sends it back masked", async () => {
    const { DEFAULT_RARA_CONFIG, getRaraConfig, saveRaraConfig } = await import("@/lib/raraConfig");
    const cfg = structuredClone(DEFAULT_RARA_CONFIG);
    cfg.llm.apiKey = "sk-router";
    saveRaraConfig(cfg);

    saveRaraConfig({ ...getRaraConfig(), llm: { ...getRaraConfig().llm, apiKey: "***MASKED***", temperature: 0.3 } });

    expect(getRaraConfig().llm.apiKey).toBe("sk-router");
    expect(getRaraConfig().llm.temperature).toBe(0.3);
  });
});
