// Khusus server: memegang token owner Factory. Jangan diimpor dari komponen "use client".

export class FactoryConfigError extends Error {
  constructor() {
    super("FACTORY_API_URL, FACTORY_EMAIL, dan FACTORY_PASSWORD wajib diisi di .env.local");
  }
}

export type FactoryInit = { method?: string; body?: string; search?: string };

let token: string | null = null;

function config() {
  const base = (process.env.FACTORY_API_URL ?? "").replace(/\/+$/, "");
  const email = process.env.FACTORY_EMAIL ?? "";
  const password = process.env.FACTORY_PASSWORD ?? "";
  if (!base || !email || !password) throw new FactoryConfigError();
  return { base, email, password };
}

async function login(): Promise<string> {
  const { base, email, password } = config();
  const res = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Login Factory gagal (HTTP ${res.status}).`);
  const data = (await res.json()) as { access_token: string };
  token = data.access_token;
  return token;
}

/** Panggil API Factory sebagai owner. Token yang kedaluwarsa (401) diperbarui sekali lalu permintaan diulang. */
export async function factoryFetch(path: string, init: FactoryInit = {}): Promise<Response> {
  const { base } = config();
  const url = `${base}/${path.replace(/^\/+/, "")}${init.search ?? ""}`;
  const send = (t: string) =>
    fetch(url, {
      method: init.method ?? "GET",
      headers: { Authorization: `Bearer ${t}`, "Content-Type": "application/json" },
      body: init.body,
      cache: "no-store",
    });
  const res = await send(token ?? (await login()));
  if (res.status !== 401) return res;
  return send(await login());
}

export function resetFactoryToken(): void {
  token = null;
}
