import { NextResponse, type NextRequest } from "next/server";
import { apiUrl } from "@/lib/server/api";
import { sameOrigin } from "@/lib/server/same-origin";
import { SESSION_COOKIE } from "@/lib/session";

/**
 * Proxy browser -> FastAPI. Browser hanya memegang cookie httpOnly; token dipasang di sini sebagai
 * header Authorization. Hanya path yang memang dipakai dashboard yang diteruskan.
 */
const ALLOWED = /^(assets(\/[\w-]+)*|auth\/me|users(\/[\w-]+)?)$/;

async function handle(req: NextRequest, ctx: RouteContext<"/api/backend/[...path]">) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  if (!ALLOWED.test(joined)) return NextResponse.json({ detail: "Tidak ditemukan." }, { status: 404 });
  if (req.method !== "GET" && !sameOrigin(req)) return NextResponse.json({ detail: "Permintaan tidak valid." }, { status: 403 });

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ detail: "Sesi berakhir. Silakan login kembali." }, { status: 401 });

  let res: Response;
  try {
    res = await fetch(apiUrl(joined) + req.nextUrl.search, {
      method: req.method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ detail: "Server API tidak bisa dihubungi." }, { status: 502 });
  }

  const out = new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
  });
  if (res.status === 401) out.cookies.delete(SESSION_COOKIE);
  return out;
}

export { handle as GET, handle as POST, handle as PATCH };
