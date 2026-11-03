# Fase 2 — Otak AI + Gerbang 1 (Klaim) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner memasukkan satu referensi (foto atau video) + tipe konten, lalu sistem menganalisisnya, menulis script 3 variasi hook, mengecek klaim terhadap Claims Library, dan otomatis membuat `render_jobs` untuk Fase 1, tanpa menulis prompt Flow manual.

**Architecture:** Satu `content_jobs` = satu Generate. Task Celery `content.generate` menjalankan pipeline berurutan: analisis referensi (LLM vision; video lewat frame FFmpeg) → writer (LLM menghasilkan JSON script) → gerbang 1 (klaim vs `claims`) → buat `render_jobs`. LLM dipanggil lewat satu fungsi tipis `app/llm.py` (OpenAI-compatible, `httpx`) yang dibungkus pencatatan `agent_runs`, sehingga tes cukup mengganti satu fungsi. Fase ini belum memakai Remotion maupun UI `/konten`.

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0, Alembic, Celery 5.4, PostgreSQL 16, `httpx` (dipindah dari grup dev ke dependency utama), FFmpeg/ffprobe, pytest.

**Spec:** `docs/superpowers/specs/2026-11-03-tab-pembuatan-konten-design.md` (§3.1–3.5, §4.1, §4.5). Roadmap: `docs/superpowers/plans/2026-11-03-flow-render-pipeline.md` bagian "Roadmap", baris Fase 2.

## Global Constraints

- Dua slot model LLM, disimpan di `guardrail_settings` key `content_llm`, value `{"analysis_model": str, "writer_model": str}`. Alamat dan key dari env `LLM_BASE_URL` dan `LLM_API_KEY` (tidak pernah dikirim ke browser). Hanya `owner` boleh mengubah setting (spec §3.5).
- Tipe konten: `video_ads`, `talking_head`, `hard_sell`. Durasi script: 30, 30, 15 detik (`scripts.duration_s` hanya menerima 15/30/45).
- Satu Generate = 3 hook + body + CTA untuk `video_ads`/`talking_head` (5 klip), 3 hook + CTA untuk `hard_sell` (4 klip). Slot disimpan di `render_jobs.content_slot`: `hook1`, `hook2`, `hook3`, `body`, `cta`.
- Mode render: `talking_head` bila `content_jobs.type == "talking_head"`; selain itu `broll`. Mode `broll` memaksa `render_jobs.slot = "broll"` (aturan Fase 1), jadi urutan konten dibawa oleh `content_slot`.
- Prompt Flow berbahasa Inggris; dialog Indonesia dalam tanda kutip (aturan `normalize_job_fields` Fase 1 untuk talking head).
- Klaim hanya dari Claims Library: yang boleh dipakai = `claims.status == "approved"` dan hari ini di dalam `valid_from..valid_until` (kolom kosong = tidak dibatasi). `claim_id` dari LLM yang tidak ada di daftar yang diberikan dianggap **klaim baru**.
- Klaim baru → satu `approvals` dengan `action="claim"` dan `subject_type="script"`; sementara itu pipeline membuat **versi alternatif tanpa klaim baru** dan merendernya. Tidak ada klaim baru → render jalan otomatis.
- Referensi talking head wajib foto berlisensi `testimonial_consented`/`creator_licensed`; `broll` menolak `unknown` (pakai `validate_reference` Fase 1). Ditolak saat `POST`, sebelum biaya LLM keluar.
- Video referensi tidak dikirim ke LLM: 6 frame kunci rata (FFmpeg) saja. Frame terbaik (dipilih analisis) jadi aset foto baru: lisensi mewarisi video induk, `parent_asset_id` = video. Transkrip audio opsional: hanya bila `LLM_TRANSCRIBE_MODEL` diisi.
- Setiap panggilan LLM menulis satu `agent_runs` (agent `content_analysis`/`content_writer`, model, token, durasi, status). Setiap perubahan status `content_jobs` lewat `audit.record`.
- Pesan error API dan `content_jobs.error` berbahasa Indonesia. Aksi manusia hanya `owner`, lewat `require_roles` per endpoint.

## Review Focus

1. **LLM membalas bukan JSON / dibungkus ```json / kurang field.** Dicoba sekali lagi dengan pesan galat; tetap gagal → job `failed` dengan alasan, nol `render_jobs`. → Task 4.
2. **`LLM_BASE_URL` atau key kosong / endpoint mati.** Job `failed`: "LLM belum dikonfigurasi" / "LLM tidak bisa dihubungi", bukan 500. → Task 1.
3. **Klaim kedaluwarsa atau `retired` dipakai LLM.** Tidak ada di daftar yang diberikan, jadi dihitung klaim baru. → Task 5.
4. **Task Celery terkirim dua kali** (`acks_late`) atau dijalankan saat job sudah `rendering`. Tidak menghasilkan `render_jobs` ganda. → Task 6.
5. **Video referensi rusak / tanpa frame.** Job `failed`, bukan exception tak tertangkap. → Task 3.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `backend/app/llm.py` (create) | Klien OpenAI-compatible + `agent_runs`; satu-satunya tempat HTTP ke LLM |
| `backend/app/content/__init__.py` (create) | paket kosong |
| `backend/app/content/analysis.py` (create) | analisis foto/video → `asset_analysis`, frame start |
| `backend/app/content/writer.py` (create) | prompt writer, validasi JSON → `ScriptDraft` |
| `backend/app/content/pipeline.py` (create) | gerbang 1, pembuatan `scripts`, `approvals`, `render_jobs`, alur `run_generate` |
| `backend/app/routers/content.py` (create) | endpoint `/content-jobs`, `/settings/content-llm`, keputusan klaim |
| `backend/app/models.py`, `schemas.py`, `config.py`, `worker.py`, `main.py` (modify) | tabel/kolom baru, skema, env, task, router |
| `backend/alembic/versions/…_content_jobs.py` (create) | migrasi |
| `backend/tests/test_content_*.py`, `tests/conftest.py` (create/modify) | tes + fixture `fake_llm` |

---

### Task 1: Klien LLM, pencatatan `agent_runs`, dan setting model

**Files:**
- Create: `backend/app/llm.py`, `backend/app/routers/content.py` (hanya endpoint setting), `backend/tests/test_content_llm.py`
- Modify: `backend/app/config.py`, `backend/pyproject.toml` (httpx ke dependency utama), `backend/app/main.py`, `backend/app/schemas.py`, `backend/tests/conftest.py`

**Interfaces:**
- Produces:
  - `class LLMError(Exception)` dengan `message: str` berbahasa Indonesia.
  - `complete(db: Session, *, agent: str, slot: Literal["analysis", "writer"], messages: list[dict], expect_json: bool = True) -> dict | str` — memanggil `POST {LLM_BASE_URL}/chat/completions`, mencatat `agent_runs`, mengembalikan dict (ter-parse; membuang pagar ```json bila ada) atau teks. Kirim `stream: false`, tetapi balasan berformat SSE (`data: {...}` per baris, sebagian model 9Router membalas begitu walau tidak diminta) tetap harus terbaca: gabungkan `choices[0].delta.content`.
  - `get_models(db) -> dict` (`{"analysis_model","writer_model"}`, `""` bila belum diisi).
  - `GET /settings/content-llm`, `PUT /settings/content-llm` (owner; body `ContentLlmIn`).
  - Fixture `fake_llm` di conftest: `fake_llm.reply(slot, payload_or_exception)` mengganti `app.llm.complete` dengan antrean balasan per slot; menyimpan `fake_llm.calls`.

- [ ] **Step 1: Tulis tes `tests/test_content_llm.py`**
  - `test_setting_model_hanya_owner`: `PUT /settings/content-llm` dengan `as_role("marketing")` → 403; owner → 200 dan `GET` mengembalikan nilai yang sama.
  - `test_complete_mencatat_agent_run`: pasang `httpx.MockTransport` lewat `app.llm._transport` (variabel modul yang bisa diganti tes) yang membalas `{"choices":[{"message":{"content":"```json\n{\"a\":1}\n```"}}],"usage":{"prompt_tokens":10,"completion_tokens":5}}`; `complete(...)` mengembalikan `{"a": 1}` dan ada satu `AgentRun` `status="succeeded"`, `tokens_in=10`, `tokens_out=5`, `model` sama dengan setting.
  - `test_llm_belum_dikonfigurasi`: `LLM_BASE_URL` kosong → `LLMError` berisi "belum dikonfigurasi"; model kosong → `LLMError` berisi "model"; `AgentRun.status="failed"`.
  - `test_endpoint_mati`: transport melempar `httpx.ConnectError` → `LLMError` berisi "tidak bisa dihubungi"; status HTTP 401/429/5xx → pesan memuat kode status.
- [ ] **Step 2:** `uv run pytest tests/test_content_llm.py -v` → FAIL (`ModuleNotFoundError: app.llm`)
- [ ] **Step 3:** Implementasikan `app/llm.py`, setting `llm_base_url`, `llm_api_key`, `llm_transcribe_model` (semua default `""`) di `Settings`, `ContentLlmIn/Out` di `schemas.py`, router `content.py` (endpoint setting, `can_manage_content = require_roles("owner")`) dan daftarkan di `main.py`. Pindahkan `httpx==0.28.1` ke `dependencies`. Kalau `agent_runs` ditulis di sesi yang sama dengan pemanggil, `LLMError` tetap harus meninggalkan baris `failed` (flush sebelum raise).
- [ ] **Step 4:** `uv run pytest tests/test_content_llm.py -v` → PASS
- [ ] **Step 5:** Commit `feat(content): klien LLM OpenAI-compatible, agent_runs, dan setting model`

### Task 2: Model dan migrasi `content_jobs`

**Files:**
- Modify: `backend/app/models.py`, `backend/app/schemas.py`
- Create: `backend/alembic/versions/20261103_<rev>_content_jobs.py` (`down_revision = '978f56350fa0'`), `backend/tests/test_content_models.py`

**Interfaces:**
- Produces:
  - Konstanta `CONTENT_TYPES = ("video_ads", "talking_head", "hard_sell")`, `CONTENT_STATUSES = ("queued", "analyzing", "writing", "rendering", "failed")`, `CONTENT_SLOTS = ("hook1", "hook2", "hook3", "body", "cta")`.
  - `ContentJob`: `id`, `type`, `funnel` (`FUNNELS`), `reference_asset_id` (FK assets, wajib), `start_asset_id` (FK assets, nullable; foto yang dikirim ke Flow), `status` (default `queued`), `error`, `script_id` (FK scripts, nullable; versi yang dirender langsung), `pending_script_id` (FK scripts, nullable; versi dengan klaim baru), `claim_approval_id` (FK approvals, nullable), `requested_by_id` (FK users), `created_at`, `updated_at`.
  - `RenderJob.content_job_id` (FK content_jobs, nullable) dan `RenderJob.content_slot` (nullable, CHECK `IN CONTENT_SLOTS` atau NULL).
  - `ContentJobOut` (id, type, funnel, status, error, reference_asset_id, start_asset_id, script_id, pending_script_id, claim_approval_id, render_jobs: list[RenderJobOut dengan `content_slot`], timestamps). `RenderJobOut` ditambah `content_slot: str | None`.

- [ ] **Step 1: Tes `test_content_models.py`**: `ContentJob` tersimpan dengan default `status="queued"`; `type="podcast"` ditolak CHECK (`IntegrityError`); `RenderJob.content_slot="hook9"` ditolak; `ContentJob` dengan `reference_asset_id` tidak ada ditolak FK.
- [ ] **Step 2:** `uv run pytest tests/test_content_models.py -v` → FAIL
- [ ] **Step 3:** Tambah model dan migrasi (buat dengan `uv run alembic revision --autogenerate -m "content jobs"`, lalu periksa isinya).
- [ ] **Step 4:** `uv run pytest` (seluruh suite, termasuk tes Fase 1 yang memverifikasi `downgrade base` + `upgrade head`) → PASS
- [ ] **Step 5:** Commit `feat(content): tabel content_jobs dan kolom content_slot di render_jobs`

### Task 3: Analisis referensi (foto dan video)

**Files:**
- Create: `backend/app/content/__init__.py`, `backend/app/content/analysis.py`, `backend/tests/test_content_analysis.py`
- Modify: `backend/app/media.py` (fungsi frame), `backend/tests/conftest.py`

**Interfaces:**
- Consumes: `llm.complete`, `storage.download/upload`, `media.probe`, fixture `media_dir` (ada `clip.mp4`, `photo.jpg`, `broken.mp4`).
- Produces:
  - `media.extract_frames(src: Path, dest_dir: Path, count: int = 6) -> list[Path]` — JPEG lebar 480 px rata sepanjang durasi (pakai durasi dari `probe`); daftar kosong bila gagal.
  - `class AnalysisError(Exception)`.
  - `analyze_reference(db: Session, job: ContentJob) -> tuple[AssetAnalysis, Asset]` — mengembalikan analisis dan **aset foto start frame**. Foto: start = foto itu sendiri. Video: ekstrak frame, kirim ke model `analysis` (gambar base64 di `messages`), model mengembalikan JSON `{"footage_type": "person"|"product"|"factory"|"other", "best_frame": int, "hook_3s": str, "key_message": str, "tags": [str], "quality": {...}}`; frame `best_frame` diunggah sebagai aset `photo` baru (`storage_key = assets/<id>/original.jpg`, `status="ready"`, `parent_asset_id` = video, lisensi mewarisi video, `funnel` mewarisi). Hasil disimpan ke `asset_analysis` (`agent_run_id` diisi dan `footage_type`, `hook_3s`, `key_message`, `tags`, `quality`). Analisis lama untuk aset yang sama dipakai ulang tanpa panggilan LLM.
  - Transkrip: bila `settings.llm_transcribe_model` diisi, `POST /audio/transcriptions` lewat modul `llm` (`transcribe(db, path) -> str`); selain itu `transcript = None`.

- [ ] **Step 1: Tes**
  - `test_foto_dipakai_sebagai_start_frame` (S3 sungguhan: unggah `photo.jpg` ke key aset): `fake_llm.reply("analysis", {"footage_type": "product", "best_frame": 0, "hook_3s": "Serum glowing", "key_message": "Maklon skincare", "tags": ["serum"], "quality": {}})`; hasil: `start.id == reference.id`, satu baris `asset_analysis` dengan `footage_type == "product"`.
  - `test_video_membuat_foto_start_frame`: referensi `clip.mp4` (`license_status="creator_licensed"`), `best_frame=2` → aset baru bertipe `photo`, `parent_asset_id` = video, lisensi `creator_licensed`, objek ada di S3 (`storage.head(key)` tidak `None`); pesan ke LLM memuat 6 bagian gambar.
  - `test_analisis_dipakai_ulang`: panggilan kedua tidak menambah `fake_llm.calls`.
  - `test_video_rusak_gagal_rapi`: `broken.mp4` → `AnalysisError` berisi "frame".
  - `test_best_frame_di_luar_rentang`: `best_frame=99` → memakai frame tengah, tidak melempar.
- [ ] **Step 2:** `uv run pytest tests/test_content_analysis.py -v` → FAIL
- [ ] **Step 3:** Implementasi `media.extract_frames` (`ffmpeg -vf fps=N/durasi` atau `-ss` per frame, pilih yang lebih sederhana) dan `analysis.py`.
- [ ] **Step 4:** `uv run pytest tests/test_content_analysis.py -v` → PASS
- [ ] **Step 5:** Commit `feat(content): analisis referensi foto dan video, frame start otomatis`

### Task 4: Writer — script 3 hook, body, CTA, dan prompt Flow

**Files:**
- Create: `backend/app/content/writer.py`, `backend/tests/test_content_writer.py`

**Interfaces:**
- Consumes: `llm.complete`, `AssetAnalysis`, `normalize_job_fields` (validasi prompt per mode).
- Produces:
  - `class SlotDraft(BaseModel)`: `slot: Literal[CONTENT_SLOTS]`, `dialog: str | None`, `overlay_text: str`, `flow_prompt: str`, `target_duration: Literal["4s","6s","8s","10s"] | None`, `claim_ids: list[str]`, `new_claims: list[str]`.
  - `class ScriptDraft(BaseModel)`: `headline: str`, `caption: str`, `slots: list[SlotDraft]`.
  - `class WriterError(Exception)`.
  - `write_script(db, *, content_type: str, funnel: str, analysis: AssetAnalysis, mode: str, claims: list[Claim], forbid_new_claims: bool = False) -> ScriptDraft` — satu panggilan `writer`; daftar klaim disisipkan sebagai `id: teks`; bila `forbid_new_claims` prompt melarang klaim di luar daftar. Validasi: slot persis sesuai tipe (5 atau 4, tanpa duplikat); tiap `flow_prompt` lolos `normalize_job_fields(mode, slot_for_mode, prompt, target_duration)`; mode `talking_head` wajib `dialog`. Gagal validasi atau JSON rusak → satu kali ulang dengan pesan galat ditambahkan ke percakapan; gagal lagi → `WriterError`.

- [ ] **Step 1: Tes** (pakai `fake_llm`)
  - `test_ads_menghasilkan_5_slot`: balasan valid 5 slot `video_ads` → `[s.slot for s in draft.slots] == ["hook1","hook2","hook3","body","cta"]`.
  - `test_hard_sell_4_slot_tanpa_body`: tipe `hard_sell` dengan balasan berisi `body` → `WriterError`; tanpa `body` → 4 slot.
  - `test_json_rusak_dicoba_sekali_lagi`: balasan pertama `"maaf, saya tidak bisa"`, kedua valid → sukses dan `len(fake_llm.calls) == 2`; pesan kedua memuat galat validasi.
  - `test_dua_kali_rusak_gagal`: dua balasan rusak → `WriterError`, `len(calls) == 2`.
  - `test_talking_head_tanpa_tanda_kutip_ditolak`: `flow_prompt` tanpa dialog dalam tanda kutip pada mode `talking_head` memicu ulang.
  - `test_forbid_new_claims_masuk_prompt`: dengan `forbid_new_claims=True`, teks pesan sistem memuat larangan klaim di luar daftar.
- [ ] **Step 2:** `uv run pytest tests/test_content_writer.py -v` → FAIL
- [ ] **Step 3:** Implementasi `writer.py`. Prompt sistem disimpan sebagai konstanta modul `WRITER_PROMPT_VERSION = "writer-v1"` dan dicatat ke `agent_runs.prompt_version`.
- [ ] **Step 4:** `uv run pytest tests/test_content_writer.py -v` → PASS
- [ ] **Step 5:** Commit `feat(content): writer script 3 hook dengan validasi prompt Flow`

### Task 5: Gerbang 1 — cek klaim, approval, versi alternatif, dan `render_jobs`

**Files:**
- Create: `backend/app/content/pipeline.py`, `backend/tests/test_content_gate.py`

**Interfaces:**
- Consumes: `write_script`, `ScriptDraft`, `Claim`, `Approval`, `Script`, `RenderJob`, `audit.record`.
- Produces:
  - `usable_claims(db, today: date) -> list[Claim]` — `approved` dan dalam masa berlaku.
  - `find_new_claims(draft: ScriptDraft, usable: list[Claim]) -> list[str]` — gabungan `new_claims` semua slot ditambah teks `claim_ids` yang tidak ada di `usable` (tulis `"(id tidak dikenal) <id>"`).
  - `save_script(db, job, draft, *, version: int, parent: Script | None) -> Script` — baris `scripts` (`hooks` = dialog/overlay tiga hook, `body`, `cta`, `shot_list` = daftar slot dengan prompt, `duration_s` 30/15, `source_asset_ids` = [reference, start], `status="draft"`).
  - `enqueue_renders(db, job, script: Script, draft: ScriptDraft, start: Asset) -> list[RenderJob]` — satu `render_jobs` per slot (`reference_asset_id = start.id`, `content_job_id`, `content_slot`, mode sesuai konstrain, `requested_by_id = job.requested_by_id`), memakai `validate_reference` dan `normalize_job_fields`.
  - `apply_gate(db, job, draft, start, analysis) -> None` — bila tidak ada klaim baru: `save_script` + `enqueue_renders`, `job.script_id` diisi. Bila ada: `save_script` versi 1 (`pending_script_id`), `Approval(action="claim", subject_type="script", subject_id=script.id, payload_snapshot={"new_claims": [...], "script_id": ...}, snapshot_hash=sha256 dari JSON terurut snapshot, requested_by_agent_run_id=<agent_run writer>)` di `job.claim_approval_id`, lalu `write_script(..., forbid_new_claims=True)` → `save_script` versi 2 (`parent_script_id` = versi 1) + `enqueue_renders`, `job.script_id` = versi 2. Alternatif yang masih memuat klaim baru → `WriterError`.

- [ ] **Step 1: Tes** (`fake_llm`, `owner_headers`, klaim di-seed lewat `db.add(Claim(...))`)
  - `test_klaim_terdaftar_langsung_render`: draft memakai `claim_ids=[<id klaim approved>]` → 5 `render_jobs` `queued` dengan `content_slot` lengkap, `job.claim_approval_id is None`, `job.script_id` terisi.
  - `test_klaim_baru_membuat_approval_dan_alternatif`: `new_claims=["Sertifikat halal MUI"]` pada satu slot; panggilan writer kedua (balasan tanpa klaim baru) → `Approval(action="claim", status="pending")` dengan `payload_snapshot["new_claims"] == ["Sertifikat halal MUI"]`, dua baris `scripts` (versi 1 dan 2, versi 2 `parent_script_id` = versi 1), 5 `render_jobs` dari **versi 2**, `job.pending_script_id` = versi 1; panggilan writer kedua `forbid_new_claims=True`.
  - `test_klaim_kedaluwarsa_dihitung_baru`: klaim `approved` dengan `valid_until` kemarin dan klaim `retired` → keduanya ada di `find_new_claims`.
  - `test_claim_id_karangan_dihitung_baru`: `claim_ids=["bukan-uuid"]` → muncul di hasil dengan awalan "(id tidak dikenal)".
  - `test_alternatif_masih_ada_klaim_baru_gagal`: balasan kedua memuat `new_claims` → `WriterError`, tidak ada `render_jobs` dibuat.
  - `test_slot_mode_sesuai_tipe`: tipe `talking_head` → semua `render_jobs.mode == "talking_head"` dan `slot` sama dengan `hook`/`body`/`cta`; tipe `video_ads` → `mode == "broll"` dan `slot == "broll"`.
- [ ] **Step 2:** `uv run pytest tests/test_content_gate.py -v` → FAIL
- [ ] **Step 3:** Implementasi `pipeline.py` (tanpa Celery; fungsi murni terhadap `db`).
- [ ] **Step 4:** `uv run pytest tests/test_content_gate.py -v` → PASS
- [ ] **Step 5:** Commit `feat(content): gerbang 1 klaim, approval, versi alternatif, dan render_jobs otomatis`

### Task 6: Task Celery `content.generate`, endpoint, dan keputusan klaim

**Files:**
- Modify: `backend/app/content/pipeline.py` (`run_generate`), `backend/app/worker.py`, `backend/app/routers/content.py`, `backend/app/schemas.py`
- Create: `backend/tests/test_content_api.py`

**Interfaces:**
- Consumes: `analyze_reference`, `write_script`, `apply_gate`, `AnalysisError`, `WriterError`, `LLMError`.
- Produces:
  - `run_generate(db, job_id: uuid.UUID) -> None` — hanya berjalan bila `status == "queued"` (update atomik `queued → analyzing` dengan `with_for_update`); urutan `analyzing → writing → rendering`; `AnalysisError`/`WriterError`/`LLMError` → `status="failed"`, `error=<pesan>`. Setiap transisi `audit.record` (`content_job.status`).
  - Task Celery `content.generate(job_id: str)` memanggil `run_generate`.
  - `POST /content-jobs` (owner; body `ContentJobIn {type, funnel, reference_asset_id}`) → 201 `ContentJobOut`; 404 aset tidak ada; 422 dari `validate_reference` untuk foto (talking head → mode `talking_head`, selainnya `broll`); referensi video diterima tanpa `validate_reference` kecuali lisensi `unknown` untuk `talking_head` (422). Mengantrikan task setelah commit.
  - `GET /content-jobs`, `GET /content-jobs/{id}` (menyertakan `render_jobs`), `POST /content-jobs/{id}/retry` (hanya dari `failed` → `queued`, 409 selain itu).
  - `POST /content-jobs/{id}/claim-decision` (owner; body `{"decision": "approve"|"reject", "note": str | None}`): 409 bila tidak ada approval `pending`. `approve`: approval `approved` (`decided_by_id`, `decided_at`), klaim baru di snapshot dibuat sebagai `Claim(status="approved", category="portfolio" kecuali ditentukan, approved_by_id=owner)`, `render_jobs` untuk skrip versi 1 dibuat (`enqueue_renders`), `pending_script_id` dikosongkan, skrip versi 1 `approved`. `reject`: approval `rejected`, skrip versi 1 `rejected`, `pending_script_id` dikosongkan; versi 2 tetap jalan.

- [ ] **Step 1: Tes `test_content_api.py`**
  - `test_alur_penuh_foto`: `POST /content-jobs` (tipe `video_ads`, `photo_asset`) dengan `fake_llm` balasan analisis dan writer valid (Celery eager) → `GET` menunjukkan `status == "rendering"`, 5 `render_jobs` dengan `content_slot` lengkap, dan satu baris `agent_runs` `content_analysis` plus satu `content_writer`.
  - `test_talking_head_tolak_foto_tanpa_izin`: aset `license_status="unknown"` → 422 dan `fake_llm.calls == []`.
  - `test_video_referensi_masuk`: referensi video `clip.mp4` terunggah → job `rendering`, `start_asset_id` ≠ `reference_asset_id`.
  - `test_llm_gagal_job_failed`: `fake_llm.reply("analysis", LLMError("LLM tidak bisa dihubungi"))` → job `failed`, `error` memuat teksnya, nol `render_jobs`; `POST /content-jobs/{id}/retry` → `queued`/`rendering` lagi setelah balasan diperbaiki; retry dari status `rendering` → 409.
  - `test_task_dua_kali_tidak_menggandakan`: panggil `run_generate` dua kali untuk job yang sama → tetap 5 `render_jobs`, `fake_llm.calls` tidak bertambah di panggilan kedua.
  - `test_keputusan_klaim_approve`: dari kondisi klaim baru (Task 5) → approve → `claims` memuat teks baru `approved`, ada 5 `render_jobs` tambahan dari versi 1 (total 10, `content_slot` berulang dua kali), `pending_script_id is None`.
  - `test_keputusan_klaim_reject`: reject → tidak ada `render_jobs` tambahan, versi 1 `rejected`, approval `rejected`; keputusan kedua → 409.
  - `test_peran_marketing_ditolak`: `as_role("marketing")` untuk `POST /content-jobs` dan `claim-decision` → 403.
- [ ] **Step 2:** `uv run pytest tests/test_content_api.py -v` → FAIL
- [ ] **Step 3:** Implementasi `run_generate`, task, endpoint. Daftarkan `content.generate` di `worker.py`; `celery_eager` sudah menjalankannya langsung di tes.
- [ ] **Step 4:** `uv run pytest` (seluruh suite) → PASS
- [ ] **Step 5:** Commit `feat(content): task content.generate, endpoint /content-jobs, dan keputusan klaim`

### Task 7: Konfigurasi VPS dan uji nyata

**Files:**
- Modify: `backend/.env.example`, `flow-extension/README.md` (bagian baru "Uji Fase 2")

- [ ] **Step 1:** Tambahkan `LLM_BASE_URL=`, `LLM_API_KEY=`, `LLM_TRANSCRIBE_MODEL=` (kosong, dengan komentar) ke `backend/.env.example`. Service `api`, `worker`, dan `beat` sudah membaca `backend/.env` lewat `env_file`, jadi `docker-compose.yml` tidak berubah.
- [ ] **Step 2:** Tambah ke `flow-extension/README.md`: langkah isi `backend/.env` di VPS dan restart `api` + `worker`, `PUT /settings/content-llm` dengan dua nama model dari 9Router, lalu satu `POST /content-jobs` memakai foto produk asli dan periksa script + `render_jobs`. Catat hasil dan model yang dipakai di dokumen yang sama.
- [ ] **Step 3:** Commit `docs(content): konfigurasi LLM dan uji nyata fase 2`.

---

## Self-Review

- **Spec coverage:** §3.1 referensi foto/video (T3, T6), §3.2 tipe (T4–T5), §3.3 satuan kerja (T4–T5), §3.4 gerbang 1 (T5–T6), §3.5 peran (T1, T6), §4.1 dua slot LLM (T1), §4.5 tabel `content_jobs` (T2). Cek transkrip klip (gerbang pasca-render), Remotion, dan gerbang 2 ada di Fase 3; UI di Fase 4.
- **Konsistensi tipe:** `ScriptDraft`/`SlotDraft` didefinisikan di T4 dan dipakai di T5–T6; `content_slot` didefinisikan di T2 dan diisi di T5.
- **Keputusan yang dibuat di plan, bukan di spec:** (1) versi 1 dan versi 2 sama-sama dirender setelah klaim disetujui (3 variasi tetap bisa dibandingkan di gerbang 2; konsekuensinya memakan kuota Flow ganda); (2) transkrip video opsional lewat `LLM_TRANSCRIBE_MODEL`, karena endpoint 9Router belum tentu mendukung `/audio/transcriptions`; (3) klaim baru yang disetujui masuk ke `claims` berkategori `portfolio` sebagai bawaan.
