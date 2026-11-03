import type { LeadSummary } from "./supabase";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendLeadEmail(lead: { name: string; whatsapp: string; summary: LeadSummary }): Promise<void> {
  const { RESEND_API_KEY, LEAD_EMAIL_TO, LEAD_EMAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !LEAD_EMAIL_TO || !LEAD_EMAIL_FROM) throw new Error("Email is not configured");

  const digits = lead.whatsapp.replace(/\D/g, "");
  const waLink = `https://wa.me/62${digits.replace(/^0/, "")}`;
  const s = lead.summary;
  const rows = [
    ["Nama", lead.name],
    ["WhatsApp", digits],
    ["Produk", s.produk ?? "-"],
    ["Jumlah", s.jumlah ?? "-"],
    ["Budget", s.budget ?? "-"],
    ["Target launching", s.launching ?? "-"],
  ];
  const html = `<h2>Lead baru dari Rara</h2><table>${rows.map(([k, v]) => `<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("")}</table>
<p><a href="${esc(waLink)}">Chat WhatsApp ${esc(lead.name)}</a></p>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({ from: LEAD_EMAIL_FROM, to: LEAD_EMAIL_TO.split(",").map((e) => e.trim()), subject: `Lead baru: ${lead.name}`, html }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
}
