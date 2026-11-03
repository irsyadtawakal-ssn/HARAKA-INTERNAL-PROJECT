"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Bot,
  Brain,
  Volume2,
  BookOpen,
  ShieldCheck,
  Play,
  Sparkles,
  Check,
  CheckCircle2,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Zap,
} from "lucide-react";
import type { RaraConfig, FaqItem, PronunciationRule, ExtraKnowledgeDoc } from "@/lib/raraConfig";
import styles from "@/app/dashboard/dashboard.module.css";

type SubTabId = "visual" | "llm" | "voice" | "knowledge" | "persona" | "simulator";

type AvailableClip = { name: string; sizeKb: number };

const NINE_ROUTER_BASE_URL = "https://router-okx.akbaralatas.com/v1";

const LLM_LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#5c4b4b",
  marginBottom: 4,
};

const LLM_INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e8e2de",
  fontSize: 12.5,
  fontFamily: "monospace",
};

const VOICE_PRESETS = [
  { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel — Ramah, Hangat & Profesional (Default Rara)" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella — Lembut, Kalem & Konsultatif" },
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte — Tegas, Eksekutif B2B" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda — Ceria, Antusias & Bersahabat" },
];

export default function RaraSettingsTab() {
  const [subTab, setSubTab] = useState<SubTabId>("visual");
  const [config, setConfig] = useState<RaraConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: "ok" | "err" } | null>(null);

  // Meta from server
  const [hasLlmKey, setHasLlmKey] = useState(false);
  const [hasElevenKey, setHasElevenKey] = useState(false);
  const [availableClips, setAvailableClips] = useState<AvailableClip[]>([]);
  const [compiledMarkdown, setCompiledMarkdown] = useState("");
  const [compiledPrompt, setCompiledPrompt] = useState("");

  // Visual Sub-Tab State
  const [activeAvatarState, setActiveAvatarState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [previewVideo, setPreviewVideo] = useState("/avatar/idle-1.mp4");
  const [selectedClipToAdd, setSelectedClipToAdd] = useState<Record<string, string>>({});
  const [uploadingClipState, setUploadingClipState] = useState<string | null>(null);
  const [newChipText, setNewChipText] = useState("");

  // LLM Sub-Tab State
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [llmTestPrompt, setLlmTestPrompt] = useState(
    "Halo Rara, saya mau buat produk sunscreen serum untuk brand baru. Berapa MOQ dan estimasi waktunya?"
  );
  const [llmTesting, setLlmTesting] = useState(false);
  const [llmModels, setLlmModels] = useState<string[]>([]);
  const [llmModelsLoading, setLlmModelsLoading] = useState(false);
  const [llmModelsError, setLlmModelsError] = useState("");
  const [llmTestResult, setLlmTestResult] = useState<{
    ok: boolean;
    mode?: string;
    modelUsed?: string;
    latencyMs?: number;
    reply?: string;
    leadTriggered?: boolean;
    error?: string;
  } | null>(null);

  // Voice Sub-Tab State
  const [showElevenKey, setShowElevenKey] = useState(false);
  const [ttsTesting, setTtsTesting] = useState(false);
  const [ttsTestResult, setTtsTestResult] = useState<{
    engine: string;
    latencyMs: number;
    phoneticText: string;
    reason?: string;
  } | null>(null);
  const [newPronTerm, setNewPronTerm] = useState("");
  const [newPronPhonetic, setNewPronPhonetic] = useState("");

  // Knowledge Sub-Tab State
  const [knowledgeSection, setKnowledgeSection] = useState<
    "company" | "commercial" | "categories" | "steps" | "faqs" | "portfolio"
  >("company");
  const [newBrandName, setNewBrandName] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [syncingWeb, setSyncingWeb] = useState(false);

  // Persona Sub-Tab State
  const [newForbiddenClaim, setNewForbiddenClaim] = useState("");
  const [newQualField, setNewQualField] = useState("");

  // Simulator Sub-Tab State
  const [simMessages, setSimMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [simInput, setSimInput] = useState("");
  const [simState, setSimState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [simSending, setSimSending] = useState(false);
  const [simLeadTriggered, setSimLeadTriggered] = useState(false);
  const [simExtractedLead, setSimExtractedLead] = useState<{
    produk: string | null;
    jumlah: string | null;
    budget: string | null;
    launching: string | null;
  }>({ produk: null, jumlah: null, budget: null, launching: null });
  const [simLatencyMs, setSimLatencyMs] = useState<number | null>(null);
  const [simPhoneticLast, setSimPhoneticLast] = useState<string>("");
  const [showPromptModal, setShowPromptModal] = useState(false);

  const importInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: "ok" | "err" = "ok") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rara-config", { cache: "no-store" });
      const json = await res.json();
      if (json.ok && json.config) {
        setConfig(json.config);
        setHasLlmKey(Boolean(json.meta?.hasLlmApiKey));
        setHasElevenKey(Boolean(json.meta?.hasElevenlabsApiKey));
        setAvailableClips(json.meta?.availableClips || []);
        setCompiledMarkdown(json.meta?.compiledKnowledgeMarkdown || "");
        setCompiledPrompt(json.meta?.compiledSystemPrompt || "");
        const firstIdle = json.config.visual?.clips?.idle?.[0];
        if (firstIdle) setPreviewVideo(`/avatar/${firstIdle}`);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      showToast("Gagal memuat konfigurasi Rara: " + msg, "err");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the 9Router model list once a key is saved and the LLM tab is opened
  useEffect(() => {
    if (subTab === "llm" && hasLlmKey && config && !llmModels.length && !llmModelsLoading && !llmModelsError) {
      void handleListModels();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subTab, hasLlmKey, config === null]);

  const handleSave = async (customCfg?: RaraConfig) => {
    const target = customCfg || config;
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "save", config: target }),
      });
      const json = await res.json();
      if (json.ok) {
        setConfig(json.config);
        setHasLlmKey(Boolean(json.meta?.hasLlmApiKey));
        setHasElevenKey(Boolean(json.meta?.hasElevenlabsApiKey));
        setAvailableClips(json.meta?.availableClips || []);
        setCompiledMarkdown(json.meta?.compiledKnowledgeMarkdown || "");
        setCompiledPrompt(json.meta?.compiledSystemPrompt || "");
        showToast(json.message || "Pengaturan Rara berhasil disimpan!");
      } else {
        showToast(json.error || "Gagal menyimpan", "err");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      showToast("Gagal menghubungi server: " + msg, "err");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncWebsite = async () => {
    setSyncingWeb(true);
    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sync_website" }),
      });
      const json = await res.json();
      if (json.ok) {
        setConfig(json.config);
        setCompiledMarkdown(json.meta?.compiledKnowledgeMarkdown || "");
        setCompiledPrompt(json.meta?.compiledSystemPrompt || "");
        showToast("Product Knowledge berhasil disinkronkan dari harakaerfi.com!");
      }
    } catch {
      showToast("Gagal sinkronisasi", "err");
    } finally {
      setSyncingWeb(false);
    }
  };

  const handleResetDefault = async () => {
    if (!window.confirm("Kembalikan seluruh pengaturan Rara ke preset resmi harakaerfi.com?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const json = await res.json();
      if (json.ok) {
        setConfig(json.config);
        setCompiledMarkdown(json.meta?.compiledKnowledgeMarkdown || "");
        setCompiledPrompt(json.meta?.compiledSystemPrompt || "");
        showToast("Pengaturan berhasil di-reset ke default harakaerfi.com!");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleExportJson = () => {
    if (!config) return;
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rara-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (parsed && parsed.visual && parsed.llm && parsed.knowledge) {
          setConfig(parsed);
          void handleSave(parsed);
        } else {
          showToast("Format file JSON konfigurasi Rara tidak valid", "err");
        }
      } catch {
        showToast("Gagal membaca file JSON", "err");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleUploadClipFile = (stateKey: "idle" | "listening" | "thinking" | "speaking", file: File) => {
    setUploadingClipState(stateKey);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch("/api/rara-config", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "upload_clip",
            state: stateKey,
            fileName: file.name,
            base64Data: String(reader.result),
          }),
        });
        const json = await res.json();
        if (json.ok) {
          setConfig(json.config);
          setAvailableClips(json.meta?.availableClips || []);
          setPreviewVideo(`/avatar/${json.fileName}`);
          setActiveAvatarState(stateKey);
          showToast(json.message || "Klip berhasil diunggah!");
        } else {
          showToast(json.error || "Gagal mengunggah klip", "err");
        }
      } catch {
        showToast("Gagal mengunggah klip video", "err");
      } finally {
        setUploadingClipState(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleListModels = async () => {
    if (!config) return;
    setLlmModelsLoading(true);
    setLlmModelsError("");
    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "list_models", llm: config.llm }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || "Gagal mengambil daftar model");
      const models: string[] = json.models || [];
      setLlmModels(models);
      if (!models.length) setLlmModelsError("Endpoint tidak mengembalikan model apa pun.");
      else setConfig((c) => (c && !c.llm.model ? { ...c, llm: { ...c.llm, model: models[0] } } : c));
    } catch (e: unknown) {
      setLlmModelsError(e instanceof Error ? e.message : "Gagal mengambil daftar model");
    } finally {
      setLlmModelsLoading(false);
    }
  };

  const handleTestLlm = async () => {
    if (!config) return;
    setLlmTesting(true);
    setLlmTestResult(null);
    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "test_llm",
          llm: config.llm,
          prompt: llmTestPrompt,
        }),
      });
      const json = await res.json();
      setLlmTestResult(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error";
      setLlmTestResult({ ok: false, error: msg });
    } finally {
      setLlmTesting(false);
    }
  };

  const playVoiceWithBrowser = (text: string, speed = 1.05, onDone?: () => void) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = config?.voice.sttLang || "id-ID";
      u.rate = speed;
      u.onend = () => onDone?.();
      u.onerror = () => onDone?.();
      window.speechSynthesis.speak(u);
    } else {
      setTimeout(() => onDone?.(), 2500);
    }
  };

  const handleTestTts = async (customText?: string) => {
    if (!config) return;
    setTtsTesting(true);
    const prevState = activeAvatarState;
    const speakingClip = config.visual.clips.speaking?.[0] || "speaking-1.mp4";
    setActiveAvatarState("speaking");
    setPreviewVideo(`/avatar/${speakingClip}`);

    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "test_tts",
          voice: config.voice,
          text: customText || config.voice.sampleTestText,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setTtsTestResult({
          engine: json.engine,
          latencyMs: json.latencyMs,
          phoneticText: json.phoneticText,
          reason: json.reason,
        });

        const restoreIdle = () => {
          const idleClip = config.visual.clips.idle?.[0] || "idle-1.mp4";
          setActiveAvatarState(prevState === "speaking" ? "idle" : prevState);
          setPreviewVideo(`/avatar/${idleClip}`);
          setTtsTesting(false);
        };

        if (json.engine === "elevenlabs" && json.audioDataUrl) {
          const audio = new Audio(json.audioDataUrl);
          audio.onended = restoreIdle;
          audio.onerror = restoreIdle;
          await audio.play();
        } else {
          playVoiceWithBrowser(json.phoneticText, config.voice.speakingSpeed, restoreIdle);
        }
      } else {
        setTtsTesting(false);
      }
    } catch {
      setTtsTesting(false);
    }
  };

  const handleSimulatorSend = async (textOverride?: string) => {
    if (!config) return;
    const text = (textOverride ?? simInput).trim();
    if (!text || simSending) return;

    setSimInput("");
    setSimSending(true);
    setSimState("thinking");

    const nextHistory: { role: "user" | "assistant"; content: string }[] = [
      ...simMessages,
      { role: "user", content: text },
    ];
    setSimMessages(nextHistory);

    try {
      const res = await fetch("/api/rara-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "simulate_chat",
          config,
          messages: nextHistory,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        const updatedHistory: { role: "user" | "assistant"; content: string }[] = [
          ...nextHistory,
          { role: "assistant", content: json.cleanReply },
        ];
        setSimMessages(updatedHistory);
        setSimLatencyMs(json.llmLatencyMs);
        setSimPhoneticLast(json.phoneticText || json.cleanReply);
        if (json.leadTriggered) setSimLeadTriggered(true);
        if (json.extractedSummary) setSimExtractedLead(json.extractedSummary);
        if (json.compiledSystemPrompt) setCompiledPrompt(json.compiledSystemPrompt);

        // Speak reply & animate avatar speaking
        setSimState("speaking");
        playVoiceWithBrowser(json.phoneticText || json.cleanReply, config.voice.speakingSpeed, () => {
          setSimState("idle");
        });
      } else {
        setSimState("idle");
      }
    } catch {
      setSimState("idle");
    } finally {
      setSimSending(false);
    }
  };

  if (loading || !config) {
    return (
      <div className={styles.panelCard} style={{ padding: 40, textAlign: "center", color: "#705e5e" }}>
        Memuat Konfigurasi Lengkap Avatar Rara...
      </div>
    );
  }

  const simVideoFile =
    simState === "listening"
      ? config.visual.clips.listening?.[0] || "listening-1.mp4"
      : simState === "thinking"
      ? config.visual.clips.thinking?.[0] || "thinking-1.mp4"
      : simState === "speaking"
      ? config.visual.clips.speaking?.[0] || "speaking-1.mp4"
      : config.visual.clips.idle?.[0] || "idle-1.mp4";

  return (
    <div className={styles.panelCard}>
      {/* ====================================================================
          HEADER & GLOBAL CONFIG ACTIONS
          ==================================================================== */}
      <div className={styles.panelHeader} style={{ borderBottom: "1px solid #f0ebe7", paddingBottom: 16, marginBottom: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 className={styles.panelTitle}>Pusat Kendali Avatar Tanya Rara (All-in-One Control)</h3>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                background: "#eaf5f1",
                color: "#0d6a55",
                padding: "3px 8px",
                borderRadius: 99,
              }}
            >
              Terhubung ke Rara Live (/)
            </span>
          </div>
          <p className={styles.panelDesc} style={{ marginTop: 4 }}>
            Kelola penuh Video Avatar & Stage, Engine LLM, Suara TTS/STT & Kamus Pelafalan, Product Knowledge{" "}
            <a
              href="https://harakaerfi.com/"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#a8666a", fontWeight: 700, textDecoration: "underline" }}
            >
              harakaerfi.com
            </a>
            , Persona & Guardrails BPOM, serta Simulator Interaktif.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            style={{ display: "none" }}
            onChange={handleImportJson}
          />
          <button
            type="button"
            onClick={() => importInputRef.current?.click()}
            style={{
              border: "1px solid #e8e2de",
              background: "#fff",
              borderRadius: 8,
              padding: "7px 11px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            title="Import file JSON konfigurasi Rara"
          >
            <Upload size={13} /> Import
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            style={{
              border: "1px solid #e8e2de",
              background: "#fff",
              borderRadius: 8,
              padding: "7px 11px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
            title="Export seluruh konfigurasi Rara ke JSON"
          >
            <Download size={13} /> Export
          </button>
          <button
            type="button"
            onClick={handleResetDefault}
            style={{
              border: "1px solid #f0d5d3",
              background: "#faeeed",
              color: "#a8666a",
              borderRadius: 8,
              padding: "7px 11px",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <RotateCcw size={13} /> Reset Preset
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => handleSave()}
            disabled={saving}
            style={{ padding: "8px 16px", fontSize: 12.5 }}
          >
            <Check size={14} /> {saving ? "Menyimpan..." : "Simpan & Terapkan ke Rara Live"}
          </button>
        </div>
      </div>

      {/* TOAST BANNER */}
      {toast && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: toast.type === "ok" ? "#eaf5f1" : "#faeeed",
            color: toast.type === "ok" ? "#0d6a55" : "#a3352f",
            border: `1px solid ${toast.type === "ok" ? "#c4e4d8" : "#f0d5d3"}`,
            fontSize: 12.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <CheckCircle2 size={15} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* ====================================================================
          6 SUB-TABS NAVIGATION
          ==================================================================== */}
      <div className={styles.subTabs} style={{ flexWrap: "wrap", gap: 6 }}>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "visual" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("visual")}
        >
          <Bot size={14} /> 1. Visual & Klip Avatar
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "llm" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("llm")}
        >
          <Brain size={14} /> 2. Otak & LLM Engine
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "voice" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("voice")}
        >
          <Volume2 size={14} /> 3. Suara (TTS & STT)
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "knowledge" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("knowledge")}
        >
          <BookOpen size={14} /> 4. Product Knowledge (harakaerfi.com)
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "persona" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("persona")}
        >
          <ShieldCheck size={14} /> 5. Persona, Guardrails & Lead Rules
        </button>
        <button
          type="button"
          className={`${styles.subTabBtn} ${subTab === "simulator" ? styles.subTabBtnActive : ""}`}
          onClick={() => setSubTab("simulator")}
        >
          <Sparkles size={14} /> 6. Live Simulator & Inspector
        </button>
      </div>

      {/* ====================================================================
          SUB-TAB 1: VISUAL & KLIP AVATAR
          ==================================================================== */}
      {subTab === "visual" && (
        <div style={{ display: "grid", gridTemplateColumns: "350px 1fr", gap: 24, alignItems: "start" }}>
          {/* LEFT: LIVE STAGE PREVIEW */}
          <div style={{ background: "#1f1818", borderRadius: 16, padding: 16, textAlign: "center", position: "sticky", top: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#eaf5f1", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Stage Preview: {activeAvatarState.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: 10,
                  background: config.visual.mode === "clips" ? "#0d6a55" : "#9a6100",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: 99,
                  fontWeight: 700,
                }}
              >
                Mode: {config.visual.mode === "clips" ? "Video Clips" : "Foto Placeholder"}
              </span>
            </div>

            {config.visual.mode === "clips" ? (
              <video
                key={previewVideo}
                src={previewVideo}
                style={{
                  width: "100%",
                  maxHeight: 370,
                  objectFit: "cover",
                  borderRadius: 14,
                  background: "#e4d9d7",
                  WebkitMaskImage: `radial-gradient(ellipse ${50 - config.visual.cameoFeather / 4}% ${
                    48 - config.visual.cameoFeather / 4
                  }% at 50% 46%, #000 55%, rgba(0,0,0,0.65) ${80 - config.visual.cameoFeather / 3}%, transparent 98%)`,
                }}
                autoPlay
                loop
                muted
                playsInline
                controls
              />
            ) : (
              <img
                src="/avatar/placeholder.png"
                alt="Rara Placeholder"
                style={{
                  width: "100%",
                  maxHeight: 370,
                  objectFit: "contain",
                  borderRadius: 14,
                  background: "#e4d9d7",
                }}
              />
            )}

            <div style={{ fontSize: 11, color: "#d6c6c4", marginTop: 10 }}>
              File aktif: <code style={{ color: "#fff" }}>{previewVideo}</code>
            </div>

            {/* State Quick Switcher */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginTop: 12 }}>
              {(["idle", "listening", "thinking", "speaking"] as const).map((st) => {
                const active = activeAvatarState === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setActiveAvatarState(st);
                      const first = config.visual.clips[st]?.[0];
                      if (first) setPreviewVideo(`/avatar/${first}`);
                    }}
                    style={{
                      border: "1px solid",
                      borderColor: active ? "#a8666a" : "#3a2e2e",
                      background: active ? "#a8666a" : "#2b2222",
                      color: "#fff",
                      borderRadius: 6,
                      padding: "6px 4px",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CLIP MANIFEST & STAGE SETTINGS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Mode Switcher */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "#1f1818" }}>
                    Mode Render Avatar (`manifest.json`)
                  </h4>
                  <p style={{ fontSize: 12, color: "#705e5e", margin: "2px 0 0" }}>
                    Pilih apakah Rara tampil menggunakan transisi video klip MP4 atau foto statis bernapas (Placeholder).
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, visual: { ...config.visual, mode: "clips" } })}
                    style={{
                      border: "1px solid",
                      borderColor: config.visual.mode === "clips" ? "#a8666a" : "#e8e2de",
                      background: config.visual.mode === "clips" ? "#faeeed" : "#fff",
                      color: config.visual.mode === "clips" ? "#a8666a" : "#705e5e",
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🎬 Video Clips (Veo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, visual: { ...config.visual, mode: "placeholder" } })}
                    style={{
                      border: "1px solid",
                      borderColor: config.visual.mode === "placeholder" ? "#a8666a" : "#e8e2de",
                      background: config.visual.mode === "placeholder" ? "#faeeed" : "#fff",
                      color: config.visual.mode === "placeholder" ? "#a8666a" : "#705e5e",
                      padding: "7px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    🖼️ Foto Statis (Placeholder)
                  </button>
                </div>
              </div>
            </div>

            {/* 4 States Clip Manager */}
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "#1f1818" }}>
                Manajemen Klip Video per Emosi/Aktivitas (`public/avatar/`)
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {(
                  [
                    {
                      key: "idle" as const,
                      title: "IDLE (Diam & Bernapas)",
                      desc: "Diputar berulang saat menunggu pengunjung menyapa.",
                    },
                    {
                      key: "listening" as const,
                      title: "LISTENING (Mendengarkan)",
                      desc: "Aktif saat mikrofon menyala atau pengunjung sedang mengetik.",
                    },
                    {
                      key: "thinking" as const,
                      title: "THINKING (Memproses Jawaban)",
                      desc: "Aktif saat menunggu stream jawaban dari LLM.",
                    },
                    {
                      key: "speaking" as const,
                      title: "SPEAKING (Berbicara Audio)",
                      desc: "Diputar acak bergantian selama suara TTS Rara berbicara.",
                    },
                  ] as const
                ).map((st) => {
                  const clips = config.visual.clips[st.key] || [];
                  return (
                    <div
                      key={st.key}
                      style={{
                        border: "1px solid #e8e2de",
                        borderRadius: 12,
                        padding: 14,
                        background: "#faf8f6",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#a8666a" }}>{st.title}</span>
                          <span
                            style={{
                              fontSize: 10.5,
                              background: "#fff",
                              border: "1px solid #e8e2de",
                              padding: "2px 7px",
                              borderRadius: 99,
                              fontWeight: 700,
                            }}
                          >
                            {clips.length} Klip
                          </span>
                        </div>
                        <p style={{ fontSize: 11.5, color: "#705e5e", margin: "4px 0 10px" }}>{st.desc}</p>

                        {/* Active Clips List */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {clips.map((clipName) => {
                            const isPlaying = previewVideo === `/avatar/${clipName}`;
                            return (
                              <div
                                key={clipName}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  background: isPlaying ? "#faeeed" : "#ffffff",
                                  border: `1px solid ${isPlaying ? "#a8666a" : "#f0ebe7"}`,
                                  padding: "6px 10px",
                                  borderRadius: 8,
                                  fontSize: 12,
                                }}
                              >
                                <code style={{ fontWeight: 600, color: "#1f1818" }}>{clipName}</code>
                                <div style={{ display: "flex", gap: 4 }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPreviewVideo(`/avatar/${clipName}`);
                                      setActiveAvatarState(st.key);
                                    }}
                                    style={{
                                      border: "none",
                                      background: isPlaying ? "#a8666a" : "#f2eeea",
                                      color: isPlaying ? "#fff" : "#1f1818",
                                      borderRadius: 5,
                                      padding: "3px 8px",
                                      fontSize: 10.5,
                                      fontWeight: 700,
                                      cursor: "pointer",
                                    }}
                                  >
                                    <Play size={10} style={{ display: "inline", marginRight: 3 }} />
                                    {isPlaying ? "Aktif" : "Putar"}
                                  </button>
                                  {clips.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const next = clips.filter((c) => c !== clipName);
                                        setConfig({
                                          ...config,
                                          visual: {
                                            ...config.visual,
                                            clips: { ...config.visual.clips, [st.key]: next },
                                          },
                                        });
                                      }}
                                      style={{
                                        border: "none",
                                        background: "#faeeed",
                                        color: "#a3352f",
                                        borderRadius: 5,
                                        padding: "3px 6px",
                                        cursor: "pointer",
                                      }}
                                      title="Hapus klip dari state ini"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add existing clip or upload new MP4 */}
                      <div style={{ display: "flex", gap: 6, marginTop: 6, borderTop: "1px dashed #e8e2de", paddingTop: 8 }}>
                        <select
                          value={selectedClipToAdd[st.key] || ""}
                          onChange={(e) => setSelectedClipToAdd({ ...selectedClipToAdd, [st.key]: e.target.value })}
                          style={{
                            flex: 1,
                            fontSize: 11.5,
                            padding: "5px 8px",
                            borderRadius: 6,
                            border: "1px solid #e8e2de",
                            background: "#fff",
                          }}
                        >
                          <option value="">+ Pilih file di server...</option>
                          {availableClips.map((ac) => (
                            <option key={ac.name} value={ac.name}>
                              {ac.name} ({ac.sizeKb} KB)
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const pick = selectedClipToAdd[st.key];
                            if (!pick) return;
                            if (!clips.includes(pick)) {
                              setConfig({
                                ...config,
                                visual: {
                                  ...config.visual,
                                  clips: { ...config.visual.clips, [st.key]: [...clips, pick] },
                                },
                              });
                            }
                          }}
                          style={{
                            border: "1px solid #e8e2de",
                            background: "#fff",
                            borderRadius: 6,
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Tambah
                        </button>
                        <label
                          style={{
                            border: "1px solid #0d6a55",
                            background: "#eaf5f1",
                            color: "#0d6a55",
                            borderRadius: 6,
                            padding: "5px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                          title="Upload file MP4 baru dari komputer"
                        >
                          <Upload size={11} />
                          {uploadingClipState === st.key ? "..." : "Upload"}
                          <input
                            type="file"
                            accept="video/mp4,video/webm"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadClipFile(st.key, f);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sliders: Cameo Feather, Despill, Crossfade, Scale */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Cameo Feather</span>
                  <span className={styles.sliderValue}>{config.visual.cameoFeather}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="35"
                  value={config.visual.cameoFeather}
                  onChange={(e) =>
                    setConfig({ ...config, visual: { ...config.visual, cameoFeather: Number(e.target.value) } })
                  }
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: 10, color: "#9c8a8a" }}>Gradien tepi oval video</span>
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Green Despill</span>
                  <span className={styles.sliderValue}>{config.visual.despillGreen}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={config.visual.despillGreen}
                  onChange={(e) =>
                    setConfig({ ...config, visual: { ...config.visual, despillGreen: Number(e.target.value) } })
                  }
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: 10, color: "#9c8a8a" }}>Reduksi pantulan tepi rambut</span>
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Crossfade Dissolve</span>
                  <span className={styles.sliderValue}>{config.visual.dissolveSpeedMs}ms</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="800"
                  step="50"
                  value={config.visual.dissolveSpeedMs}
                  onChange={(e) =>
                    setConfig({ ...config, visual: { ...config.visual, dissolveSpeedMs: Number(e.target.value) } })
                  }
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: 10, color: "#9c8a8a" }}>Transisi halus antar klip</span>
              </div>

              <div className={styles.sliderGroup}>
                <div className={styles.sliderHeader}>
                  <span>Skala Avatar</span>
                  <span className={styles.sliderValue}>{config.visual.avatarScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.95"
                  max="1.35"
                  step="0.02"
                  value={config.visual.avatarScale}
                  onChange={(e) =>
                    setConfig({ ...config, visual: { ...config.visual, avatarScale: Number(e.target.value) } })
                  }
                  className={styles.rangeInput}
                />
                <span style={{ fontSize: 10, color: "#9c8a8a" }}>Proporsi tinggi di homepage</span>
              </div>
            </div>

            {/* Homepage Stage UI Settings: Greeting, Quick Chips, Top Badge, Fact Orbs */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 12, padding: 18 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: "#1f1818" }}>
                Elemen Panggung Interaktif di Halaman Utama (`/`)
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                    Kalimat Sapaan Awal (`GREETING`)
                  </label>
                  <input
                    type="text"
                    value={config.visual.greeting}
                    onChange={(e) => setConfig({ ...config, visual: { ...config.visual, greeting: e.target.value } })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 13,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                    Badge Sertifikasi Kanan Atas
                  </label>
                  <input
                    type="text"
                    value={config.visual.topBadge}
                    onChange={(e) => setConfig({ ...config, visual: { ...config.visual, topBadge: e.target.value } })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 13,
                    }}
                  />
                </div>
              </div>

              {/* Quick Chips */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 6 }}>
                  Tombol Pertanyaan Cepat (`Quick Chips` di bawah Rara)
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {config.visual.quickChips.map((chip, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "#fff",
                        border: "1px solid #e8e2de",
                        borderRadius: 99,
                        padding: "5px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {chip}
                      <button
                        type="button"
                        onClick={() => {
                          const next = config.visual.quickChips.filter((_, i) => i !== idx);
                          setConfig({ ...config, visual: { ...config.visual, quickChips: next } });
                        }}
                        style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer", padding: 0 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
                  <input
                    type="text"
                    placeholder="Tambah tombol pertanyaan cepat..."
                    value={newChipText}
                    onChange={(e) => setNewChipText(e.target.value)}
                    style={{
                      flex: 1,
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newChipText.trim()) return;
                      setConfig({
                        ...config,
                        visual: {
                          ...config.visual,
                          quickChips: [...config.visual.quickChips, newChipText.trim()],
                        },
                      });
                      setNewChipText("");
                    }}
                    style={{
                      border: "1px solid #a8666a",
                      background: "#faeeed",
                      color: "#a8666a",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Tambah Chip
                  </button>
                </div>
              </div>

              {/* 4 Floating Fact Orbs */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 6 }}>
                  4 Floating Fact Orbs (Kartu Fakta Mengambang di Sekitar Rara)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  {config.visual.factOrbs.map((orb, idx) => (
                    <div
                      key={orb.pos}
                      style={{ background: "#fff", border: "1px solid #e8e2de", borderRadius: 8, padding: 10 }}
                    >
                      <div style={{ fontSize: 10, fontWeight: 700, color: "#9c8a8a", textTransform: "uppercase", marginBottom: 4 }}>
                        Posisi: {orb.pos}
                      </div>
                      <input
                        type="text"
                        value={orb.big}
                        onChange={(e) => {
                          const next = [...config.visual.factOrbs];
                          next[idx] = { ...orb, big: e.target.value };
                          setConfig({ ...config, visual: { ...config.visual, factOrbs: next } });
                        }}
                        placeholder="Angka utama"
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: "1px solid #e8e2de",
                          fontSize: 12,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      />
                      <input
                        type="text"
                        value={orb.small}
                        onChange={(e) => {
                          const next = [...config.visual.factOrbs];
                          next[idx] = { ...orb, small: e.target.value };
                          setConfig({ ...config, visual: { ...config.visual, factOrbs: next } });
                        }}
                        placeholder="Sub-label"
                        style={{
                          width: "100%",
                          padding: "5px 8px",
                          borderRadius: 6,
                          border: "1px solid #e8e2de",
                          fontSize: 11.5,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 2: OTAK & LLM ENGINE
          ==================================================================== */}
      {subTab === "llm" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "start" }}>
          {/* LEFT: 9ROUTER ENDPOINT & PARAMETERS */}
          <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 20 }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}
            >
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "#1f1818", whiteSpace: "nowrap" }}>
                Otak AI — 9Router
              </h4>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: hasLlmKey ? "#0d6a55" : "#9a6100",
                  background: hasLlmKey ? "#eaf5f1" : "#fcf1db",
                  padding: "2px 8px",
                  borderRadius: 99,
                  whiteSpace: "nowrap",
                }}
              >
                {hasLlmKey ? "API Key tersimpan" : "Belum terhubung"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "#705e5e", margin: "6px 0 16px" }}>
              Semua jawaban Rara diproses lewat gateway 9Router. Isi API Key, ambil daftar model, lalu pilih model
              utama dan cadangannya.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={LLM_LABEL_STYLE}>Endpoint 9Router (`LLM_BASE_URL`)</label>
                <input
                  type="text"
                  value={config.llm.baseUrl}
                  onChange={(e) => setConfig({ ...config, llm: { ...config.llm, baseUrl: e.target.value } })}
                  placeholder={NINE_ROUTER_BASE_URL}
                  style={LLM_INPUT_STYLE}
                />
              </div>

              <div>
                <label style={LLM_LABEL_STYLE}>API Key 9Router (`LLM_API_KEY`)</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type={showLlmKey ? "text" : "password"}
                    value={config.llm.apiKey}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, apiKey: e.target.value } })}
                    placeholder={hasLlmKey ? "Memakai key yang tersimpan" : "Tempel API Key dari dashboard 9Router"}
                    style={{ ...LLM_INPUT_STYLE, flex: 1, width: undefined }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLlmKey(!showLlmKey)}
                    style={{
                      border: "1px solid #e8e2de",
                      background: "#fff",
                      borderRadius: 8,
                      padding: "0 12px",
                      cursor: "pointer",
                    }}
                  >
                    {showLlmKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <span style={{ fontSize: 10.5, color: "#9c8a8a" }}>
                  Disarankan diisi di file `.env` server agar key tidak ikut tersimpan di data konfigurasi.
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleListModels}
                  disabled={llmModelsLoading}
                  style={{
                    border: "1px solid #a8666a",
                    background: "#fff",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#a8666a",
                    cursor: llmModelsLoading ? "wait" : "pointer",
                  }}
                >
                  {llmModelsLoading ? "Mengambil model..." : llmModels.length ? "Muat ulang model" : "Ambil daftar model"}
                </button>
                <span style={{ fontSize: 11, color: llmModelsError ? "#b3261e" : "#705e5e" }}>
                  {llmModelsError ||
                    (llmModels.length
                      ? `${llmModels.length} model tersedia di 9Router.`
                      : "Daftar model diambil langsung dari 9Router.")}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(
                  [
                    { key: "model", label: "Model Utama (`LLM_MODEL`)", emptyLabel: "— Pilih model —" },
                    { key: "fallbackModel", label: "Model Cadangan (Fallback)", emptyLabel: "— Tanpa cadangan —" },
                  ] as const
                ).map(({ key, label, emptyLabel }) => {
                  const value = config.llm[key];
                  const options = value && !llmModels.includes(value) ? [value, ...llmModels] : llmModels;
                  return (
                    <div key={key}>
                      <label style={LLM_LABEL_STYLE}>{label}</label>
                      {options.length ? (
                        <select
                          value={value}
                          onChange={(e) => setConfig({ ...config, llm: { ...config.llm, [key]: e.target.value } })}
                          style={{ ...LLM_INPUT_STYLE, background: "#fff" }}
                        >
                          <option value="">{emptyLabel}</option>
                          {options.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) => setConfig({ ...config, llm: { ...config.llm, [key]: e.target.value } })}
                          placeholder="Belum dipilih"
                          style={LLM_INPUT_STYLE}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Sliders: Temperature & Max Tokens */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Temperature (Kreativitas)</span>
                    <span className={styles.sliderValue}>{config.llm.temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={config.llm.temperature}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, temperature: Number(e.target.value) } })}
                    className={styles.rangeInput}
                  />
                  <span style={{ fontSize: 10, color: "#9c8a8a" }}>0.3–0.5 direkomendasikan agar patuh fakta pabrik</span>
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Max Output Tokens</span>
                    <span className={styles.sliderValue}>{config.llm.maxTokens} tok</span>
                  </div>
                  <input
                    type="range"
                    min="120"
                    max="800"
                    step="20"
                    value={config.llm.maxTokens}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, maxTokens: Number(e.target.value) } })}
                    className={styles.rangeInput}
                  />
                  <span style={{ fontSize: 10, color: "#9c8a8a" }}>Menjaga jawaban tetap ringkas untuk TTS</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                    Instruksi Panjang Jawaban
                  </label>
                  <input
                    type="text"
                    value={config.llm.targetSentences}
                    onChange={(e) => setConfig({ ...config, llm: { ...config.llm, targetSentences: e.target.value } })}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12.5,
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                    Maks Pertanyaan / Balasan
                  </label>
                  <select
                    value={config.llm.maxQuestionsPerTurn}
                    onChange={(e) =>
                      setConfig({ ...config, llm: { ...config.llm, maxQuestionsPerTurn: Number(e.target.value) } })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12.5,
                      background: "#fff",
                    }}
                  >
                    <option value={1}>Maksimal 1 pertanyaan</option>
                    <option value={2}>Maksimal 2 pertanyaan</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: LLM CONNECTION TESTER */}
          <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <Zap size={18} style={{ color: "#0d6a55" }} />
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Uji Koneksi & Respons Otak Rara</h4>
            </div>
            <p style={{ fontSize: 12, color: "#705e5e", marginBottom: 14 }}>
              Tes apakah endpoint LLM merespons sesuai Product Knowledge Haraka Erfi. Jika API Key belum diisi, Rara otomatis menggunakan <b>Built-in Haraka Knowledge Engine</b> sehingga tidak pernah error.
            </p>

            <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
              Pertanyaan Uji Coba:
            </label>
            <textarea
              rows={3}
              value={llmTestPrompt}
              onChange={(e) => setLlmTestPrompt(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #e8e2de",
                fontSize: 12.5,
                marginBottom: 10,
              }}
            />

            <button
              type="button"
              onClick={handleTestLlm}
              disabled={llmTesting}
              style={{
                border: "1px solid #0d6a55",
                background: "#0d6a55",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Zap size={14} /> {llmTesting ? "Menguji Koneksi LLM..." : "Test Koneksi & Jawaban LLM"}
            </button>

            {llmTestResult && (
              <div
                style={{
                  marginTop: 16,
                  background: "#fff",
                  border: `1px solid ${llmTestResult.ok ? "#c4e4d8" : "#f0d5d3"}`,
                  borderRadius: 10,
                  padding: 14,
                }}
              >
                {llmTestResult.ok ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#0d6a55", marginBottom: 8 }}>
                      <span>Model: {llmTestResult.modelUsed}</span>
                      <span>Latensi: {llmTestResult.latencyMs} ms</span>
                    </div>
                    <div style={{ fontSize: 13, color: "#1f1818", lineHeight: 1.55, fontStyle: "italic" }}>
                      &ldquo;{llmTestResult.reply}&rdquo;
                    </div>
                    {llmTestResult.leadTriggered && (
                      <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#a8666a" }}>
                        🎯 Marker [[LEAD]] Terdeteksi (Form WhatsApp akan muncul)
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 12.5, color: "#a3352f", fontWeight: 600 }}>
                    Gagal: {llmTestResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 3: SUARA (TTS & STT) + KAMUS PELAFALAN
          ==================================================================== */}
      {subTab === "voice" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* LEFT: ELEVENLABS & FALLBACK CONFIG */}
          <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Volume2 size={18} style={{ color: "#a8666a" }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Engine Suara (ElevenLabs & Web Speech)</h4>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  background: hasElevenKey ? "#eaf5f1" : "#fcf1db",
                  color: hasElevenKey ? "#0d6a55" : "#9a6100",
                  padding: "2px 8px",
                  borderRadius: 99,
                }}
              >
                {hasElevenKey ? "ElevenLabs Ready" : "Fallback Browser Aktif"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {(
                [
                  { id: "elevenlabs" as const, label: "🎙️ ElevenLabs Neural TTS" },
                  { id: "browser" as const, label: "🌐 Browser Web Speech (Gratis)" },
                ] as const
              ).map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => setConfig({ ...config, voice: { ...config.voice, provider: eng.id } })}
                  style={{
                    flex: 1,
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1.5px solid",
                    borderColor: config.voice.provider === eng.id ? "#a8666a" : "#e8e2de",
                    background: config.voice.provider === eng.id ? "#faeeed" : "#fff",
                    color: config.voice.provider === eng.id ? "#a8666a" : "#5c4b4b",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {eng.label}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                  ElevenLabs API Key (`ELEVENLABS_API_KEY`)
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type={showElevenKey ? "text" : "password"}
                    value={config.voice.elevenlabsApiKey}
                    onChange={(e) => setConfig({ ...config, voice: { ...config.voice, elevenlabsApiKey: e.target.value } })}
                    placeholder="xi-api-key ElevenLabs..."
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12.5,
                      fontFamily: "monospace",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowElevenKey(!showElevenKey)}
                    style={{ border: "1px solid #e8e2de", background: "#fff", borderRadius: 8, padding: "0 12px", cursor: "pointer" }}
                  >
                    {showElevenKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                    Voice ID Karakter Suara
                  </label>
                  <select
                    value={VOICE_PRESETS.some((v) => v.id === config.voice.voiceId) ? config.voice.voiceId : "custom"}
                    onChange={(e) => {
                      if (e.target.value !== "custom") {
                        setConfig({ ...config, voice: { ...config.voice, voiceId: e.target.value } });
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12,
                      background: "#fff",
                      marginBottom: 6,
                    }}
                  >
                    {VOICE_PRESETS.map((vp) => (
                      <option key={vp.id} value={vp.id}>
                        {vp.name}
                      </option>
                    ))}
                    <option value="custom">Custom Voice ID (Clone Sendiri)</option>
                  </select>
                  <input
                    type="text"
                    value={config.voice.voiceId}
                    onChange={(e) => setConfig({ ...config, voice: { ...config.voice, voiceId: e.target.value } })}
                    placeholder="Masukkan Voice ID ElevenLabs..."
                    style={{
                      width: "100%",
                      padding: "7px 10px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12,
                      fontFamily: "monospace",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#5c4b4b", marginBottom: 4 }}>
                    Model Suara ElevenLabs
                  </label>
                  <select
                    value={config.voice.modelId}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        voice: { ...config.voice, modelId: e.target.value as RaraConfig["voice"]["modelId"] },
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #e8e2de",
                      fontSize: 12,
                      background: "#fff",
                    }}
                  >
                    <option value="eleven_multilingual_v2">eleven_multilingual_v2 (Kualitas Terbaik)</option>
                    <option value="eleven_turbo_v2_5">eleven_turbo_v2_5 (Seimbang & Cepat)</option>
                    <option value="eleven_flash_v2_5">eleven_flash_v2_5 (Ultra Cepat 75ms)</option>
                  </select>

                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, marginTop: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={config.voice.autoFallbackBrowserTts}
                      onChange={(e) =>
                        setConfig({ ...config, voice: { ...config.voice, autoFallbackBrowserTts: e.target.checked } })
                      }
                    />
                    <span>Auto-Fallback ke Web Speech bila kuota habis</span>
                  </label>
                </div>
              </div>

              {/* Voice Sliders */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Voice Stability</span>
                    <span className={styles.sliderValue}>{config.voice.stability}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="95"
                    value={config.voice.stability}
                    onChange={(e) => setConfig({ ...config, voice: { ...config.voice, stability: Number(e.target.value) } })}
                    className={styles.rangeInput}
                  />
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Clarity & Similarity</span>
                    <span className={styles.sliderValue}>{config.voice.similarityBoost}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={config.voice.similarityBoost}
                    onChange={(e) =>
                      setConfig({ ...config, voice: { ...config.voice, similarityBoost: Number(e.target.value) } })
                    }
                    className={styles.rangeInput}
                  />
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Style Exaggeration</span>
                    <span className={styles.sliderValue}>{config.voice.styleExaggeration}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    value={config.voice.styleExaggeration}
                    onChange={(e) =>
                      setConfig({ ...config, voice: { ...config.voice, styleExaggeration: Number(e.target.value) } })
                    }
                    className={styles.rangeInput}
                  />
                </div>

                <div className={styles.sliderGroup}>
                  <div className={styles.sliderHeader}>
                    <span>Speaking Speed</span>
                    <span className={styles.sliderValue}>{config.voice.speakingSpeed.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.25"
                    step="0.05"
                    value={config.voice.speakingSpeed}
                    onChange={(e) =>
                      setConfig({ ...config, voice: { ...config.voice, speakingSpeed: Number(e.target.value) } })
                    }
                    className={styles.rangeInput}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: PRONUNCIATION DICTIONARY & LIVE AUDIO TESTER */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {/* Pronunciation Dictionary */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 4px", color: "#1f1818" }}>
                Kamus Pelafalan Istilah Kosmetik & Maklon (Fonetik TTS)
              </h4>
              <p style={{ fontSize: 11.5, color: "#705e5e", margin: "0 0 12px" }}>
                Mengubah singkatan teknis menjadi ejaan fonetik sebelum dibacakan TTS agar Rara terdengar fasih.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 190, overflowY: "auto", marginBottom: 10 }}>
                {config.voice.pronunciationDictionary.map((rule, idx) => (
                  <div
                    key={rule.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#fff",
                      border: "1px solid #f0ebe7",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(e) => {
                          const next = [...config.voice.pronunciationDictionary];
                          next[idx] = { ...rule, enabled: e.target.checked };
                          setConfig({ ...config, voice: { ...config.voice, pronunciationDictionary: next } });
                        }}
                      />
                      <b>{rule.term}</b>
                      <span style={{ color: "#9c8a8a" }}>→</span>
                      <span style={{ color: "#0d6a55", fontWeight: 700 }}>&ldquo;{rule.phonetic}&rdquo;</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = config.voice.pronunciationDictionary.filter((_, i) => i !== idx);
                        setConfig({ ...config, voice: { ...config.voice, pronunciationDictionary: next } });
                      }}
                      style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  placeholder="Istilah (mis. HAKI)"
                  value={newPronTerm}
                  onChange={(e) => setNewPronTerm(e.target.value)}
                  style={{ width: 130, padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Cara baca (mis. Ha-Ki)"
                  value={newPronPhonetic}
                  onChange={(e) => setNewPronPhonetic(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPronTerm.trim() || !newPronPhonetic.trim()) return;
                    const rule: PronunciationRule = {
                      id: `pr-${Date.now()}`,
                      term: newPronTerm.trim(),
                      phonetic: newPronPhonetic.trim(),
                      enabled: true,
                    };
                    setConfig({
                      ...config,
                      voice: {
                        ...config.voice,
                        pronunciationDictionary: [...config.voice.pronunciationDictionary, rule],
                      },
                    });
                    setNewPronTerm("");
                    setNewPronPhonetic("");
                  }}
                  style={{
                    border: "1px solid #a8666a",
                    background: "#faeeed",
                    color: "#a8666a",
                    borderRadius: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Tambah
                </button>
              </div>
            </div>

            {/* Live Voice & Speaking Avatar Tester */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 6px", color: "#1f1818" }}>
                Uji Suara & Lip-Sync Rara
              </h4>
              <textarea
                rows={3}
                value={config.voice.sampleTestText}
                onChange={(e) => setConfig({ ...config, voice: { ...config.voice, sampleTestText: e.target.value } })}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #e8e2de",
                  fontSize: 12.5,
                  marginBottom: 10,
                }}
              />
              <button
                type="button"
                onClick={() => handleTestTts()}
                disabled={ttsTesting}
                style={{
                  border: "none",
                  background: "#0d6a55",
                  color: "#fff",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Volume2 size={14} /> {ttsTesting ? "Sedang Membacakan..." : "🔊 Putar Suara Rara Sekarang"}
              </button>

              {ttsTestResult && (
                <div style={{ marginTop: 10, background: "#fff", border: "1px solid #e8e2de", borderRadius: 8, padding: 10, fontSize: 11.5 }}>
                  <div style={{ fontWeight: 700, color: "#0d6a55" }}>
                    Engine: {ttsTestResult.engine === "elevenlabs" ? "ElevenLabs Neural Audio" : "Web Speech API (id-ID)"} ({ttsTestResult.latencyMs} ms)
                  </div>
                  <div style={{ color: "#5c4b4b", marginTop: 4 }}>
                    <b>Teks Fonetik Terkirim:</b> &ldquo;{ttsTestResult.phoneticText}&rdquo;
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 4: PRODUCT KNOWLEDGE & KATALOG MAKLON (harakaerfi.com)
          ==================================================================== */}
      {subTab === "knowledge" && (
        <div>
          {/* Top Knowledge Mode Bar */}
          <div
            style={{
              background: "#faf8f6",
              border: "1px solid #e8e2de",
              borderRadius: 12,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 18,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#1f1818" }}>
                Sumber Pengetahuan: <span style={{ color: "#a8666a" }}>{config.knowledge.sourceUrl}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#705e5e" }}>
                Setiap perubahan pada Form Terstruktur otomatis memperbarui file <code>lib/knowledge/haraka.md</code> dan otak Rara Live.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={handleSyncWebsite}
                disabled={syncingWeb}
                style={{
                  border: "1px solid #0d6a55",
                  background: "#eaf5f1",
                  color: "#0d6a55",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <RefreshCw size={13} /> {syncingWeb ? "Menyinkronkan..." : "Sync Data harakaerfi.com"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    knowledge: {
                      ...config.knowledge,
                      activeMode: config.knowledge.activeMode === "structured" ? "markdown" : "structured",
                    },
                  })
                }
                style={{
                  border: "1px solid #e8e2de",
                  background: "#fff",
                  color: "#1f1818",
                  borderRadius: 8,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {config.knowledge.activeMode === "structured"
                  ? "📝 Buka Raw Markdown Editor (haraka.md)"
                  : "🗂️ Kembali ke Form Terstruktur"}
              </button>
            </div>
          </div>

          {config.knowledge.activeMode === "markdown" ? (
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>
                  Editor Langsung <code>lib/knowledge/haraka.md</code>
                </h4>
                <span style={{ fontSize: 11.5, color: "#705e5e" }}>
                  {config.knowledge.rawMarkdown.length} karakter
                </span>
              </div>
              <textarea
                rows={22}
                value={config.knowledge.rawMarkdown}
                onChange={(e) =>
                  setConfig({ ...config, knowledge: { ...config.knowledge, rawMarkdown: e.target.value } })
                }
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 10,
                  border: "1px solid #e8e2de",
                  fontFamily: "monospace",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                }}
              />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 20, alignItems: "start" }}>
              {/* Left Category Navigation */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { id: "company" as const, label: "🏢 Profil & Legalitas Pabrik" },
                  { id: "commercial" as const, label: "💰 MOQ, Harga & Timeline" },
                  { id: "categories" as const, label: "🧴 Katalog 4 Kategori Produk" },
                  { id: "steps" as const, label: "⚙️ 6 Tahap & Layanan Maklon" },
                  { id: "faqs" as const, label: "💬 FAQ & Keberatan Klien" },
                  { id: "portfolio" as const, label: "🏆 18+ Brand & Dokumen" },
                ].map((nav) => (
                  <button
                    key={nav.id}
                    type="button"
                    onClick={() => setKnowledgeSection(nav.id)}
                    style={{
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor: knowledgeSection === nav.id ? "#a8666a" : "#e8e2de",
                      background: knowledgeSection === nav.id ? "#faeeed" : "#faf8f6",
                      color: knowledgeSection === nav.id ? "#a8666a" : "#1f1818",
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {nav.label}
                  </button>
                ))}
              </div>

              {/* Right Structured Editor Content */}
              <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 20 }}>
                {/* SECTION 1: COMPANY PROFILE */}
                {knowledgeSection === "company" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                      Identitas Perusahaan & Kontak Resmi (harakaerfi.com)
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          Nama Badan Hukum Resmi
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.legalName}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, legalName: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          Perusahaan Induk / Grup
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.parentCompany}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, parentCompany: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                        Tagline Utama Website
                      </label>
                      <input
                        type="text"
                        value={config.knowledge.company.tagline}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            knowledge: {
                              ...config.knowledge,
                              company: { ...config.knowledge.company, tagline: e.target.value },
                            },
                          })
                        }
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                      />
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                        Positioning & Keunggulan Manufaktur
                      </label>
                      <textarea
                        rows={3}
                        value={config.knowledge.company.positioning}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            knowledge: {
                              ...config.knowledge,
                              company: { ...config.knowledge.company, positioning: e.target.value },
                            },
                          })
                        }
                        style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          Alamat Pabrik & Head Office
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.address}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, address: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          Patokan Lokasi
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.addressLandmark}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, addressLandmark: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          WhatsApp CS Resmi
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.whatsappCs}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, whatsappCs: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          Telepon Kantor
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.officePhone}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, officePhone: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                          Email Resmi
                        </label>
                        <input
                          type="text"
                          value={config.knowledge.company.email}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                company: { ...config.knowledge.company, email: e.target.value },
                              },
                            })
                          }
                          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: COMMERCIAL RULES WITH ALLOW/SECRET TOGGLE */}
                {knowledgeSection === "commercial" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                        Aturan Komersial: MOQ, Harga, Sampel & Estimasi Durasi
                      </h4>
                      <p style={{ fontSize: 12, color: "#705e5e", margin: "4px 0 0" }}>
                        Gunakan saklar di kanan tiap kartu untuk mengatur apakah Rara <b>boleh menyebutkan angkanya</b> atau <b>wajib merahasiakan & mengarahkan ke Sales</b>.
                      </p>
                    </div>

                    {config.knowledge.commercial.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          background: "#fff",
                          border: `1.5px solid ${item.allowMention ? "#c4e4d8" : "#f0d5d3"}`,
                          borderRadius: 12,
                          padding: 14,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => {
                              const next = [...config.knowledge.commercial];
                              next[idx] = { ...item, label: e.target.value };
                              setConfig({ ...config, knowledge: { ...config.knowledge, commercial: next } });
                            }}
                            style={{
                              fontWeight: 800,
                              fontSize: 13,
                              border: "none",
                              background: "transparent",
                              color: "#1f1818",
                              width: "60%",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = [...config.knowledge.commercial];
                              next[idx] = { ...item, allowMention: !item.allowMention };
                              setConfig({ ...config, knowledge: { ...config.knowledge, commercial: next } });
                            }}
                            style={{
                              border: "none",
                              background: item.allowMention ? "#eaf5f1" : "#faeeed",
                              color: item.allowMention ? "#0d6a55" : "#a8666a",
                              padding: "4px 10px",
                              borderRadius: 99,
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            {item.allowMention ? "✅ Boleh Disebut Rara" : "🔒 Rahasiakan & Arahkan ke Sales"}
                          </button>
                        </div>

                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#705e5e", marginBottom: 4 }}>
                          {item.allowMention ? "Data Resmi yang Disampaikan Rara:" : "Catatan Internal:"}
                        </label>
                        <textarea
                          rows={2}
                          value={item.value}
                          onChange={(e) => {
                            const next = [...config.knowledge.commercial];
                            next[idx] = { ...item, value: e.target.value };
                            setConfig({ ...config, knowledge: { ...config.knowledge, commercial: next } });
                          }}
                          style={{
                            width: "100%",
                            padding: 8,
                            borderRadius: 8,
                            border: "1px solid #e8e2de",
                            fontSize: 12,
                            marginBottom: 8,
                          }}
                        />

                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#a8666a", marginBottom: 4 }}>
                          Instruksi Jawaban Bila Dirahasiakan / Ditanya Detail:
                        </label>
                        <input
                          type="text"
                          value={item.fallbackInstruction}
                          onChange={(e) => {
                            const next = [...config.knowledge.commercial];
                            next[idx] = { ...item, fallbackInstruction: e.target.value };
                            setConfig({ ...config, knowledge: { ...config.knowledge, commercial: next } });
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #e8e2de",
                            fontSize: 12,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* SECTION 3: 4 PRODUCT CATEGORIES */}
                {knowledgeSection === "categories" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                      Katalog Kategori Produk Maklon, Bahan Aktif R&D & Kemasan
                    </h4>
                    {config.knowledge.categories.map((cat, idx) => (
                      <div
                        key={cat.id}
                        style={{ background: "#fff", border: "1px solid #e8e2de", borderRadius: 12, padding: 14 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#a8666a" }}>{cat.name}</span>
                          <span style={{ fontSize: 11, color: "#0d6a55", fontWeight: 700 }}>{cat.moqNote}</span>
                        </div>
                        <div style={{ display: "grid", gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#5c4b4b" }}>Varian Produk:</label>
                            <input
                              type="text"
                              value={cat.items}
                              onChange={(e) => {
                                const next = [...config.knowledge.categories];
                                next[idx] = { ...cat, items: e.target.value };
                                setConfig({ ...config, knowledge: { ...config.knowledge, categories: next } });
                              }}
                              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#5c4b4b" }}>Bahan Aktif Unggulan R&D:</label>
                            <input
                              type="text"
                              value={cat.heroIngredients}
                              onChange={(e) => {
                                const next = [...config.knowledge.categories];
                                next[idx] = { ...cat, heroIngredients: e.target.value };
                                setConfig({ ...config, knowledge: { ...config.knowledge, categories: next } });
                              }}
                              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 11, fontWeight: 700, color: "#5c4b4b" }}>Pilihan Kemasan:</label>
                            <input
                              type="text"
                              value={cat.packagingOptions}
                              onChange={(e) => {
                                const next = [...config.knowledge.categories];
                                next[idx] = { ...cat, packagingOptions: e.target.value };
                                setConfig({ ...config, knowledge: { ...config.knowledge, categories: next } });
                              }}
                              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* SECTION 4: 6 STEPS & SERVICES */}
                {knowledgeSection === "steps" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                      6 Tahapan Mudah Maklon di PT Haraka Erfi
                    </h4>
                    {config.knowledge.sixSteps.map((st, idx) => (
                      <div
                        key={st.step}
                        style={{ background: "#fff", border: "1px solid #e8e2de", borderRadius: 10, padding: 12 }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#a8666a", marginBottom: 4 }}>
                          TAHAP 0{st.step}
                        </div>
                        <input
                          type="text"
                          value={st.title}
                          onChange={(e) => {
                            const next = [...config.knowledge.sixSteps];
                            next[idx] = { ...st, title: e.target.value };
                            setConfig({ ...config, knowledge: { ...config.knowledge, sixSteps: next } });
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #e8e2de",
                            fontSize: 12.5,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        />
                        <textarea
                          rows={2}
                          value={st.description}
                          onChange={(e) => {
                            const next = [...config.knowledge.sixSteps];
                            next[idx] = { ...st, description: e.target.value };
                            setConfig({ ...config, knowledge: { ...config.knowledge, sixSteps: next } });
                          }}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* SECTION 5: FAQS & OBJECTIONS */}
                {knowledgeSection === "faqs" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                        FAQ Resmi Website & Panduan Menjawab Keberatan Klien
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          const newFaq: FaqItem = {
                            id: `faq-${Date.now()}`,
                            category: "faq",
                            question: "Pertanyaan baru calon klien...",
                            answer: "Jawaban resmi Rara...",
                          };
                          setConfig({
                            ...config,
                            knowledge: { ...config.knowledge, faqs: [newFaq, ...config.knowledge.faqs] },
                          });
                        }}
                        style={{
                          border: "1px solid #a8666a",
                          background: "#faeeed",
                          color: "#a8666a",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        + Tambah FAQ / Objection
                      </button>
                    </div>

                    {config.knowledge.faqs.map((faq, idx) => (
                      <div
                        key={faq.id}
                        style={{ background: "#fff", border: "1px solid #e8e2de", borderRadius: 10, padding: 12 }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                          <select
                            value={faq.category}
                            onChange={(e) => {
                              const next = [...config.knowledge.faqs];
                              next[idx] = { ...faq, category: e.target.value as "faq" | "objection" };
                              setConfig({ ...config, knowledge: { ...config.knowledge, faqs: next } });
                            }}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 6,
                              border: "1px solid #e8e2de",
                              background: faq.category === "faq" ? "#eaf5f1" : "#faeeed",
                              color: faq.category === "faq" ? "#0d6a55" : "#a8666a",
                            }}
                          >
                            <option value="faq">FAQ Resmi Website</option>
                            <option value="objection">Handling Keberatan Klien</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const next = config.knowledge.faqs.filter((_, i) => i !== idx);
                              setConfig({ ...config, knowledge: { ...config.knowledge, faqs: next } });
                            }}
                            style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer" }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const next = [...config.knowledge.faqs];
                            next[idx] = { ...faq, question: e.target.value };
                            setConfig({ ...config, knowledge: { ...config.knowledge, faqs: next } });
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 10px",
                            borderRadius: 6,
                            border: "1px solid #e8e2de",
                            fontSize: 12.5,
                            fontWeight: 700,
                            marginBottom: 6,
                          }}
                        />
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => {
                            const next = [...config.knowledge.faqs];
                            next[idx] = { ...faq, answer: e.target.value };
                            setConfig({ ...config, knowledge: { ...config.knowledge, faqs: next } });
                          }}
                          style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid #e8e2de", fontSize: 12 }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* SECTION 6: PORTFOLIO BRANDS & EXTRA DOCS */}
                {knowledgeSection === "portfolio" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px" }}>
                        Portofolio Brand Mitra yang Boleh Disebut Rara ({config.knowledge.portfolioBrands.length} Brand)
                      </h4>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                        {config.knowledge.portfolioBrands.map((b, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: "#fff",
                              border: "1px solid #e8e2de",
                              borderRadius: 99,
                              padding: "5px 12px",
                              fontSize: 12,
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {b}
                            <button
                              type="button"
                              onClick={() => {
                                const next = config.knowledge.portfolioBrands.filter((_, i) => i !== idx);
                                setConfig({ ...config, knowledge: { ...config.knowledge, portfolioBrands: next } });
                              }}
                              style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer" }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <div style={{ display: "flex", gap: 8, maxWidth: 360 }}>
                        <input
                          type="text"
                          placeholder="Nama brand mitra..."
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12 }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newBrandName.trim()) return;
                            setConfig({
                              ...config,
                              knowledge: {
                                ...config.knowledge,
                                portfolioBrands: [...config.knowledge.portfolioBrands, newBrandName.trim()],
                              },
                            });
                            setNewBrandName("");
                          }}
                          style={{
                            border: "1px solid #a8666a",
                            background: "#faeeed",
                            color: "#a8666a",
                            borderRadius: 8,
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          + Tambah Brand
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: "1px solid #e8e2de", paddingTop: 16 }}>
                      <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 6px" }}>
                        Dokumen / Promo Tambahan (SOP Baru, Promo Bulan Ini, Katalog Khusus)
                      </h4>
                      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                        <input
                          type="text"
                          placeholder="Judul catatan / dokumen (mis. Promo Paket Maklon Sunscreen Akhir Tahun)"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                        <textarea
                          rows={3}
                          placeholder="Isi pengetahuan tambahan yang ingin disisipkan ke otak Rara..."
                          value={newDocContent}
                          onChange={(e) => setNewDocContent(e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                        />
                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              if (!newDocTitle.trim() || !newDocContent.trim()) return;
                              const doc: ExtraKnowledgeDoc = {
                                id: `doc-${Date.now()}`,
                                title: newDocTitle.trim(),
                                content: newDocContent.trim(),
                                updatedAt: new Date().toISOString(),
                                enabled: true,
                              };
                              setConfig({
                                ...config,
                                knowledge: {
                                  ...config.knowledge,
                                  extraDocs: [...(config.knowledge.extraDocs || []), doc],
                                },
                              });
                              setNewDocTitle("");
                              setNewDocContent("");
                            }}
                            style={{
                              border: "none",
                              background: "#0d6a55",
                              color: "#fff",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                          >
                            + Simpan Dokumen Pengetahuan Tambahan
                          </button>
                        </div>
                      </div>

                      {(config.knowledge.extraDocs || []).map((doc, idx) => (
                        <div
                          key={doc.id}
                          style={{
                            background: "#fff",
                            border: "1px solid #e8e2de",
                            borderRadius: 10,
                            padding: 12,
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <b>{doc.title}</b>
                            <button
                              type="button"
                              onClick={() => {
                                const next = config.knowledge.extraDocs.filter((_, i) => i !== idx);
                                setConfig({ ...config, knowledge: { ...config.knowledge, extraDocs: next } });
                              }}
                              style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer" }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                          <p style={{ fontSize: 12, color: "#5c4b4b", margin: "4px 0 0" }}>{doc.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 5: PERSONA, GUARDRAILS BPOM & LEAD RULES
          ==================================================================== */}
      {subTab === "persona" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
          {/* LEFT: PERSONA & BPOM GUARDRAILS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 12px" }}>Identitas & Persona Rara</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Nama Avatar</label>
                  <input
                    type="text"
                    value={config.persona.avatarName}
                    onChange={(e) => setConfig({ ...config, persona: { ...config.persona, avatarName: e.target.value } })}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Panggilan Klien</label>
                  <input
                    type="text"
                    value={config.persona.visitorHonorific}
                    onChange={(e) =>
                      setConfig({ ...config, persona: { ...config.persona, visitorHonorific: e.target.value } })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Peran / Jabatan</label>
                  <input
                    type="text"
                    value={config.persona.roleTitle}
                    onChange={(e) => setConfig({ ...config, persona: { ...config.persona, roleTitle: e.target.value } })}
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
              </div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>Tone of Voice & Gaya Bicara</label>
              <textarea
                rows={3}
                value={config.persona.toneOfVoice}
                onChange={(e) => setConfig({ ...config, persona: { ...config.persona, toneOfVoice: e.target.value } })}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
              />
            </div>

            {/* Guardrails Regulasi BPOM */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Pagar Keamanan & Guardrail BPOM</h4>
                <span style={{ fontSize: 10.5, fontWeight: 800, background: "#faeeed", color: "#a8666a", padding: "2px 8px", borderRadius: 4 }}>
                  STRICT MODE
                </span>
              </div>

              <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
                {[
                  { key: "strictBpomMode" as const, label: "Wajib Patuh Regulasi Klaim Kosmetik BPOM RI" },
                  { key: "noFabricatedNumbers" as const, label: "Dilarang Mengarang Angka Harga, MOQ, atau Nomor Sertifikat" },
                  { key: "noMedicalClaims" as const, label: "Dilarang Memberi Saran Medis atau Klaim Pengobatan" },
                  { key: "mandatoryCpkbEducation" as const, label: "Selalu Edukasi Standar Pabrik CPKB, ISO 22716 & Halal" },
                  { key: "noCompetitorBash" as const, label: "Dilarang Menjelekkan Pabrik atau Brand Kompetitor" },
                ].map((g) => (
                  <label
                    key={g.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "#fff",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: "1px solid #f0ebe7",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={config.guardrails[g.key]}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          guardrails: { ...config.guardrails, [g.key]: e.target.checked },
                        })
                      }
                    />
                    <span>{g.label}</span>
                  </label>
                ))}
              </div>

              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: "#a3352f", marginBottom: 6 }}>
                Daftar Klaim Terlarang (Overclaim yang Diblokir):
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {config.guardrails.forbiddenClaims.map((claim, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "#fff",
                      border: "1px solid #f0d5d3",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 12,
                    }}
                  >
                    <span>⛔ {claim}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = config.guardrails.forbiddenClaims.filter((_, i) => i !== idx);
                        setConfig({ ...config, guardrails: { ...config.guardrails, forbiddenClaims: next } });
                      }}
                      style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="text"
                  placeholder="Tambah klaim terlarang..."
                  value={newForbiddenClaim}
                  onChange={(e) => setNewForbiddenClaim(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newForbiddenClaim.trim()) return;
                    setConfig({
                      ...config,
                      guardrails: {
                        ...config.guardrails,
                        forbiddenClaims: [...config.guardrails.forbiddenClaims, newForbiddenClaim.trim()],
                      },
                    });
                    setNewForbiddenClaim("");
                  }}
                  style={{
                    border: "1px solid #a8666a",
                    background: "#faeeed",
                    color: "#a8666a",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Tambah
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: LEAD CAPTURE, WA ROUTING, VPS WEBHOOK & RATE LIMIT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>
                Aturan Kualifikasi Lead, Trigger Form (`[[LEAD]]`) & Integrasi VPS WA
              </h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                    Tawarkan Form Setelah N Chat
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={config.leadRules.triggerAfterTurns}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        leadRules: { ...config.leadRules, triggerAfterTurns: Number(e.target.value) },
                      })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>
                    Nomor WhatsApp CS Tujuan
                  </label>
                  <input
                    type="text"
                    value={config.leadRules.whatsappCsNumber}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        leadRules: { ...config.leadRules, whatsappCsNumber: e.target.value },
                      })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
              </div>

              <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, marginBottom: 6 }}>
                Poin Kualifikasi Wajib yang Digali Rara:
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                {config.leadRules.requiredQualificationFields.map((qf, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      background: "#fff",
                      border: "1px solid #e8e2de",
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 12,
                    }}
                  >
                    <span>
                      {idx + 1}. {qf}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = config.leadRules.requiredQualificationFields.filter((_, i) => i !== idx);
                        setConfig({ ...config, leadRules: { ...config.leadRules, requiredQualificationFields: next } });
                      }}
                      style={{ border: "none", background: "transparent", color: "#a3352f", cursor: "pointer" }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder="Tambah pertanyaan kualifikasi..."
                  value={newQualField}
                  onChange={(e) => setNewQualField(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newQualField.trim()) return;
                    setConfig({
                      ...config,
                      leadRules: {
                        ...config.leadRules,
                        requiredQualificationFields: [
                          ...config.leadRules.requiredQualificationFields,
                          newQualField.trim(),
                        ],
                      },
                    });
                    setNewQualField("");
                  }}
                  style={{
                    border: "1px solid #0d6a55",
                    background: "#eaf5f1",
                    color: "#0d6a55",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  + Tambah
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Email Penerima Notifikasi Lead
                  </label>
                  <input
                    type="text"
                    value={config.leadRules.notifyEmailTo}
                    onChange={(e) =>
                      setConfig({ ...config, leadRules: { ...config.leadRules, notifyEmailTo: e.target.value } })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Webhook VPS WA (`POST /api/integrasi/lead`)
                  </label>
                  <input
                    type="text"
                    placeholder="https://wa.sukapost.tech/api/integrasi/lead"
                    value={config.leadRules.vpsWaWebhookUrl}
                    onChange={(e) =>
                      setConfig({ ...config, leadRules: { ...config.leadRules, vpsWaWebhookUrl: e.target.value } })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Rate Limit & Session Guard */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: "0 0 10px" }}>
                Proteksi Sesi & Rate Limit Pengunjung
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Maksimal Balasan per Sesi (`MAX_USER_TURNS`)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={config.leadRules.maxUserTurnsPerSession}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        leadRules: { ...config.leadRules, maxUserTurnsPerSession: Number(e.target.value) },
                      })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                    Batas Request per IP / Menit
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={config.leadRules.ipRateLimitPerMinute}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        leadRules: { ...config.leadRules, ipRateLimitPerMinute: Number(e.target.value) },
                      })
                    }
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12.5 }}
                  />
                </div>
              </div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                Pesan Saat Kuota Sesi Habis:
              </label>
              <input
                type="text"
                value={config.leadRules.sessionLimitMessage}
                onChange={(e) =>
                  setConfig({ ...config, leadRules: { ...config.leadRules, sessionLimitMessage: e.target.value } })
                }
                style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid #e8e2de", fontSize: 12 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUB-TAB 6: LIVE SIMULATOR & AI INSPECTOR
          ==================================================================== */}
      {subTab === "simulator" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 24, alignItems: "start" }}>
          {/* LEFT: INTERACTIVE AVATAR & CHAT PLAYGROUND */}
          <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 16, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Sparkles size={16} style={{ color: "#a8666a" }} />
                <h4 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Live Simulator Tanya Rara</h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimMessages([]);
                  setSimLeadTriggered(false);
                  setSimExtractedLead({ produk: null, jumlah: null, budget: null, launching: null });
                  setSimState("idle");
                }}
                style={{
                  border: "1px solid #e8e2de",
                  background: "#fff",
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <RotateCcw size={11} style={{ display: "inline", marginRight: 4 }} /> Reset Sesi
              </button>
            </div>

            {/* Stage Preview */}
            <div
              style={{
                background: "radial-gradient(ellipse at 50% 35%, #e4d9d7 0%, #ded2d0 60%, #d6c6c4 100%)",
                borderRadius: 14,
                padding: 16,
                textAlign: "center",
                marginBottom: 14,
                position: "relative",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 10,
                  right: 12,
                  fontSize: 10,
                  fontWeight: 800,
                  background: "rgba(255,255,255,0.8)",
                  padding: "3px 8px",
                  borderRadius: 99,
                }}
              >
                State: {simState.toUpperCase()}
              </span>
              <video
                key={simVideoFile}
                src={`/avatar/${simVideoFile}`}
                style={{
                  width: 190,
                  height: 240,
                  objectFit: "cover",
                  borderRadius: 16,
                  margin: "0 auto",
                  display: "block",
                  WebkitMaskImage:
                    "radial-gradient(ellipse 46% 44% at 50% 46%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 96%)",
                }}
                autoPlay
                loop
                muted
                playsInline
              />
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#3a2e2e",
                  margin: "10px auto 4px",
                  maxWidth: 460,
                  lineHeight: 1.4,
                }}
              >
                &ldquo;
                {simMessages.length > 0
                  ? [...simMessages].reverse().find((m) => m.role === "assistant")?.content || config.visual.greeting
                  : config.visual.greeting}
                &rdquo;
              </p>
            </div>

            {/* Quick Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {config.visual.quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => void handleSimulatorSend(chip)}
                  style={{
                    border: "1px solid #e8e2de",
                    background: "#fff",
                    borderRadius: 99,
                    padding: "5px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Chat Transcript */}
            {simMessages.length > 0 && (
              <div
                style={{
                  maxHeight: 200,
                  overflowY: "auto",
                  background: "#fff",
                  border: "1px solid #e8e2de",
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {simMessages.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      background: m.role === "user" ? "#1f1818" : "#faeeed",
                      color: m.role === "user" ? "#fff" : "#1f1818",
                      padding: "7px 12px",
                      borderRadius: 10,
                      fontSize: 12,
                      maxWidth: "82%",
                    }}
                  >
                    <b style={{ display: "block", fontSize: 10, opacity: 0.75, marginBottom: 2 }}>
                      {m.role === "user" ? "Calon Klien" : config.persona.avatarName}
                    </b>
                    {m.content}
                  </div>
                ))}
              </div>
            )}

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSimulatorSend();
              }}
              style={{ display: "flex", gap: 8 }}
            >
              <input
                type="text"
                placeholder="Ketik pesan sebagai calon klien maklon..."
                value={simInput}
                onChange={(e) => {
                  setSimInput(e.target.value);
                  setSimState(e.target.value ? "listening" : "idle");
                }}
                style={{
                  flex: 1,
                  padding: "9px 14px",
                  borderRadius: 99,
                  border: "1px solid #e8e2de",
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                disabled={simSending}
                style={{
                  border: "none",
                  background: "#a8666a",
                  color: "#fff",
                  borderRadius: 99,
                  padding: "9px 18px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Send size={13} /> {simSending ? "..." : "Kirim"}
              </button>
            </form>
          </div>

          {/* RIGHT: REAL-TIME INSPECTOR PANEL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <h4 style={{ fontSize: 14.5, fontWeight: 700, margin: 0 }}>
                  Inspector Ekstraksi Lead & Diagnostik Turn
                </h4>
                {simLatencyMs !== null && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#0d6a55", background: "#eaf5f1", padding: "2px 8px", borderRadius: 99 }}>
                    Latensi: {simLatencyMs} ms
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "#fff", border: "1px solid #f0ebe7", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9c8a8a" }}>PRODUK TERDETEKSI</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1818", marginTop: 2 }}>
                    {simExtractedLead.produk || "— Belum disebut"}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #f0ebe7", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9c8a8a" }}>JUMLAH / MOQ</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1818", marginTop: 2 }}>
                    {simExtractedLead.jumlah || "— Belum disebut"}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #f0ebe7", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9c8a8a" }}>KISARAN BUDGET</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0d6a55", marginTop: 2 }}>
                    {simExtractedLead.budget || "— Belum disebut"}
                  </div>
                </div>
                <div style={{ background: "#fff", border: "1px solid #f0ebe7", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#9c8a8a" }}>TARGET LAUNCHING</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1f1818", marginTop: 2 }}>
                    {simExtractedLead.launching || "— Belum disebut"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: simLeadTriggered ? "#eaf5f1" : "#fff",
                  border: `1px solid ${simLeadTriggered ? "#0d6a55" : "#e8e2de"}`,
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: simLeadTriggered ? "#0d6a55" : "#705e5e",
                }}
              >
                Status Trigger Form Lead (`[[LEAD]]`):{" "}
                {simLeadTriggered ? "✅ AKTIF (Form Nama & WA ditampilkan ke pengunjung)" : "⏳ Menunggu niat komersial / turn ke-" + config.leadRules.triggerAfterTurns}
              </div>

              {simPhoneticLast && (
                <div style={{ marginTop: 10, fontSize: 11.5, color: "#5c4b4b" }}>
                  <b>Output Fonetik TTS:</b> &ldquo;{simPhoneticLast}&rdquo;
                </div>
              )}
            </div>

            {/* Compiled System Prompt Viewer */}
            <div style={{ background: "#faf8f6", border: "1px solid #e8e2de", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                  Compiled System Prompt + Product Knowledge ({compiledPrompt.length} chars)
                </h4>
                <button
                  type="button"
                  onClick={() => setShowPromptModal(!showPromptModal)}
                  style={{
                    border: "1px solid #e8e2de",
                    background: "#fff",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {showPromptModal ? "Sembunyikan" : "Lihat Penuh"}
                </button>
              </div>
              <pre
                style={{
                  maxHeight: showPromptModal ? 420 : 160,
                  overflowY: "auto",
                  background: "#1f1818",
                  color: "#eaf5f1",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 11,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                  margin: 0,
                }}
              >
                {compiledPrompt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
