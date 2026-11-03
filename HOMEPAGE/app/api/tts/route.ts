import { synthesize } from "@/lib/tts";
import { stripMarker } from "@/lib/lead";
import { checkLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/request";

const MAX_CHARS = 600;
const IP_MAX = 20;
const IP_WINDOW_MS = 60_000;

export async function POST(req: Request): Promise<Response> {
  if (!checkLimit(`tts:${clientIp(req)}`, IP_MAX, IP_WINDOW_MS)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (typeof body?.text !== "string" || body.text.length > MAX_CHARS) {
    return Response.json({ error: "invalid_text" }, { status: 400 });
  }
  const text = stripMarker(body.text);
  if (!text) return Response.json({ error: "invalid_text" }, { status: 400 });

  try {
    const audio = await synthesize(text);
    return new Response(audio, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "tts_unavailable" }, { status: 503 });
  }
}
