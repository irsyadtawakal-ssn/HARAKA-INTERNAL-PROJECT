import fs from "node:fs";
import path from "node:path";
import { completeChat, type ChatMessage } from "@/lib/llm";
import { extractPhone, heuristicLeadSummary } from "@/lib/lead";
import { saveLead, type LeadSummary } from "@/lib/supabase";
import { sendLeadEmail } from "@/lib/notify";
import { checkLimit } from "@/lib/rateLimit";
import { cleanMessages, clientIp } from "@/lib/request";
import { getRaraConfig } from "@/lib/raraConfig";

const LEAD_MAX = 3;
const LEAD_WINDOW_MS = 10 * 60_000;

const SUMMARY_PROMPT = `Ringkas kebutuhan calon klien maklon kosmetik dari percakapan berikut.
Balas HANYA dengan JSON: {"produk": string|null, "jumlah": string|null, "budget": string|null, "launching": string|null}.
Isi null bila tidak disebut. Jangan menebak.`;

async function summarise(messages: ChatMessage[]): Promise<LeadSummary> {
  try {
    const transcript = messages.map((m) => `${m.role === "user" ? "Klien" : "Rara"}: ${m.content}`).join("\n");
    const raw = await completeChat([{ role: "user", content: transcript }], SUMMARY_PROMPT);
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const json = JSON.parse(raw.slice(start, end + 1));
      const pick = (k: keyof LeadSummary) => (typeof json[k] === "string" && json[k].trim() ? json[k].trim() : null);
      return { produk: pick("produk"), jumlah: pick("jumlah"), budget: pick("budget"), launching: pick("launching") };
    }
  } catch {
    // fallback heuristic extraction below
  }
  return heuristicLeadSummary(messages);
}

function saveLeadLocally(row: {
  name: string;
  whatsapp: string;
  summary: LeadSummary;
  transcript: { role: string; content: string }[];
  session_id: string;
}) {
  if (process.env.NODE_ENV === "test") return;
  try {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, "rara-leads.json");
    const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
    const entry = {
      ...row,
      created_at: new Date().toISOString(),
    };
    fs.writeFileSync(file, JSON.stringify([entry, ...existing], null, 2), "utf8");
  } catch (e) {
    console.error("Failed to save local lead:", e);
  }
}

export async function POST(req: Request): Promise<Response> {
  const cfg = getRaraConfig();
  if (!checkLimit(`lead:${clientIp(req)}`, LEAD_MAX, LEAD_WINDOW_MS)) {
    return Response.json(
      { error: `Terlalu banyak percobaan. Silakan chat WhatsApp ${cfg.leadRules.whatsappCsNumber || "0831-3703-0656"}.` },
      { status: 429 }
    );
  }
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  const whatsapp = typeof body?.whatsapp === "string" ? extractPhone([body.whatsapp]) : null;
  const messages: ChatMessage[] = cleanMessages(body?.messages).slice(-41);
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId : "";

  if (!name) return Response.json({ error: "Nama wajib diisi." }, { status: 400 });
  if (!whatsapp) return Response.json({ error: "Nomor WhatsApp tidak valid." }, { status: 400 });

  const summary = await summarise(messages);
  const leadRecord = { name, whatsapp, summary, transcript: messages, session_id: sessionId };

  saveLeadLocally(leadRecord);
  try {
    await saveLead(leadRecord);
  } catch {
    if (process.env.NODE_ENV === "test" || process.env.SUPABASE_URL) {
      return Response.json(
        { error: `Gagal menyimpan. Silakan chat WhatsApp ${cfg.leadRules.whatsappCsNumber || "0831-3703-0656"}.` },
        { status: 500 }
      );
    }
  }
  try {
    await sendLeadEmail({ name, whatsapp, summary });
  } catch {
    // Email is best-effort
  }

  if (cfg.leadRules.vpsWaWebhookUrl) {
    fetch(cfg.leadRules.vpsWaWebhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.leadRules.vpsWaWebhookSecret ? { "x-webhook-secret": cfg.leadRules.vpsWaWebhookSecret } : {}),
      },
      body: JSON.stringify({
        source: "tanya_rara",
        ...leadRecord,
        created_at: new Date().toISOString(),
      }),
    }).catch(() => {});
  }

  return Response.json({ ok: true, summary }, { status: 201 });
}
