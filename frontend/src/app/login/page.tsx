import type { Metadata } from "next";
import { Suspense } from "react";
import { Wordmark } from "@/components/wordmark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Wordmark size="lg" />
        <p className="mt-6 text-ink-soft">Masuk dengan akun yang dibuatkan Owner.</p>
        {/* LoginForm membaca ?next dari URL, jadi dirender di balik Suspense (halaman tetap static shell). */}
        <Suspense fallback={<div className="mt-6 h-[268px] rounded-xl border border-line bg-surface" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
