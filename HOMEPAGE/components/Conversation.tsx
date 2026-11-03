"use client";

import { useState } from "react";
import type { useConversation } from "@/lib/controller";
import LeadForm from "./LeadForm";

const CHIPS = ["Berapa MOQ?", "Bisa urus BPOM?", "Berapa lama prosesnya?"];
const WA_LINK = "https://wa.me/6283137030656";

type Props = { conv: ReturnType<typeof useConversation> };

export default function Conversation({ conv }: Props) {
  const [draft, setDraft] = useState("");
  const listening = conv.micActive;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    conv.userGestured();
    const text = draft;
    setDraft("");
    void conv.send(text);
  };

  return (
    <div className="conversation">
      <p className="say" aria-live="polite">{conv.line}</p>
      {conv.showLeadForm && (
        <LeadForm defaultPhone={conv.chatPhone} messages={conv.messages} onSubmitted={conv.leadSubmitted} />
      )}
      {conv.leadDone && (
        <a className="wa-button" href={WA_LINK} target="_blank" rel="noreferrer">Chat WhatsApp sekarang</a>
      )}
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c} type="button" className="chip" onClick={() => { conv.userGestured(); void conv.send(c); }}>
            {c}
          </button>
        ))}
      </div>
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
            className="mic"
            data-active={listening}
            aria-label={listening ? "Matikan mic" : "Nyalakan mic"}
            onClick={() => (listening ? conv.stopMic() : conv.startMic())}
          />
        )}
      </form>
      <small className="credit">Suara oleh ElevenLabs</small>
    </div>
  );
}
