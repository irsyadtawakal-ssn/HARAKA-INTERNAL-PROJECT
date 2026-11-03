import { NextResponse, type NextRequest } from "next/server";
import { apiUrl } from "@/lib/server/api";
import { sameOrigin } from "@/lib/server/same-origin";
import { SESSION_COOKIE, SESSION_MAX_AGE_S } from "@/lib/session";

/** Login: kredensial diteruskan ke FastAPI, token disimpan di cookie httpOnly (tidak pernah bisa dibaca JavaScript). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ detail: "Permintaan tidak valid." }, { status: 403 });
  const body = await req.text();
  let res: Response;
  try {
    res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Server API tidak bisa dihubungi. Cek apakah backend berjalan." }, { status: 502 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data.detail === "string" ? data.detail : "Email atau password salah.";
    return NextResponse.json({ detail }, { status: res.status === 422 ? 400 : res.status });
  }
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SESSION_COOKIE, data.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_S,
  });
  return out;
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ detail: "Permintaan tidak valid." }, { status: 403 });
  const out = NextResponse.json({ ok: true });
  out.cookies.delete(SESSION_COOKIE);
  return out;
}
