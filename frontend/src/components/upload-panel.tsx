"use client";

import { CheckCircle2, CircleAlert, LoaderCircle, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/client";
import { FUNNEL_LABEL, LICENSE_LABEL, formatBytes } from "@/lib/labels";
import type { AssetFunnel, LicenseStatus } from "@/lib/types";
import { ACCEPTED_MIMES, uploadAsset, type UploadDefaults } from "@/lib/upload";
import { Field, inputClass } from "./field";

type ItemState = "waiting" | "uploading" | "saving" | "done" | "error";

interface QueueItem {
  key: string;
  file: File;
  /** Pengaturan batch saat file ditambahkan; mengubah form sesudahnya tidak mengubah file yang sudah antre. */
  defaults: UploadDefaults;
  state: ItemState;
  progress: number;
  error?: string;
}

const MAX_PARALLEL = 2;

/**
 * Panel unggah: pengaturan bawaan untuk satu batch (funnel, izin, kreator), area tarik-lepas,
 * dan antrean dengan progres per file. File juga bisa dilepas di mana saja di halaman.
 */
export function UploadPanel({ open, onOpenChange, onUploaded }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploaded: () => void;
}) {
  const [defaults, setDefaults] = useState<UploadDefaults>({ funnel: null, license_status: "unknown", creator_name: "" });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Antrean kerja di luar state React: file menunggu + jumlah yang sedang berjalan.
  const pending = useRef<QueueItem[]>([]);
  const running = useRef(0);

  const update = useCallback(
    (key: string, patch: Partial<QueueItem>) => setQueue((q) => q.map((it) => (it.key === key ? { ...it, ...patch } : it))),
    [],
  );

  // Paling banyak MAX_PARALLEL "pekerja"; tiap pekerja mengambil file berikutnya dari antrean sampai habis.
  const pump = useCallback(() => {
    const worker = async () => {
      while (pending.current.length) {
        const it = pending.current.shift()!;
        update(it.key, { state: "uploading" });
        try {
          await uploadAsset(it.file, it.defaults, (p) => update(it.key, { progress: p, state: p >= 1 ? "saving" : "uploading" }));
          update(it.key, { state: "done", progress: 1 });
          onUploaded();
        } catch (e) {
          update(it.key, { state: "error", error: e instanceof ApiError ? e.message : "Upload gagal. Coba unggah ulang file ini." });
        }
      }
      running.current -= 1;
    };
    while (running.current < MAX_PARALLEL && pending.current.length) {
      running.current += 1;
      void worker();
    }
  }, [update, onUploaded]);

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const items = Array.from(files).map<QueueItem>((file) => {
        const supported = ACCEPTED_MIMES.includes(file.type);
        return {
          key: `${file.name}-${file.size}-${crypto.randomUUID()}`,
          file,
          defaults,
          state: supported ? "waiting" : "error",
          progress: 0,
          error: supported ? undefined : "Format tidak didukung. Gunakan MP4, MOV, JPG, PNG, atau WebP.",
        };
      });
      if (!items.length) return;
      setQueue((q) => [...q, ...items]);
      onOpenChange(true);
      pending.current.push(...items.filter((it) => it.state === "waiting"));
      pump();
    },
    [onOpenChange, pump, defaults],
  );

  // Tarik file ke mana saja di jendela -> panel terbuka dengan area lepas.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth += 1;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragging(false);
    };
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault();
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [addFiles]);

  const active = queue.some((it) => it.state === "waiting" || it.state === "uploading" || it.state === "saving");

  return (
    <>
      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6">
          <div className="rounded-xl border-2 border-dashed border-white bg-ink/70 px-10 py-8 text-center text-white">
            <Upload className="mx-auto size-8" aria-hidden />
            <p className="mt-3 text-lg font-semibold">Lepas untuk mengunggah</p>
            <p className="text-white/80">Video MP4/MOV atau foto JPG/PNG/WebP</p>
          </div>
        </div>
      )}

      {open && (
        <section aria-label="Unggah aset" className="mb-8 rounded-xl border border-line bg-surface">
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Unggah aset</h2>
              <p className="text-sm text-ink-soft">Pengaturan di bawah berlaku untuk semua file yang diunggah sekarang. Bisa diubah per aset nanti.</p>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={active}
              title={active ? "Tunggu sampai semua upload selesai" : "Tutup panel"}
              className="rounded-lg p-2 text-ink-soft hover:bg-well hover:text-ink disabled:opacity-40"
            >
              <X className="size-[18px]" aria-hidden />
              <span className="sr-only">Tutup panel</span>
            </button>
          </div>

          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="space-y-4">
              <Field label="Funnel">
                <select
                  className={inputClass}
                  value={defaults.funnel ?? ""}
                  onChange={(e) => setDefaults({ ...defaults, funnel: (e.target.value || null) as AssetFunnel | null })}
                >
                  <option value="">Belum ditentukan</option>
                  {(Object.keys(FUNNEL_LABEL) as AssetFunnel[]).map((f) => (
                    <option key={f} value={f}>{FUNNEL_LABEL[f]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Izin pakai" hint="Aset dengan izin belum jelas tidak bisa disetujui untuk iklan atau landing page.">
                <select
                  className={inputClass}
                  value={defaults.license_status}
                  onChange={(e) => setDefaults({ ...defaults, license_status: e.target.value as LicenseStatus })}
                >
                  {(Object.keys(LICENSE_LABEL) as LicenseStatus[]).map((l) => (
                    <option key={l} value={l}>{LICENSE_LABEL[l]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kreator / sumber footage">
                <input
                  className={inputClass}
                  placeholder="Contoh: Tim produksi pabrik"
                  value={defaults.creator_name}
                  maxLength={120}
                  onChange={(e) => setDefaults({ ...defaults, creator_name: e.target.value })}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-porcelain px-6 py-8 text-center transition-colors hover:border-berry hover:bg-berry-wash"
              >
                <Upload className="size-7 text-berry" aria-hidden />
                <span className="font-semibold">Tarik file ke sini atau pilih dari komputer</span>
                <span className="text-sm text-ink-soft">Video MP4/MOV sampai 2 GB, foto JPG/PNG/WebP sampai 25 MB</span>
              </button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED_MIMES.join(",")}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />

              {queue.length > 0 && (
                <ul className="divide-y divide-line rounded-lg border border-line" aria-live="polite">
                  {queue.map((it) => (
                    <QueueRow key={it.key} item={it} />
                  ))}
                </ul>
              )}
              {queue.length > 0 && !active && (
                <button type="button" onClick={() => setQueue([])} className="self-end text-sm font-medium text-ink-soft hover:text-ink">
                  Bersihkan daftar
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function QueueRow({ item }: { item: QueueItem }) {
  const pct = Math.round(item.progress * 100);
  const status: Record<ItemState, React.ReactNode> = {
    waiting: <span className="text-ink-faint">Menunggu giliran</span>,
    uploading: <span className="text-ink-soft">{pct}%</span>,
    saving: (
      <span className="inline-flex items-center gap-1 text-ink-soft">
        <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> Menyimpan
      </span>
    ),
    done: (
      <span className="inline-flex items-center gap-1 text-pigment-approved">
        <CheckCircle2 className="size-3.5" aria-hidden /> Terunggah
      </span>
    ),
    error: (
      <span className="inline-flex items-center gap-1 text-pigment-failed">
        <CircleAlert className="size-3.5" aria-hidden /> Gagal
      </span>
    ),
  };
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="min-w-0 truncate font-medium" title={item.file.name}>{item.file.name}</span>
        <span className="shrink-0 text-[13px]">{status[item.state]}</span>
      </div>
      {(item.state === "uploading" || item.state === "saving") && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-well" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progres ${item.file.name}`}>
          <div className="h-full bg-berry transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      )}
      {item.state === "error" && <p className="mt-1 text-[13px] text-pigment-failed">{item.error}</p>}
      {item.state !== "error" && <p className="text-[12px] text-ink-faint">{formatBytes(item.file.size)}</p>}
    </li>
  );
}
