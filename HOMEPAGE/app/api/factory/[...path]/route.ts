import { NextResponse } from "next/server";
import { factoryFetch, FactoryConfigError } from "@/lib/factory";
import { sameOrigin } from "@/lib/sameOrigin";

/**
 * Proxy dashboard -> backend Factory. Browser tidak pernah memegang token Factory; server login sebagai owner.
 * Akses manusia dijaga password nginx (lokasi /api/factory). Hanya path yang dipakai dashboard yang diteruskan.
 */
const ALLOWED =
  /^(assets(\/[\w-]+)*|content-jobs(\/[\w-]+)*|render-jobs\/quota|render-jobs\/[\w-]+(\/retry)?|scripts\/[\w-]+|settings\/content-llm)$/;

// Hanya baca: status mesin render (tanpa token). Membuat/mengubah device tetap lewat backend langsung.
const READ_ONLY = /^render-devices$/;

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  const joined = path.join("/");
  const allowed = ALLOWED.test(joined) || (req.method === "GET" && READ_ONLY.test(joined));
  if (!allowed) return NextResponse.json({ detail: "Tidak ditemukan." }, { status: 404 });
  if (req.method !== "GET" && !sameOrigin(req)) return NextResponse.json({ detail: "Permintaan tidak valid." }, { status: 403 });

  let res: Response;
  try {
    res = await factoryFetch(joined, {
      method: req.method,
      search: new URL(req.url).search,
      body: req.method === "GET" ? undefined : await req.text(),
    });
  } catch (e) {
    if (e instanceof FactoryConfigError) {
      return NextResponse.json({ detail: "Dashboard belum tersambung ke Factory (FACTORY_* belum diisi)." }, { status: 503 });
    }
    return NextResponse.json({ detail: "Server Factory tidak bisa dihubungi." }, { status: 502 });
  }

  return new NextResponse(await res.text(), {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json", "Cache-Control": "no-store" },
  });
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH };
