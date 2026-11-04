# Studio Konten — Rombak Layout Tab Pembuatan Konten

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tab Pembuatan Konten di dashboard Rara terasa seperti studio produksi konten. Dalam sekali lihat, owner tahu apa yang bisa dibuat, konten mana yang sedang jalan dan di tahap apa, kenapa klip antri, dan 3 video apa yang akan jadi.

**Architecture:** `ContentStudioTab` tetap memegang data dan polling (perilaku Task 4 plan sebelumnya tidak berubah). Tampilannya dipecah jadi 4 komponen di `HOMEPAGE/components/dashboard/studio/`:
- `StudioHeader`: status kuota, mesin Flow, dan proses.
- `CreatePanel`: form buat konten.
- `ProjectBoard`: daftar proyek konten.
- `ProjectDetail`: panel detail satu proyek.

Logika tampilan (langkah progres, pengelompokan 3 video, kategori filter, status mesin) berupa fungsi murni di `lib/contentStudio.ts` supaya bisa diuji tanpa DOM. Satu-satunya perubahan sisi server: proxy mengizinkan `GET render-devices` agar status mesin Flow bisa ditampilkan.

**Tech Stack:** Next.js 15.5 (HOMEPAGE), React 19, Vitest + Testing Library, lucide-react, `dashboard.module.css`.

**Spec:** `docs/superpowers/specs/2026-11-03-tab-pembuatan-konten-design.md` (§3 alur, §3.2 tipe, §3.3 satuan kerja 3 hook, §3.4 gerbang). Plan ini hanya mengubah tampilan dari `docs/superpowers/plans/2026-11-04-dashboard-rara-satu-pusat.md` Task 4.

## Layout

```
┌ Studio Konten ─────────────────────────────────────────────────────────────┐
│ [Kuota 26/30 klip]  [Mesin Flow ● Online / ○ Offline]  [2 diproses · 1 perlu keputusan] │
├───────────────────────────┬────────────────────────────────────────────────┤
│ BUAT KONTEN (sticky)      │ PROYEK KONTEN                                   │
│ 1 Referensi: grid thumb   │ [Semua] [Diproses] [Perlu keputusan] [Siap] [Gagal] │
│   + kotak unggah          │ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│ 2 Tipe: 3 kartu + ikon,   │ │thumb ref │ │          │ │          │          │
│   durasi, isi             │ │Video Ads │ │  ...     │ │  ...     │          │
│ 3 Target funnel A/B       │ │●●◐○ 2/5  │ │          │ │          │          │
│ Ringkasan: 3 video ·      │ │5 mnt lalu│ │          │ │          │          │
│   5 klip kuota            │ └──────────┘ └──────────┘ └──────────┘          │
│ [Generate]                │                                                 │
└───────────────────────────┴────────────────────────────────────────────────┘
Klik kartu → panel kanan (drawer, 520px): progres 4 langkah, kotak keputusan klaim,
Video 1/2/3 (hook + pemutar/status klip), body+CTA bersama, daftar klip + render ulang.
```

- Desktop (≥1100px): grid `340px minmax(0,1fr)` dengan gap 20px. Panel kiri `position: sticky; top: 16px`.
- Di bawah 1100px: satu kolom. Panel Buat Konten di atas dan bisa dilipat lewat tombol "Konten baru".
- Di bawah 768px: kartu proyek 1 kolom, dan drawer jadi lebar penuh.

## Global Constraints

- Semua teks UI berbahasa Indonesia. Label dan tombol tanpa titik di akhir.
- Perilaku yang sudah diuji tetap sama:
  - polling 5 dtk hanya selama ada job aktif, dan berhenti saat tab tersembunyi;
  - Generate tidak bisa dobel;
  - detail 422 dari backend tampil apa adanya;
  - keputusan klaim lewat `content-jobs/{id}/claim-decision`;
  - URL klip diperbarui saat `<video>` error;
  - hook tanpa dialog menampilkan `overlay_text`.
- Proxy tetap menolak `POST/PATCH render-devices` (404). Yang dibuka hanya `GET render-devices`, yang isinya tanpa token.
- Mesin Flow dianggap **Online** bila ada device `is_active` dengan `last_seen_at` ≤ 2 menit lalu. Extension memperbarui nilai ini di setiap panggilan, kira-kira tiap 1–2 dtk.
- Satu Generate = 3 video (spec §3.3):
  - Video Ads / Talking Head: video N = `hookN` + `body` + `cta`, dengan kuota 5 klip.
  - Hard Sell: video N = `hookN` + `cta`, dengan kuota 4 klip.
- Hanya satu tombol utama (gelap) per tampilan, yaitu **Generate**. Tombol lain sekunder.
- Warna dan komponen ikut `dashboard.module.css` (panelCard, btnPrimary, btnSecondary, badgeSuccess, badgeWarning). Warna baru ditambahkan sebagai kelas di file CSS itu, bukan hex lepas di banyak tempat.

## Review Focus

1. **Job lama tanpa `content_slot`** (render job yang dibuat manual di Fase 1). Klip itu tetap tampil di "Klip lain", tidak hilang dan tidak bikin crash. → Task 2.
2. **Setelah klaim disetujui, job punya dua set klip** (versi alternatif dan versi asli, dengan `content_slot` sama). Video N menampilkan klip terbaru per slot. Klip lama tetap ada di daftar klip. → Task 2.
3. **Belum ada device terdaftar, atau `render-devices` gagal dimuat.** Header menampilkan "Mesin Flow: belum terhubung", bukan error merah yang menutupi studio. → Task 3.
4. **Drawer terbuka saat polling memperbarui job.** Isi drawer ikut terbarui dan tidak menutup sendiri. → Task 4.
5. **Layar HP 375px.** Tidak ada scroll horizontal, kartu tipe turun jadi satu kolom, dan drawer lebar penuh. → Task 5 (cek manual di browser).

---

### Task 1: Proxy membuka status mesin Flow (GET saja)

**Files:**
- Modify: `HOMEPAGE/app/api/factory/[...path]/route.ts`
- Test: `HOMEPAGE/tests/api/factory.test.ts`

**Interfaces:**
- Produces: `GET /api/factory/render-devices` → `[{id, name, is_active, last_seen_at}]`. POST/PATCH ke path itu → 404.

- [ ] **Step 1: Tulis tes gagal:**
  - `allows GET render-devices`: status 200, dan `factoryFetch` dipanggil dengan `"render-devices"`.
  - `rejects POST render-devices`: status 404, dan `factoryFetch` tidak dipanggil.
  - Kasus `["render-devices"]` dikeluarkan dari `it.each` "rejects paths outside allowlist", karena GET sekarang sah. Penolakan POST diuji di tes di atas.
- [ ] **Step 2:** `cd HOMEPAGE && npx vitest run tests/api/factory.test.ts`. Expected: FAIL pada `allows GET render-devices`.
- [ ] **Step 3:** Tambahkan `READ_ONLY = /^render-devices$/`. Path ini lolos hanya bila `req.method === "GET"`.
- [ ] **Step 4:** Jalankan ulang tesnya. Expected: semua lulus.
- [ ] **Step 5: Commit** `feat(dashboard): status mesin Flow lewat proxy (GET render-devices)`.

### Task 2: Helper tampilan studio

**Files:**
- Modify: `HOMEPAGE/lib/contentStudio.ts`
- Test: `HOMEPAGE/tests/lib/contentStudio.test.ts`

**Interfaces:**
- Produces:
  - `type StepState = "done" | "active" | "todo" | "failed"`.
  - `jobSteps(job: ContentJob): { key: "analysis" | "script" | "render" | "ready"; label: string; state: StepState; detail?: string }[]`. Label: `"Analisis referensi"`, `"Tulis script"`, `"Render di Flow"`, `"Klip siap"`. `detail` untuk render berisi `"2/5 klip"`.
  - `type VideoPlan = { index: 1 | 2 | 3; hookSlot: "hook1" | "hook2" | "hook3"; hookText: string | null; clips: RenderJob[]; missing: string[] }`.
  - `groupVideos(job: ContentJob, script?: Script): { videos: VideoPlan[]; shared: { body: string | null; cta: string | null }; others: RenderJob[] }`.
  - `type ProjectFilter = "all" | "processing" | "decision" | "ready" | "failed"`, plus `projectCategory(job): Exclude<ProjectFilter, "all">`. Urutan prioritas: `failed` (job gagal, atau render selesai dengan ada klip gagal) → `decision` (`isClaimPending`) → `ready` (semua klip `done`) → `processing`.
  - `flowStatus(devices: {is_active: boolean; last_seen_at: string | null}[], now: Date): "online" | "offline" | "none"`.
  - `timeAgo(iso: string, now: Date): string`, dengan format `"baru saja"`, `"5 menit lalu"`, `"3 jam lalu"`, `"2 hari lalu"`.
  - `CONTENT_TYPES` ditambah `clips: number` (5, 5, 4) dan `summary: string`:
    - Video Ads: `"Hook → B-roll produk/pabrik → CTA"`;
    - Talking Head: `"Avatar bicara: hook, isi, CTA"`;
    - Hard Sell: `"Tawaran langsung + CTA WA"`.

- [ ] **Step 1: Tulis tes gagal** (pakai helper `job()`/`clip()` yang sudah ada di file tes):
  - `jobSteps` untuk `analyzing` → `["active","todo","todo","todo"]`.
  - `jobSteps` untuk `rendering` dengan 2 dari 5 klip `done` → `["done","done","active","todo"]`, dan detail render `"2/5 klip"`.
  - `jobSteps` untuk `failed` tanpa script → langkah analisis `failed`.
  - `jobSteps` untuk `failed` dengan `script_id` terisi → langkah script `failed`.
  - `jobSteps` bila semua klip `done` → keempat langkah `done`.
  - `groupVideos` video_ads (5 klip) → video 1 berisi slot `["hook1","body","cta"]`, dan `hookText` diambil dari `script.hooks` (`dialog || overlay_text`).
  - `groupVideos` hard_sell → video 2 berisi `["hook2","cta"]`.
  - `groupVideos` dengan dua klip `hook1` → video 1 memakai yang `created_at` terbaru (Review Focus 2).
  - `groupVideos` dengan klip `content_slot: null` → masuk `others` (Review Focus 1).
  - `groupVideos` belum ada klip → `missing` berisi slot yang belum ada.
  - `projectCategory`: masing-masing satu kasus untuk `failed`, `decision`, `ready`, dan `processing`.
  - `flowStatus`:
    - last_seen 30 dtk lalu → `"online"`;
    - 10 menit lalu → `"offline"`;
    - list kosong → `"none"`;
    - device `is_active: false` yang baru terlihat → tidak dihitung.
  - `timeAgo`: masing-masing satu kasus untuk keempat format.
- [ ] **Step 2:** `npx vitest run tests/lib/contentStudio.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasi.
- [ ] **Step 4:** Jalankan ulang tesnya. Expected: semua lulus.
- [ ] **Step 5: Commit** `feat(dashboard): helper progres, 3 video, dan status mesin untuk studio`.

### Task 3: `StudioHeader` dan `CreatePanel`

**Files:**
- Create: `HOMEPAGE/components/dashboard/studio/StudioHeader.tsx`
- Create: `HOMEPAGE/components/dashboard/studio/CreatePanel.tsx`
- Modify: `HOMEPAGE/app/dashboard/dashboard.module.css` (kelas `studio*`)
- Test: `HOMEPAGE/tests/components/studio/StudioHeader.test.tsx`, `HOMEPAGE/tests/components/studio/CreatePanel.test.tsx`

**Interfaces:**
- Produces:
  - `StudioHeader(props: { quota: Quota | null; flow: "online" | "offline" | "none" | "unknown"; counts: Record<Exclude<ProjectFilter,"all">, number> })`.
  - `CreatePanel(props: { references: AssetRecord[]; processing: AssetRecord[]; refId: string | null; onPickRef(id: string): void; type: ContentType; onType(t: ContentType): void; funnel: "A"|"B"; onFunnel(f: "A"|"B"): void; license: LicenseStatus | ""; onLicense(l: LicenseStatus): void; onUpload(file: File): void; uploadProgress: number | null; uploadError: string | null; formError: string | null; submitting: boolean; onGenerate(): void })`. Komponen ini tanpa state data; semua state tetap di `ContentStudioTab`.
- Isi `StudioHeader` (3 kotak ringkas):
  - "Kuota hari ini": `remaining / limit klip`.
  - "Mesin render Flow": Online (hijau), Offline (kuning, dengan keterangan "Klip menunggu sampai mesin online"), atau "Belum terhubung" untuk `none`/`unknown`.
  - "Proyek": `N diproses · M perlu keputusan`.
- Isi `CreatePanel`:
  - Referensi berupa grid thumbnail 3 kolom (`thumbnail_url`, atau ikon bila kosong) dengan nama file dan badge izin. Thumbnail terpilih diberi border aksen. Aset yang masih diproses tampil redup dengan label "Diproses…" dan tidak bisa dipilih.
  - Kotak unggah berupa ubin terakhir di grid, dengan select izin di bawahnya.
  - Tipe berupa 3 kartu (ikon lucide `Megaphone` / `UserRound` / `BadgePercent`, label, durasi, `summary`).
  - Target berupa 2 kartu: "A · Calon brand pemula" dan "B · Owner brand existing".
  - Ringkasan sebelum tombol: `"Hasil: 3 video · memakai {clips} klip kuota"`. Bila mesin offline, tambahkan `"Mesin Flow offline — klip akan antri."`.

- [ ] **Step 1: Tulis tes gagal:**
  - `StudioHeader shows offline machine`: `flow="offline"` → teks "Offline" dan "Klip menunggu sampai mesin online".
  - `StudioHeader handles no device`: `flow="none"` → "Belum terhubung" (Review Focus 3).
  - `CreatePanel summary follows type`: `type="hard_sell"` → "memakai 4 klip kuota".
  - `CreatePanel processing asset not selectable`: klik aset processing → `onPickRef` tidak dipanggil.
  - `CreatePanel generate calls once`: klik Generate → `onGenerate` dipanggil 1×; dengan `submitting=true` tombol nonaktif.
- [ ] **Step 2:** `npx vitest run tests/components/studio`. Expected: FAIL.
- [ ] **Step 3:** Implementasi kedua komponen dan kelas CSS (`studioGrid`, `studioSide`, `studioStat`, `refGrid`, `refTile`, `refTileActive`, `typeCard`, `typeCardActive`).
- [ ] **Step 4:** Jalankan ulang tesnya. Expected: lulus.
- [ ] **Step 5: Commit** `feat(dashboard): header status dan panel buat konten untuk studio`.

### Task 4: `ProjectBoard`, `ProjectDetail`, dan perakitan di `ContentStudioTab`

**Files:**
- Create: `HOMEPAGE/components/dashboard/studio/ProjectBoard.tsx`
- Create: `HOMEPAGE/components/dashboard/studio/ProjectDetail.tsx`
- Modify: `HOMEPAGE/components/dashboard/ContentStudioTab.tsx`
- Modify: `HOMEPAGE/app/dashboard/dashboard.module.css`
- Test: `HOMEPAGE/tests/components/studio/ProjectBoard.test.tsx`, `HOMEPAGE/tests/components/ContentStudioTab.test.tsx` (diperbarui)

**Interfaces:**
- Consumes: semua helper Task 2, serta `StudioHeader` dan `CreatePanel` dari Task 3.
- Produces:
  - `ProjectBoard(props: { jobs: ContentJob[]; assets: Record<string, AssetRecord>; filter: ProjectFilter; onFilter(f: ProjectFilter): void; onOpen(id: string): void; now: Date })`.
  - `ProjectDetail(props: { job: ContentJob; script?: Script; reference?: AssetRecord; clipUrls: Record<string,string>; onClipError(assetId: string): void; onDecide(d: "approve"|"reject", note: string): void; onRetryJob(): void; onRetryClip(clipId: string): void; busy: Record<string, boolean>; error?: string; onClose(): void })`.
- Isi `ProjectBoard`:
  - Tab filter dengan jumlah (`Semua 4`, `Diproses 2`, …).
  - Grid kartu `repeat(auto-fill, minmax(220px, 1fr))`. Isi kartu: thumbnail referensi (rasio 4:5), badge kategori, judul `"{Tipe} · {Target}"`, `timeAgo`, dan progres mini 4 titik dari `jobSteps`.
  - Kosong: "Belum ada konten. Pilih referensi di kiri lalu Generate.", atau "Tidak ada konten di filter ini." bila sedang difilter.
- Isi `ProjectDetail` (drawer kanan, 520px, lebar penuh di <768px; pola dialog sama dengan AssetLibraryTab):
  - header berisi thumbnail referensi, judul, dan waktu;
  - progres 4 langkah horizontal;
  - error job, plus tombol "Ulangi job" bila gagal;
  - kotak "Klaim baru perlu keputusan" (Setujui/Tolak + catatan);
  - 3 kolom **Video 1/2/3**: kalimat hook, lalu urutan klip `hookN → body → cta` sebagai ubin 9:16. Ubin berisi `<video>` bila `done`, dan status (Antri/Generate di Flow/…) bila belum. Tombol "Render ulang" muncul bila klip gagal;
  - "Dipakai di ketiga video": body dan CTA;
  - "Klip lain" bila `others` tidak kosong.
- `ContentStudioTab` merakit semuanya:
  - layout `studioGrid` (kiri `CreatePanel`, kanan `ProjectBoard`) dan `StudioHeader` di atas;
  - state `filter` dan `openId`;
  - `GET render-devices` dimuat saat mount dan ikut di-refresh di setiap siklus polling. Bila gagal, status = `"unknown"`;
  - Setelah Generate berhasil, drawer job baru langsung terbuka.
  - Drawer membaca job dari `jobs` berdasarkan `openId`, jadi ikut terbarui saat polling (Review Focus 4).

- [ ] **Step 1: Tulis tes gagal:**
  - `ProjectBoard filters by category`: 2 job (`analyzing` dan `failed`), klik tab "Gagal" → `onFilter("failed")`. Dengan `filter="failed"` hanya 1 kartu tampil.
  - `ProjectBoard empty state`.
  - Di `ContentStudioTab.test.tsx`, pertahankan semua tes lama (ganti selector bila struktur berubah, bukan perilakunya) dan tambahkan:
    - `opens detail with three videos`: job `rendering` dengan script → klik kartu → muncul "Video 1", "Video 2", "Video 3", dan teks hook 1.
    - `detail stays open while polling`: job aktif, drawer terbuka, maju 5 dtk → drawer masih ada dan label progres terbarui.
    - `shows flow offline from devices`: `render-devices` membalas device dengan last_seen 10 menit lalu → "Offline".
    - `opens new job after generate`: POST sukses → drawer job baru terbuka.
  - Pindahkan tes `claim decision`, `refresh clip URL`, dan `hook without dialog` agar membuka drawer dulu.
- [ ] **Step 2:** `npx vitest run tests/components`. Expected: tes baru FAIL.
- [ ] **Step 3:** Implementasi kedua komponen, rakit `ContentStudioTab`, lalu hapus markup lama yang sudah tergantikan.
- [ ] **Step 4:** `npx vitest run`, `npx tsc --noEmit` (abaikan 2 error lama di `controller.test.tsx`), dan `npx eslint components/dashboard lib`. Expected: bersih.
- [ ] **Step 5: Commit** `feat(dashboard): studio konten dengan papan proyek dan panel detail 3 video`.

### Task 5: Header dashboard dan cek visual

**Files:**
- Modify: `HOMEPAGE/app/dashboard/page.tsx` (header atas)

- [ ] **Step 1:** Saat `activeMenu === "content_studio"`:
  - judul header jadi `"Studio Konten"`;
  - toggle funnel (Semua/A/B), "Live Sync", dan "Export CSV" disembunyikan, karena hanya berlaku untuk Leads/Overview;
  - label menu sidebar jadi "Studio Konten".
  
  Lakukan hal yang sama untuk `asset_library` (judul "Asset Library").
- [ ] **Step 2: Cek manual** di browser lokal (`npm --prefix HOMEPAGE run dev`, backend lokal :8010), di lebar 1440px, 1024px, dan 375px:
  - tidak ada scroll horizontal;
  - panel kiri sticky di desktop;
  - kartu proyek dan drawer tampil;
  - drawer lebar penuh di 375px.
  
  Ambil screenshot tiap lebar.
- [ ] **Step 3:** `npx vitest run`. Expected: semua lulus.
- [ ] **Step 4: Commit** `feat(dashboard): header khusus Studio Konten dan Asset Library`.

## Di luar plan ini

- Deploy ke VPS (setelah user setuju), dengan cara yang sama seperti plan sebelumnya Task 6 Step 3.
- Gerbang 2 / review video jadi (Fase 3 Remotion) nanti menjadi langkah ke-5 "Review video" di progres dan kolom "Video jadi" di drawer.
