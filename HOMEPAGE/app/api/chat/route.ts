import { avatarName } from "@/lib/avatars";
import { compileSystemPrompt, getRaraConfig } from "@/lib/raraConfig";
import { streamChat, type ChatMessage } from "@/lib/llm";
import { checkLimit } from "@/lib/rateLimit";
import { redactPhones, stripMarker } from "@/lib/lead";
import { logChat } from "@/lib/supabase";
import { cleanMessages, clientIp, isChatMessage } from "@/lib/request";

const MAX_TOTAL_CHARS = 20_000;
const IP_WINDOW_MS = 60_000;
const SESSION_WINDOW_MS = 6 * 60 * 60_000;
const BUSY_ERROR = "Rara sedang menerima banyak pertanyaan. Coba lagi sebentar ya, Kak.";

/** Passes the reply through unchanged and, once it ends, logs the exchange without phone numbers. */
function logOnFinish(sessionId: string, userText: string): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  let reply = "";
  return new TransformStream({
    transform(chunk, controller) {
      reply += decoder.decode(chunk, { stream: true });
      controller.enqueue(chunk);
    },
    async flush() {
      await logChat([
        { session_id: sessionId, role: "user", content: redactPhones(userText) },
        { session_id: sessionId, role: "assistant", content: redactPhones(stripMarker(reply)) },
      ]).catch(() => {});
    },
  });
}

export async function POST(req: Request): Promise<Response> {
  const cfg = getRaraConfig();
  const maxUserTurns = cfg.leadRules.maxUserTurnsPerSession || 20;
  const maxMessages = 2 * maxUserTurns + 1;
  const ipMax = cfg.leadRules.ipRateLimitPerMinute || 30;
  const limitError =
    cfg.leadRules.sessionLimitMessage ||
    `Sesi demo ini sudah mencapai batas. Silakan lanjut via WhatsApp ${cfg.leadRules.whatsappCsNumber || "0831-3703-0656"}.`;

  const ip = clientIp(req);
  const body = await req.json().catch(() => null);
  const raw = body?.messages;
  const valid = Array.isArray(raw) && raw.length > 0 && raw.length <= maxMessages && raw.every(isChatMessage);
  if (typeof body?.sessionId !== "string" || !valid) {
    return Response.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const messages: ChatMessage[] = raw;
  if (messages.reduce((n, m) => n + m.content.length, 0) > MAX_TOTAL_CHARS) {
    return Response.json({ error: "Percakapan terlalu panjang. Silakan mulai ulang halaman." }, { status: 400 });
  }

  if (messages.filter((m) => m.role === "user").length > maxUserTurns) {
    return Response.json({ error: limitError }, { status: 429 });
  }
  if (!checkLimit(`ip:${ip}`, ipMax, IP_WINDOW_MS)) {
    return Response.json({ error: BUSY_ERROR }, { status: 429 });
  }
  if (!checkLimit(`session:${body.sessionId}`, maxUserTurns, SESSION_WINDOW_MS)) {
    return Response.json({ error: limitError }, { status: 429 });
  }

  try {
    const systemPrompt = compileSystemPrompt(cfg, avatarName(body.avatar));
    const stream = await streamChat(cleanMessages(messages), systemPrompt);
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
    return new Response(stream.pipeThrough(logOnFinish(body.sessionId, lastUser)), {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return Response.json(
      {
        error: `Maaf ${cfg.persona.visitorHonorific || "Kak"}, ${cfg.persona.avatarName || "Rara"} sedang gangguan. Silakan coba lagi atau chat WhatsApp ${cfg.leadRules.whatsappCsNumber || "0831-3703-0656"}.`,
      },
      { status: 502 }
    );
  }
}
