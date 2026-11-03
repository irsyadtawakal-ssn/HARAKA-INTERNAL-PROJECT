"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Mic, RotateCcw, SendHorizontal, Volume2, VolumeX } from "lucide-react";
import type { ThreadItem, useConversation } from "@/lib/controller";
import type { AvatarState } from "@/lib/avatarState";
import WhatsAppCta, { type WhatsAppContact } from "./WhatsAppCta";
import ProductCard, { mentionedCategories, type ProductCategory } from "./ProductCard";

const CHIPS = ["Berapa MOQ?", "Bisa urus BPOM?", "Berapa lama prosesnya?"];
const STATUS: Record<AvatarState, string> = {
  idle: "Online · Virtual Assistant Haraka Erfi",
  listening: "Mendengarkan…",
  thinking: "Sedang mengetik…",
  speaking: "Sedang berbicara…",
};

// Shown one after another while the first words of a reply are on their way, so a slow model does not feel stuck.
const WAIT_STEPS: [number, string][] = [
  [0, "Rara sedang membaca pertanyaan Kakak…"],
  [3000, "Mengecek katalog & data pabrik…"],
  [7000, "Menyusun jawaban terbaik…"],
  [12000, "Sebentar lagi ya, Kak…"],
];
const MAX_CARDS = 2;

const clock = (at?: number) =>
  at ? new Date(at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";

function Waiting() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = WAIT_STEPS.slice(1).map(([ms], i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="msg msg-typing" data-role="assistant" role="status">
      <span className="dots" aria-hidden="true"><i /><i /><i /></span>
      <span className="wait-text">{WAIT_STEPS[step][1]}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      // Clipboard blocked (insecure origin or permission): nothing to do.
    }
  };
  return (
    <button type="button" className="msg-copy" onClick={copy} aria-label={done ? "Tersalin" : "Salin jawaban"} title="Salin jawaban">
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

/** Product cards per reply: each category once, under the first reply that brings it up. */
function cardsByMessage(thread: ThreadItem[], products: ProductCategory[]): Map<number, ProductCategory[]> {
  const shown = new Set<string>();
  const out = new Map<number, ProductCategory[]>();
  for (const m of thread) {
    if (m.role !== "assistant" || m.tone || m.id === 0) continue;
    const fresh = mentionedCategories(m.content, products).filter((c) => !shown.has(c.id)).slice(0, MAX_CARDS);
    fresh.forEach((c) => shown.add(c.id));
    if (fresh.length) out.set(m.id, fresh);
  }
  return out;
}

type Props = { conv: ReturnType<typeof useConversation>; whatsapp: WhatsAppContact; products?: ProductCategory[] };

export default function Conversation({ conv, whatsapp, products = [] }: Props) {
  const [draft, setDraft] = useState("");
  const cards = useMemo(() => cardsByMessage(conv.thread, products), [conv.thread, products]);
  const log = useRef<HTMLDivElement>(null);
  const listening = conv.micActive;
  const asked = conv.thread.some((m) => m.role === "user");

  // Follow the newest message, including while a reply streams in.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [conv.thread, conv.streaming, conv.showWhatsApp]);

  const ask = (text: string) => {
    conv.userGestured();
    void conv.send(text);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft("");
    ask(text);
  };

  return (
    <div className="chat">
      <header className="chat-head">
        <img className="chat-avatar" src="/avatar/placeholder.jpg" alt="" />
        <div className="chat-who">
          <b>Rara</b>
          <span className="chat-status" data-state={conv.state}>{STATUS[conv.state]}</span>
        </div>
        <button
          type="button"
          className="chat-reset"
          onClick={conv.toggleVoice}
          aria-pressed={conv.voiceOn}
          aria-label={conv.voiceOn ? "Matikan suara Rara" : "Nyalakan suara Rara"}
          title={conv.voiceOn ? "Matikan suara Rara" : "Nyalakan suara Rara"}
        >
          {conv.voiceOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        {asked && (
          <button type="button" className="chat-reset" onClick={conv.reset} aria-label="Mulai percakapan baru" title="Mulai percakapan baru">
            <RotateCcw size={16} />
          </button>
        )}
      </header>

      <div className="chat-log" ref={log} role="log" aria-live="polite" aria-label="Riwayat percakapan dengan Rara">
        {conv.thread.map((m) => (
          <div key={m.id} className="msg-row" data-role={m.role}>
            <div className="msg" data-role={m.role} data-tone={m.tone}>
              {m.content}
            </div>
            <div className="msg-meta">
              {m.at && <time dateTime={new Date(m.at).toISOString()}>{clock(m.at)}</time>}
              {m.role === "assistant" && m.id !== 0 && !m.tone && <CopyButton text={m.content} />}
            </div>
            {cards.get(m.id)?.map((c) => (
              <ProductCard
                key={c.id}
                category={c}
                contact={whatsapp}
                messages={conv.messages}
                logged={conv.leadDone}
                onOpen={conv.whatsappOpened}
              />
            ))}
          </div>
        ))}
        {conv.streaming !== null && (
          conv.streaming ? <div className="msg" data-role="assistant">{conv.streaming}</div> : <Waiting />
        )}
        {conv.showWhatsApp && (
          <div className="msg-card">
            <WhatsAppCta contact={whatsapp} messages={conv.messages} logged={conv.leadDone} onOpen={conv.whatsappOpened} />
          </div>
        )}
      </div>

      <footer className="chat-foot">
        {!asked && (
          <div className="chips">
            {CHIPS.map((c) => (
              <button key={c} type="button" className="chip" onClick={() => ask(c)}>{c}</button>
            ))}
          </div>
        )}
        <form className="inputbar" onSubmit={submit}>
          <input
            value={draft}
            placeholder="Ketik atau tekan mic…"
            aria-label="Pertanyaan untuk Rara"
            onChange={(e) => {
              const next = e.target.value;
              if (draft === "" && next !== "") conv.typing(true);
              else if (draft !== "" && next === "") conv.typing(false);
              setDraft(next);
            }}
          />
          {conv.micSupported && (
            <button
              type="button"
              className="icon-btn mic"
              data-active={listening}
              aria-label={listening ? "Matikan mic" : "Nyalakan mic"}
              onClick={() => (listening ? conv.stopMic() : conv.startMic())}
            >
              <Mic size={18} />
            </button>
          )}
          <button type="submit" className="icon-btn send" aria-label="Kirim pesan" disabled={!draft.trim()}>
            <SendHorizontal size={18} />
          </button>
        </form>
      </footer>
    </div>
  );
}
