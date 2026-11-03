import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  applyPronunciationDictionary,
  compileKnowledgeMarkdown,
  compileSystemPrompt,
  DEFAULT_RARA_CONFIG,
  getRaraConfig,
  saveRaraConfig,
  type RaraConfig,
} from "@/lib/raraConfig";
import { completeChat, listModels, type ChatMessage } from "@/lib/llm";
import { synthesize } from "@/lib/tts";
import { heuristicLeadSummary, LEAD_MARKER, stripMarker } from "@/lib/lead";

function listAvailableAvatarFiles(): { name: string; sizeKb: number }[] {
  try {
    const dir = path.join(process.cwd(), "public", "avatar");
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(mp4|webm)$/i.test(f))
      .map((f) => {
        const stat = fs.statSync(path.join(dir, f));
        return { name: f, sizeKb: Math.round(stat.size / 1024) };
      });
  } catch {
    return [];
  }
}

function sanitizeForClient(cfg: RaraConfig) {
  const hasLlmApiKey = Boolean(cfg.llm.apiKey || process.env.LLM_API_KEY);
  const hasElevenlabsApiKey = Boolean(cfg.voice.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY);

  return {
    config: {
      ...cfg,
      llm: {
        ...cfg.llm,
        apiKey: cfg.llm.apiKey ? "***MASKED***" : "",
      },
      voice: {
        ...cfg.voice,
        elevenlabsApiKey: cfg.voice.elevenlabsApiKey ? "***MASKED***" : "",
      },
    },
    meta: {
      hasLlmApiKey,
      hasElevenlabsApiKey,
      availableClips: listAvailableAvatarFiles(),
      compiledKnowledgeMarkdown: compileKnowledgeMarkdown(cfg.knowledge),
      compiledSystemPrompt: compileSystemPrompt(cfg),
    },
  };
}

export async function GET() {
  const cfg = getRaraConfig();
  return NextResponse.json({
    ok: true,
    ...sanitizeForClient(cfg),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Payload tidak valid" }, { status: 400 });
    }

    const action = body.action || "save";

    if (action === "save") {
      const incoming = body.config as RaraConfig;
      if (!incoming) {
        return NextResponse.json({ ok: false, error: "Data config kosong" }, { status: 400 });
      }
      const saved = saveRaraConfig(incoming);
      return NextResponse.json({
        ok: true,
        message: "Seluruh pengaturan Rara berhasil disimpan & disinkronkan ke Rara Live!",
        ...sanitizeForClient(saved),
      });
    }

    if (action === "reset") {
      const fresh = structuredClone(DEFAULT_RARA_CONFIG);
      fresh.updatedAt = new Date().toISOString();
      fresh.knowledge.lastSyncedAt = new Date().toISOString();
      fresh.knowledge.rawMarkdown = compileKnowledgeMarkdown(fresh.knowledge);
      const saved = saveRaraConfig(fresh);
      return NextResponse.json({
        ok: true,
        message: "Pengaturan Rara dikembalikan ke preset resmi harakaerfi.com",
        ...sanitizeForClient(saved),
      });
    }

    if (action === "sync_website") {
      const current = getRaraConfig();
      current.knowledge = {
        ...structuredClone(DEFAULT_RARA_CONFIG.knowledge),
        extraDocs: current.knowledge.extraDocs || [],
        lastSyncedAt: new Date().toISOString(),
      };
      current.knowledge.rawMarkdown = compileKnowledgeMarkdown(current.knowledge);
      const saved = saveRaraConfig(current);
      return NextResponse.json({
        ok: true,
        message: "Product Knowledge berhasil disinkronkan ulang dari data resmi harakaerfi.com",
        ...sanitizeForClient(saved),
      });
    }

    if (action === "test_llm") {
      const current = getRaraConfig();
      const draftLlm = body.llm || current.llm;
      const testPrompt =
        typeof body.prompt === "string" && body.prompt.trim()
          ? body.prompt.trim()
          : "Halo Rara, berapa MOQ maklon skincare di Haraka Erfi dan apakah BPOM diurus?";

      const effectiveKey =
        draftLlm.apiKey === "***MASKED***"
          ? current.llm.apiKey || process.env.LLM_API_KEY || ""
          : draftLlm.apiKey || process.env.LLM_API_KEY || "";

      const start = Date.now();
      const systemPrompt = compileSystemPrompt(current);
      const reply = await completeChat([{ role: "user", content: testPrompt }], systemPrompt, {
        ...draftLlm,
        apiKey: effectiveKey,
      });
      const latencyMs = Date.now() - start;

      return NextResponse.json({
        ok: true,
        mode: effectiveKey ? "live_api" : "local_knowledge_engine",
        modelUsed: effectiveKey ? draftLlm.model : "Built-in Haraka Knowledge Engine (API Key belum diisi)",
        latencyMs,
        reply: stripMarker(reply),
        leadTriggered: reply.includes(LEAD_MARKER),
      });
    }

    if (action === "list_models") {
      const current = getRaraConfig();
      const draftLlm = body.llm || current.llm;
      const effectiveKey =
        draftLlm.apiKey === "***MASKED***"
          ? current.llm.apiKey || process.env.LLM_API_KEY || ""
          : draftLlm.apiKey || process.env.LLM_API_KEY || "";
      const models = await listModels({ ...draftLlm, apiKey: effectiveKey });
      return NextResponse.json({ ok: true, models });
    }

    if (action === "test_tts") {
      const current = getRaraConfig();
      const draftVoice = body.voice || current.voice;
      const rawText =
        typeof body.text === "string" && body.text.trim()
          ? body.text.trim()
          : draftVoice.sampleTestText || current.voice.sampleTestText;

      const rules = draftVoice.pronunciationDictionary || current.voice.pronunciationDictionary || [];
      const phoneticText = applyPronunciationDictionary(rawText, rules);

      const effectiveKey =
        draftVoice.elevenlabsApiKey === "***MASKED***"
          ? current.voice.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || ""
          : draftVoice.elevenlabsApiKey || process.env.ELEVENLABS_API_KEY || "";

      const start = Date.now();
      try {
        const audioBuffer = await synthesize(rawText, {
          ...draftVoice,
          elevenlabsApiKey: effectiveKey,
        });
        const latencyMs = Date.now() - start;
        const base64Audio = Buffer.from(audioBuffer).toString("base64");
        return NextResponse.json({
          ok: true,
          engine: "elevenlabs",
          latencyMs,
          phoneticText,
          audioDataUrl: `data:audio/mpeg;base64,${base64Audio}`,
        });
      } catch (err: unknown) {
        const latencyMs = Date.now() - start;
        const msg = err instanceof Error ? err.message : "ElevenLabs belum dikonfigurasi, menggunakan Web Speech API lokal";
        return NextResponse.json({
          ok: true,
          engine: "browser_fallback",
          reason: msg,
          latencyMs,
          phoneticText,
          speakingSpeed: draftVoice.speakingSpeed || 1.05,
        });
      }
    }

    if (action === "simulate_chat") {
      const current = getRaraConfig();
      const draftConfig: RaraConfig = body.config
        ? {
            ...current,
            ...body.config,
            llm: {
              ...current.llm,
              ...(body.config.llm || {}),
              apiKey:
                body.config.llm?.apiKey === "***MASKED***"
                  ? current.llm.apiKey
                  : body.config.llm?.apiKey ?? current.llm.apiKey,
            },
            voice: {
              ...current.voice,
              ...(body.config.voice || {}),
              elevenlabsApiKey:
                body.config.voice?.elevenlabsApiKey === "***MASKED***"
                  ? current.voice.elevenlabsApiKey
                  : body.config.voice?.elevenlabsApiKey ?? current.voice.elevenlabsApiKey,
            },
          }
        : current;

      const messages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
      const compiledPrompt = compileSystemPrompt(draftConfig);
      const start = Date.now();
      const rawReply = await completeChat(messages, compiledPrompt, draftConfig.llm);
      const llmLatencyMs = Date.now() - start;
      const cleanReply = stripMarker(rawReply);
      const leadTriggered = rawReply.includes(LEAD_MARKER);
      const phoneticText = applyPronunciationDictionary(
        cleanReply,
        draftConfig.voice.pronunciationDictionary || []
      );

      const fullHistory: ChatMessage[] = [...messages, { role: "assistant", content: cleanReply }];
      const extractedSummary = heuristicLeadSummary(fullHistory);

      return NextResponse.json({
        ok: true,
        reply: rawReply,
        cleanReply,
        phoneticText,
        llmLatencyMs,
        leadTriggered,
        extractedSummary,
        compiledSystemPrompt: compiledPrompt,
      });
    }

    if (action === "upload_clip") {
      const fileName = String(body.fileName || "")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .toLowerCase();
      const base64Data = String(body.base64Data || "");
      const targetState = body.state as "idle" | "listening" | "thinking" | "speaking" | undefined;

      if (!fileName.endsWith(".mp4") && !fileName.endsWith(".webm")) {
        return NextResponse.json({ ok: false, error: "Format file harus .mp4 atau .webm" }, { status: 400 });
      }
      const commaIdx = base64Data.indexOf(",");
      const rawBase64 = commaIdx !== -1 ? base64Data.slice(commaIdx + 1) : base64Data;
      const buffer = Buffer.from(rawBase64, "base64");
      if (buffer.length > 15 * 1024 * 1024) {
        return NextResponse.json({ ok: false, error: "Ukuran klip maksimal 15 MB" }, { status: 400 });
      }

      const avatarDir = path.join(process.cwd(), "public", "avatar");
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      fs.writeFileSync(path.join(avatarDir, fileName), buffer);

      const current = getRaraConfig();
      if (targetState && current.visual.clips[targetState]) {
        if (!current.visual.clips[targetState].includes(fileName)) {
          current.visual.clips[targetState].push(fileName);
        }
      }
      const saved = saveRaraConfig(current);
      return NextResponse.json({
        ok: true,
        fileName,
        message: `Klip ${fileName} berhasil diunggah${targetState ? ` ke state ${targetState.toUpperCase()}` : ""}`,
        ...sanitizeForClient(saved),
      });
    }

    return NextResponse.json({ ok: false, error: "Action tidak dikenali" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
