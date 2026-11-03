"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Field, inputClass } from "@/components/field";

export function LoginForm() {
  const raw = useSearchParams().get("next");
  // Hanya path internal yang boleh jadi tujuan setelah login (cegah open redirect).
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/aset";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    }).catch(() => null);
    if (res?.ok) {
      window.location.href = next;
      return;
    }
    const data = await res?.json().catch(() => null);
    setError(data?.detail ?? "Tidak bisa terhubung ke server. Cek koneksi lalu coba lagi.");
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-line bg-surface p-6">
      <Field label="Email">
        <input name="email" type="email" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Password">
        <input name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {error && (
        <p role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-pigment-failed">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-berry px-4 py-2.5 font-semibold text-white transition-colors hover:bg-berry-deep disabled:opacity-60"
      >
        {busy ? "Memeriksa…" : "Masuk"}
      </button>
    </form>
  );
}
