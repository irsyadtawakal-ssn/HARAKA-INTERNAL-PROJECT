# Dashboard Rara Jadi Satu Pusat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pembuatan Konten dan Asset Library bisa dipakai langsung dari dashboard Rara (`faq.harakaerfi.com/dashboard`), tersambung ke backend Factory, sehingga tim cukup membuka satu dashboard.

**Architecture:**
- Browser hanya berbicara dengan server Next.js HOMEPAGE.
- Route `app/api/factory/[...path]` meneruskan permintaan ke FastAPI Factory (`127.0.0.1:8010`) memakai token owner. Token itu didapat server dengan login sendiri dan tidak pernah sampai ke browser.
- Akses manusia tetap dijaga password nginx yang sudah ada.
- File (upload dan pemutaran video) lewat presigned URL S3 yang dilayani di domain yang sama: nginx `faq.harakaerfi.com/harka-assets/` → zenko `127.0.0.1:9010`. Karena satu domain, tidak perlu DNS baru dan tidak perlu CORS untuk dashboard.
- Mockup `content_studio` dan `asset_library` di `app/dashboard/page.tsx` diganti dua komponen tab baru, mengikuti pola `RaraSettingsTab`.

**Tech Stack:** Next.js 15.5 (HOMEPAGE), Vitest + Testing Library + jsdom, FastAPI + pytest (backend), nginx.

**Spec:** `docs/superpowers/specs/2026-11-03-tab-pembuatan-konten-design.md`. Plan ini menggantikan keputusan "build di `frontend/` pada `/konten`" (spec §1). Sekarang pusatnya dashboard Rara, sesuai keputusan user 2026-11-04. Isi alur (§3), peran (§3.5), dan gerbang (§3.4) tetap.

## Prasyarat

- Fase 2 (branch `feat/content-brain`) sudah di-commit lengkap, lulus `uv run pytest`, dan di-merge ke `main`. Branch itu sekarang masih punya perubahan yang belum di-commit di `analysis.py`, `pipeline.py`, `writer.py`, `routers/content.py`, serta tiga file tes. Selesaikan itu dulu. Plan ini memakai endpoint `/content-jobs` dari fase 2.
- Kerjakan plan ini di worktree baru dari `main`, bukan di checkout utama. Sesi lain bisa sedang mengedit HOMEPAGE.

## Global Constraints

- Pilot: semua aksi dipegang `owner` (spec §3.5). Server HOMEPAGE login ke Factory sebagai satu akun owner dari env `FACTORY_EMAIL` dan `FACTORY_PASSWORD`.
- Token Factory dan password owner hanya ada di server (`.env.local`, mode 600). Jangan dikirim ke browser, ditulis di log, atau di-commit.
- Proxy hanya meneruskan path di allowlist ini:
  `^(assets(\/[\w-]+)*|content-jobs(\/[\w-]+)*|render-jobs\/quota|render-jobs\/[\w-]+(\/retry)?|scripts\/[\w-]+|settings\/content-llm)$`.
  `users`, `render-devices`, `flow/*`, dan `auth/*` tidak boleh lewat proxy.
- Metode tulis (POST/PUT/PATCH) ditolak 403 bila header `Origin` beda host. Pakai logika `sameOrigin` yang sama dengan `frontend/src/lib/server/same-origin.ts`.
- Pesan error dari backend (`detail`) ditampilkan apa adanya ke user. Semua teks UI berbahasa Indonesia.
- Klaim baru wajib lewat keputusan owner (spec §3.4). UI tidak boleh punya jalan pintas yang melewati `claim-decision`.
- Kuota: tampilkan `remaining` dari `GET render-jobs/quota`. UI tidak menghitung kuota sendiri.
- Batas upload mengikuti backend: foto 25 MB, video 2 GB. nginx `client_max_body_size` untuk `/harka-assets/` = `2100M`.
- Jangan sentuh maklon-control-room (pm2 port 3000). Saat deploy HOMEPAGE, folder `data/` di server dipertahankan.

## Review Focus

1. **Token Factory kedaluwarsa** (TTL 12 jam) saat dashboard terbuka lama. Proxy harus login ulang sekali secara otomatis dan mengulang permintaan; user tidak boleh melihat 401. → Task 2.
2. **Generate diklik dua kali cepat-cepat.** Hasilnya hanya satu `content_job`. Tombol nonaktif selama request berjalan. → Task 4.
3. **Polling.** Daftar job diperbarui tiap 5 detik hanya selama ada job aktif (`queued`/`analyzing`/`writing`/`rendering`, atau klip yang belum `done`/`failed`). Polling berhenti bila tidak ada job aktif, dan juga saat tab lain dibuka. → Task 4.
4. **Referensi ditolak backend** (lisensi `unknown`, foto orang tanpa izin, video belum selesai diproses). Pesan 422 dari backend tampil di form, dan job tidak dianggap terbuat. → Task 4.
5. **Browser ikut mengirim header Basic Auth ke `/harka-assets/`.** Upload dan pemutaran video tetap jalan, karena location ini berada di luar area password dan dicek dengan upload sungguhan. → Task 6.

---

### Task 1: Endpoint baca script

UI perlu menampilkan 3 hook, body, dan CTA. Sekarang `ContentJobOut` hanya membawa `script_id`.

**Files:**
- Modify: `backend/app/schemas.py` (tambah `ScriptOut`)
- Modify: `backend/app/routers/content.py`
- Test: `backend/tests/test_content_api.py`

**Interfaces:**
- Produces: `GET /scripts/{script_id}` → `ScriptOut {id, funnel, duration_s, headline, caption, hooks: list[{slot, dialog, overlay_text}], body, cta, shot_list, version, parent_script_id, status, created_at}`. Hanya owner (`can_manage_content`). 404 `"Script tidak ditemukan."`.

- [ ] **Step 1: Tulis tes gagal** di `test_content_api.py`:
  - `test_get_script_returns_hooks`: job yang sudah melewati writer → `GET /scripts/{job.script_id}` 200, `len(hooks) == 3`, dan `hooks[0]` punya key `slot`, `dialog`, `overlay_text`.
  - `test_get_script_404`: id acak → 404 dengan detail `"Script tidak ditemukan."`.
  - `test_get_script_forbidden_for_creator`: token peran `creator` → 403.
- [ ] **Step 2:** `cd backend && uv run pytest tests/test_content_api.py -k get_script -v`. Expected: FAIL 404 pada route (route belum ada).
- [ ] **Step 3:** Tambah `ScriptOut` (`from_attributes=True`) dan route `get_script` di `routers/content.py`.
- [ ] **Step 4:** Jalankan tes yang sama. Expected: 3 passed. Lalu `uv run pytest`. Expected: semua lulus.
- [ ] **Step 5: Commit** `feat(content): endpoint GET /scripts/{id} untuk dashboard`.

### Task 2: Klien Factory di server HOMEPAGE

**Files:**
- Create: `HOMEPAGE/lib/factory.ts`
- Test: `HOMEPAGE/tests/lib/factory.test.ts`

**Interfaces:**
- Produces:
  - `factoryFetch(path: string, init?: { method?: string; body?: string; search?: string }): Promise<Response>`. Memasang `Authorization: Bearer <token>`, dengan `cache: "no-store"`.
  - `class FactoryConfigError extends Error`. Dilempar bila `FACTORY_API_URL`, `FACTORY_EMAIL`, atau `FACTORY_PASSWORD` kosong.
  - `resetFactoryToken(): void`. Hanya untuk tes.
- Token disimpan di variabel modul. Login lewat `POST {FACTORY_API_URL}/auth/login` dengan body `{email, password}`. Jika permintaan dibalas 401: login ulang **satu kali** lalu ulangi permintaan. Kalau masih 401, kembalikan respons apa adanya.

- [ ] **Step 1: Tulis tes gagal** (pola mock `fetch` seperti `tests/api/chat.test.ts`):
  - `logs in once for two calls`: dua kali `factoryFetch("assets")` → `fetch` ke `/auth/login` hanya dipanggil 1×.
  - `re-logins once on 401 then retries`: respons pertama 401, login kedua sukses, ulangan 200 → hasil 200, login dipanggil 2×.
  - `gives up after second 401`: dua 401 berturut-turut → status 401, tanpa loop.
  - `throws FactoryConfigError when env missing`.
  - `never puts the password in the request URL`.
- [ ] **Step 2:** `cd HOMEPAGE && npx vitest run tests/lib/factory.test.ts`. Expected: FAIL, modul tidak ditemukan.
- [ ] **Step 3:** Implementasi `lib/factory.ts` dengan `import "server-only"` bila paketnya ada. Kalau tidak ada, cukup komentar bahwa modul ini khusus server.
- [ ] **Step 4:** Jalankan tes yang sama. Expected: 5 passed.
- [ ] **Step 5: Commit** `feat(dashboard): klien server ke backend Factory dengan login otomatis`.

### Task 3: Proxy `/api/factory/[...path]`

**Files:**
- Create: `HOMEPAGE/app/api/factory/[...path]/route.ts`
- Create: `HOMEPAGE/lib/sameOrigin.ts` (salin logika `frontend/src/lib/server/same-origin.ts`)
- Create: `HOMEPAGE/lib/factoryClient.ts`, helper sisi browser:
  - `factory<T>(path, {method, body}): Promise<T>`;
  - `class FactoryError {status, message}`, dengan `message` diambil dari `detail`.
- Test: `HOMEPAGE/tests/api/factory.test.ts`

**Interfaces:**
- Consumes: `factoryFetch` (Task 2).
- Produces: `GET|POST|PUT|PATCH /api/factory/<path>?<query>`, yang meneruskan status, body, dan `content-type`, dengan header `Cache-Control: no-store`. Galat jaringan → 502 `{"detail":"Server Factory tidak bisa dihubungi."}`. `FactoryConfigError` → 503 `{"detail":"Dashboard belum tersambung ke Factory (FACTORY_* belum diisi)."}`.

- [ ] **Step 1: Tulis tes gagal:**
  - `forwards allowed GET with query`: `GET /api/factory/assets?type=photo` → `factoryFetch` dipanggil dengan `"assets"` dan search `?type=photo`.
  - `rejects paths outside allowlist`: masing-masing `users`, `render-devices`, `flow/claim`, `auth/login`, `assets/../users` → 404.
  - `rejects cross-origin write`: POST `content-jobs` dengan `Origin: https://evil.test` → 403.
  - `maps network failure to 502`, dan `maps missing config to 503`.
- [ ] **Step 2:** `npx vitest run tests/api/factory.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasi route memakai regex allowlist dari Global Constraints. Untuk `PUT settings/content-llm` dan `POST`, body diteruskan sebagai teks.
- [ ] **Step 4:** Jalankan tes yang sama. Expected: semua lulus. Lalu `npm test`. Expected: seluruh suite HOMEPAGE lulus.
- [ ] **Step 5: Commit** `feat(dashboard): proxy /api/factory dengan allowlist dan cek origin`.

### Task 4: Tab Pembuatan Konten

Menggantikan blok mockup `activeMenu === "content_studio"` (`app/dashboard/page.tsx` mulai baris ±1077). Data contoh dan `generateNewHook` yang hanya dipakai blok itu ikut dihapus.

**Files:**
- Create: `HOMEPAGE/lib/contentStudio.ts`, helper murni:
  - `isJobActive(job): boolean`;
  - `jobStageLabel(job): string`;
  - `slotLabel(slot): string`;
  - `CONTENT_TYPES` = `[{value:"video_ads",label:"Video Ads",hint:"15–30 dtk"},{value:"talking_head",label:"Talking Head",hint:"15–30 dtk"},{value:"hard_sell",label:"Hard Sell",hint:"maks 15 dtk"}]`.
- Create: `HOMEPAGE/lib/factoryUpload.ts`, berisi `uploadAsset(file, {funnel, license_status, creator_name}, onProgress)`. Alurnya: `assets/upload-url` → PUT XHR ke `upload_url` → `assets/{id}/complete`. Port dari `frontend/src/lib/upload.ts` dengan memakai `factory()`.
- Create: `HOMEPAGE/components/dashboard/ContentStudioTab.tsx`
- Modify: `HOMEPAGE/app/dashboard/page.tsx`
- Test: `HOMEPAGE/tests/lib/contentStudio.test.ts`, `HOMEPAGE/tests/components/ContentStudioTab.test.tsx`

**Interfaces:**
- Consumes: `factory()` (Task 3). Endpoint yang dipakai:
  - `GET render-jobs/quota`;
  - `GET assets?type=photo` dan `GET assets?type=video`;
  - `POST content-jobs {type, funnel, reference_asset_id}`;
  - `GET content-jobs`;
  - `GET scripts/{id}` (Task 1);
  - `GET assets/{result_asset_id}` untuk `original_url`;
  - `POST content-jobs/{id}/claim-decision {decision, note}`;
  - `POST content-jobs/{id}/retry`;
  - `POST render-jobs/{id}/retry`.

Isi tab, dari atas ke bawah:
1. **Kuota hari ini:** "Sisa N dari L klip hari ini".
2. **Buat konten:**
   - pilih referensi dari aset yang sudah ada, atau upload baru (lisensi wajib dipilih saat upload);
   - pilih tipe (3 kartu) dan funnel A/B;
   - tombol **Generate**.
3. **Daftar job** (terbaru di atas). Tiap job menampilkan:
   - tipe, funnel, label tahap, dan error bila gagal;
   - bila `claim_approval_id` terisi dan masih menunggu: kotak "Klaim baru perlu keputusan" dengan tombol **Setujui** dan **Tolak** serta catatan opsional;
   - 3 hook (dialog + teks overlay), body, dan CTA dari script;
   - grid klip per `content_slot`, berisi status, pesan tahap, `<video controls>` bila `done`, tombol **Render ulang** bila `failed`, dan tombol **Ulangi job** bila job `failed`.

- [ ] **Step 1: Tulis tes gagal** `contentStudio.test.ts`:
  - `isJobActive` → true untuk `analyzing`;
  - `isJobActive` → true untuk `rendering` dengan satu klip `generating`;
  - `isJobActive` → false untuk `rendering` bila semua klip `done`/`failed`;
  - `isJobActive` → false untuk `failed`;
  - `jobStageLabel` mengembalikan `"Menganalisis referensi"`, `"Menulis script"`, `"Render klip 2/5"`, dan `"Klip siap"`.
- [ ] **Step 2:** `npx vitest run tests/lib/contentStudio.test.ts`. Expected: FAIL.
- [ ] **Step 3:** Implementasi `lib/contentStudio.ts`. Jalankan ulang tesnya. Expected: PASS.
- [ ] **Step 4: Tulis tes gagal** `ContentStudioTab.test.tsx`, dengan `fetch` di-mock per path dan fake timers:
  - `shows remaining quota`: quota `{limit:30, used:4, remaining:26}` → teks "Sisa 26 dari 30 klip hari ini".
  - `generate disabled until reference chosen`.
  - `double click creates one job`: dua klik **Generate** → POST `content-jobs` hanya 1×.
  - `shows backend 422 detail`: POST dibalas 422 dengan `"Lisensi referensi belum jelas. Lengkapi izin sebelum dipakai."` → teks itu tampil dan daftar job tidak bertambah.
  - `shows claim decision when pending`: job dengan `claim_approval_id` → tombol **Setujui** ada; klik → POST `content-jobs/{id}/claim-decision` dengan `{"decision":"approve"}`.
  - `polls while active and stops when idle`: job `analyzing` → `GET content-jobs` dipanggil lagi setelah 5 detik; setelah respons berisi job `failed`, tidak ada panggilan baru setelah 10 detik berikutnya.
- [ ] **Step 5:** `npx vitest run tests/components/ContentStudioTab.test.tsx`. Expected: FAIL.
- [ ] **Step 6:** Implementasi `factoryUpload.ts` dan `ContentStudioTab.tsx`. Ganti blok mockup di `page.tsx` dengan `{activeMenu === "content_studio" && <ContentStudioTab />}`, lalu hapus state dan data yang tidak dipakai lagi. Gaya visual mengikuti `RaraSettingsTab` dan `dashboard.module.css`.
- [ ] **Step 7:** `npx vitest run`, `npx tsc --noEmit`, dan `npm run lint`. Expected: semua bersih.
- [ ] **Step 8: Commit** `feat(dashboard): tab Pembuatan Konten tersambung ke Factory`.

### Task 5: Tab Asset Library

Menggantikan blok mockup `activeMenu === "asset_library"` (±baris 1405). Ini langkah pertama memindahkan isi `frontend/` ke dashboard Rara.

**Files:**
- Create: `HOMEPAGE/components/dashboard/AssetLibraryTab.tsx`
- Modify: `HOMEPAGE/app/dashboard/page.tsx`
- Test: `HOMEPAGE/tests/components/AssetLibraryTab.test.tsx`

**Interfaces:**
- Consumes: `factory()` (Task 3) dan `uploadAsset` (Task 4).
- Endpoint yang dipakai:
  - `GET assets?type=&funnel=&license_status=&limit=24&offset=`, yang membalas `{items,total}`;
  - `GET assets/{id}`;
  - `PATCH assets/{id}` untuk `license_status`, `funnel`, `creator_name`, `notes`.
- Fitur:
  - grid thumbnail (`thumbnail_url`) dengan filter tipe, funnel, dan lisensi;
  - upload (drag & drop, progres per file);
  - panel detail untuk pratinjau `original_url`, ubah lisensi/funnel, dan menampilkan klip turunan (`parent_asset_id`) hasil render Flow.
- Label dan filter mengikuti `frontend/src/lib/labels.ts`. Salin isinya ke `HOMEPAGE/lib/assetLabels.ts`.

- [ ] **Step 1: Tulis tes gagal:**
  - `lists assets with total`: 2 item, `total: 2` → 2 kartu dan teks "2 aset".
  - `filter sends query`: pilih tipe Foto → `GET assets?type=photo...`.
  - `unknown license is flagged`: aset `license_status: "unknown"` → badge "Lisensi belum jelas".
  - `edit license patches asset`: ubah ke `internal` → PATCH `assets/{id}` dengan body `{"license_status":"internal"}`.
- [ ] **Step 2:** `npx vitest run tests/components/AssetLibraryTab.test.tsx`. Expected: FAIL.
- [ ] **Step 3:** Implementasi, lalu ganti blok mockup di `page.tsx`.
- [ ] **Step 4:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`. Expected: bersih.
- [ ] **Step 5: Commit** `feat(dashboard): Asset Library asli di dashboard Rara`.

### Task 6: Deploy ke VPS dan uji nyata

**Files:**
- Modify (server): `/etc/nginx/sites-available/rara.conf`
- Modify (server): `/opt/haraka/.env`, `/opt/haraka/backend/.env`, `/opt/haraka/HOMEPAGE/.env.local`
- Modify (repo): `flow-extension/README.md` dan `HOMEPAGE/README.md` (bagian deploy)

- [ ] **Step 1: nginx.**
  - Tambahkan `api/factory` ke regex basic auth: `location ~ ^/(dashboard|api/dashboard|api/rara-config|api/factory)`.
  - Tambahkan `location /harka-assets/ { proxy_pass http://127.0.0.1:9010; include /etc/nginx/haraka-proxy.conf; client_max_body_size 2100M; proxy_request_buffering off; }`. Location ini **tanpa** basic auth, karena presigned URL sudah membawa tanda tangannya sendiri. `Host` diteruskan apa adanya lewat `haraka-proxy.conf`, sehingga signature SigV4 tetap cocok.
  - `nginx -t && systemctl reload nginx`.
- [ ] **Step 2: Env backend.**
  - `S3_PUBLIC_ENDPOINT_URL=https://faq.harakaerfi.com` di root `.env`.
  - Tambahkan `"https://faq.harakaerfi.com"` ke `CORS_ORIGINS` di `backend/.env`.
- [ ] **Step 2b: Pastikan zenko menerima host publik.** zenko hanya mengenali host yang terdaftar di `restEndpoints`. Host lain dibaca sebagai nama bucket (virtual-host).
  - Uji: di VPS buat presigned GET untuk satu thumbnail yang ada (`docker compose exec api python -c "from app.storage import presign_get; print(presign_get('<key>'))"`), lalu `curl -s -o /dev/null -w "%{http_code}" "<url>"`. Expected: `200`.
  - Jika hasilnya 404 atau `NoSuchBucket`: tambahkan `faq.harakaerfi.com` ke `restEndpoints`. Caranya: mount `infra/s3/config.json` hasil salinan config bawaan image, dengan tambahan `"faq.harakaerfi.com": "us-east-1"`, ke `/usr/src/app/config.json` di service `s3` di `docker-compose.yml`. Lalu `docker compose up -d s3` dan ulangi uji. Commit file config dan perubahan compose bersama Task 6.
- [ ] **Step 3: Deploy backend dan HOMEPAGE** dari `main` dengan `git archive HEAD backend flow-extension | ssh ... tar -x -C /opt/haraka`.
  - Backend: `docker compose --profile app up -d --build api worker beat`. Migrasi fase 2 jalan otomatis.
  - HOMEPAGE: `git archive HEAD HOMEPAGE` tanpa menimpa `data/` dan `.env.local`, lalu `npm ci && npm run build && pm2 restart rara`. Tulis `DEPLOYED_COMMIT`.
- [ ] **Step 4: Env HOMEPAGE.** Isi `.env.local` dengan:
  - `FACTORY_API_URL=http://127.0.0.1:8010`;
  - `FACTORY_EMAIL` dan `FACTORY_PASSWORD` disalin di server dari `/root/haraka-factory-credentials.txt` dengan skrip, tanpa mencetak nilainya;
  - mode `600`;
  - lalu `pm2 restart rara`.
- [ ] **Step 5: Uji asap.**
  - `curl -s -o /dev/null -w "%{http_code}" https://faq.harakaerfi.com/api/factory/render-jobs/quota`. Expected: `401` (diminta password nginx).
  - Request yang sama dengan basic auth. Expected: `200` dan JSON `limit`.
  - `.../api/factory/users` dengan basic auth. Expected: `404`.
- [ ] **Step 6: Uji nyata oleh user** (Review Focus 5):
  - login dashboard → Asset Library → upload satu foto produk asli;
  - thumbnail muncul;
  - Pembuatan Konten → Generate Video Ads funnel A;
  - status berjalan sampai klip tampil dan bisa diputar.
  Prasyarat langkah ini: extension Flow sudah login Google dan token sudah diisi.
- [ ] **Step 7: Commit** perubahan README: cara deploy dan isi env `FACTORY_*`. Catat juga bahwa `frontend/` tidak dideploy; isinya dipindah bertahap ke dashboard Rara.

## Sesudah plan ini

- Fase 3 (Remotion + review video, spec §3.4 gerbang 2) nanti tampil sebagai bagian "Video jadi" di tab Pembuatan Konten. Plan terpisah.
- Menu "Approvals" di dashboard Rara masih mockup. Bisa disambungkan ke tabel `approvals` lewat proxy yang sama (tambah `approvals` ke allowlist).
- Setting model LLM (`settings/content-llm`) sudah lolos allowlist. Formnya bisa ditaruh di tab "Otak & LLM Engine" milik Rara.
