import { greetingAudio } from "@/lib/greetingAudio";
import { toAvatarId } from "@/lib/avatars";
import { checkLimit } from "@/lib/rateLimit";
import { clientIp } from "@/lib/request";

const IP_MAX = 20;
const IP_WINDOW_MS = 60_000;

/** GET /api/greeting?avatar=mira → the avatar's spoken welcome line (mp3). The text comes from the dashboard, never the client. */
export async function GET(req: Request): Promise<Response> {
  if (!checkLimit(`greeting:${clientIp(req)}`, IP_MAX, IP_WINDOW_MS)) {
    return Response.json({ error: "rate_limited" }, { status: 429 });
  }
  const avatar = toAvatarId(new URL(req.url).searchParams.get("avatar"));
  try {
    const { audio, etag } = await greetingAudio(avatar);
    if (req.headers.get("if-none-match") === `"${etag}"`) return new Response(null, { status: 304 });
    return new Response(new Uint8Array(audio), {
      headers: {
        "content-type": "audio/mpeg",
        etag: `"${etag}"`,
        // Short browser cache plus ETag: a greeting edited in the dashboard reaches visitors within minutes.
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return Response.json({ error: "tts_unavailable" }, { status: 503 });
  }
}
