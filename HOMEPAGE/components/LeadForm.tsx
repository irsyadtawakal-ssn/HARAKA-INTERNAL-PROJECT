"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/llm";
import { extractPhone } from "@/lib/lead";
import { getSessionId } from "@/lib/session";

type Props = { defaultPhone: string | null; messages: ChatMessage[]; onSubmitted(name: string): void };

export default function LeadForm({ defaultPhone, messages, onSubmitted }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  // The form usually opens before the visitor says their number in chat; follow it until they edit the field.
  useEffect(() => {
    if (!phoneTouched && defaultPhone) setPhone(defaultPhone);
  }, [defaultPhone, phoneTouched]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Nama belum diisi, Kak.");
    if (!extractPhone([phone])) return setError("Nomor WhatsApp sepertinya belum benar, Kak.");
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId: getSessionId(), name: name.trim(), whatsapp: phone, messages }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        setError(err?.error ?? "Gagal mengirim. Coba lagi ya, Kak.");
        return;
      }
      onSubmitted(name.trim());
    } catch {
      setError("Koneksi terputus. Coba lagi ya, Kak.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form className="leadform" onSubmit={submit} noValidate>
      <label>
        <span>Nama</span>
        <input id="lead-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </label>
      <label>
        <span>Nomor WhatsApp</span>
        <input id="lead-wa" value={phone} onChange={(e) => { setPhoneTouched(true); setPhone(e.target.value); }} inputMode="tel" autoComplete="tel" placeholder="08…" />
      </label>
      <button type="submit" disabled={sending}>Kirim</button>
      <p className="consent">
        Dengan mengirim, Kakak setuju dihubungi tim Haraka Erfi. <a href="/privasi" target="_blank">Kebijakan privasi</a>
      </p>
      {error && <p className="leadform-error" role="alert">{error}</p>}
    </form>
  );
}
