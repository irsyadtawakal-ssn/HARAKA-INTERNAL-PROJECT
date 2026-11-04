"use client";

import type { ChatMessage } from "@/lib/llm";
import { heuristicLeadSummary } from "@/lib/lead";
import { getSessionId } from "@/lib/session";
import { trackPixel } from "@/lib/metaPixel";

export type WhatsAppContact = { number: string; prefill: string };

type Props = { contact: WhatsAppContact; messages: ChatMessage[]; logged: boolean; onOpen(): void };

/** 0831-3703-0656 → 6283137030656, the form wa.me expects. */
export function toWaNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("0") ? "62" + digits.slice(1) : digits;
}

/** The prefill template plus what the visitor already told Rara, so CS does not have to ask again. */
export function buildWaText(prefill: string, messages: ChatMessage[], interest?: string): string {
  const s = heuristicLeadSummary(messages);
  const details = [
    interest && `Tertarik: ${interest}`,
    // A card names the product itself; the guessed one from chat could contradict it.
    !interest && s.produk && `Produk: ${s.produk}`,
    s.jumlah && `Jumlah: ${s.jumlah}`,
    s.budget && `Budget: ${s.budget}`,
    s.launching && `Target launching: ${s.launching}`,
  ].filter(Boolean);
  return details.length ? `${prefill}\n\n${details.join("\n")}` : prefill;
}

export function waHref(contact: WhatsAppContact, messages: ChatMessage[], interest?: string): string {
  return `https://wa.me/${toWaNumber(contact.number)}?text=${encodeURIComponent(buildWaText(contact.prefill, messages, interest))}`;
}

/** Logs the click as a lead once per conversation; sendBeacon survives the tab switching to WhatsApp. */
export function logWhatsAppClick(messages: ChatMessage[], logged: boolean, interest?: string) {
  if (logged) return;
  trackPixel("Lead", { content_name: interest || "Chat via WhatsApp", content_category: "Maklon kosmetik" });
  const body = JSON.stringify({ source: "whatsapp_click", sessionId: getSessionId(), messages });
  navigator.sendBeacon?.("/api/lead", new Blob([body], { type: "application/json" }));
}

export default function WhatsAppCta({ contact, messages, logged, onOpen }: Props) {
  const href = waHref(contact, messages);

  const open = () => {
    logWhatsAppClick(messages, logged);
    onOpen();
  };

  return (
    <div className="wa-cta">
      <a className="wa-button" href={href} target="_blank" rel="noreferrer" onClick={open}>
        Chat via WhatsApp
      </a>
      <p className="consent">Langsung terhubung ke tim Haraka Erfi di {contact.number}.</p>
    </div>
  );
}
