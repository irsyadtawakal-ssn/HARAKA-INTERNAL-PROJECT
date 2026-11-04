"use client";

export class FactoryError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function detailOf(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  // Validasi FastAPI (422) mengirim daftar galat; ambil pesan pertama.
  if (Array.isArray(detail) && typeof detail[0]?.msg === "string") return detail[0].msg;
  return `Permintaan gagal (HTTP ${status}).`;
}

/** Panggil backend Factory lewat proxy /api/factory. Pesan `detail` dari backend dipakai apa adanya. */
export async function factory<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/factory/${path.replace(/^\/+/, "")}`, {
      method: opts.method ?? "GET",
      headers: opts.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      cache: "no-store",
    });
  } catch {
    throw new FactoryError(0, "Koneksi terputus. Cek jaringan lalu coba lagi.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new FactoryError(res.status, detailOf(data, res.status));
  return data as T;
}
