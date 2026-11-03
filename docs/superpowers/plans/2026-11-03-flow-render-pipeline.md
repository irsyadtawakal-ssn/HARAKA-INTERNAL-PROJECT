# Fase 1 — Pipeline Render Google Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Owner bisa mendaftarkan satu job render (foto referensi + prompt), lalu Chrome + extension di VPS mengambil job itu, merender klip di Google Flow, dan klip 720p masuk ke Asset Library sebagai aset baru, tanpa klik manual.

**Architecture:** Backend FastAPI menyimpan antrian di tabel `render_jobs`. Extension (perangkat terdaftar dengan token) mengklaim satu job, dan job itu dikunci dengan lease 15 menit yang diperpanjang setiap kali extension lapor status. Hasil video masuk lewat dua jalur. Jalur utama: Celery beat memindai folder unduhan Chrome di VPS. Jalur cadangan: extension mengunggah blob ke presigned URL. Kedua jalur memakai satu fungsi `create_result_asset`. Fase ini sengaja belum memakai LLM, Remotion, maupun UI `/konten`. Ketiganya ada di fase berikutnya (lihat Roadmap).

**Tech Stack:** FastAPI 0.115, SQLAlchemy 2.0, Alembic, Celery 5.4 (+ beat), PostgreSQL 16, S3 (zenko), Chrome Extension MV3, `node --test` untuk fungsi murni extension.

**Spec:** `docs/superpowers/specs/2026-11-03-tab-pembuatan-konten-design.md` (§3.1, §3.3, §3.5, §4.2, §4.3, §4.5)

## Global Constraints

- Satu job berjalan dalam satu waktu per device. Lease job **15 menit** sejak laporan status terakhir.
- Percobaan maksimal per job: **3**. Sesudah itu status `failed`.
- Kuota: `guardrail_settings` key `flow_daily_clip_limit`, value `{"limit": <int>}`. Default **30** bila belum ada. Setiap klaim (termasuk percobaan ulang dan render ulang) dihitung sebagai satu klip. Hari dihitung menurut zona **Asia/Jakarta**.
- Melewati kuota tidak membuat job gagal. Job tetap `queued` sampai hari berikutnya.
- Foto referensi `talking_head` wajib berlisensi `testimonial_consented` atau `creator_licensed`. `broll` menolak lisensi `unknown`. Referensi wajib bertipe `photo`.
- Klip hasil render: aset `video`, lisensi `internal`, `parent_asset_id` = referensi, `funnel` ikut referensi, `uploaded_by_id` = peminta job.
- Pilot: semua aksi manusia hanya untuk `owner`. Setiap endpoint tetap memakai dependency peran sendiri (`require_roles`) supaya akses bisa dibuka lewat konfigurasi nanti.
- Token device hanya ditampilkan sekali. Yang disimpan cuma hash SHA-256. Header: `X-Device-Token`.
- Semua perubahan status job dicatat lewat `audit.record` (klaim: action `render_job.claimed`).
- Pesan error API berbahasa Indonesia, mengikuti router yang sudah ada.
- Captcha tidak boleh diakali. Jika Flow menampilkan captcha, extension melapor `failed` dengan alasan `captcha`.

## Review Focus

1. **Chrome/tab crash di tengah job.** Job tidak boleh hilang. Sesudah 15 menit tanpa laporan, job kembali `queued` (atau `failed` bila sudah 3 percobaan). Kalau device yang sama mengklaim lagi, job aktif lamanya langsung dianggap gagal satu percobaan. → Task 4.
2. **Kuota habis di tengah hari.** Klaim mengembalikan `reason: "quota"`, job tetap `queued`, dan pukul 00:00 WIB (bukan UTC) kuota pulih. → Task 4.
3. **File muncul di folder unduhan saat tidak ada job `downloading`** (misalnya orang unduh manual lewat VNC). File dipindah ke `orphans/`, tidak dipasangkan ke job mana pun. → Task 7.
4. **Unduhan belum selesai** (`.crdownload`, atau ukuran masih bertambah). File tidak boleh diproses sebelum stabil. → Task 7.
5. **Referensi tidak layak** (video, lisensi `unknown` untuk talking head, aset masih `processing`, prompt talking head tanpa dialog bertanda kutip). Ditolak 422 saat job dibuat, bukan gagal di VPS. → Task 3.

---

## File Structure

| File | Tanggung jawab |
|---|---|
| `backend/app/models.py` (modify) | `RenderDevice`, `RenderJob`, konstanta status |
| `backend/alembic/versions/20261103_<rev>_render_jobs.py` (create) | migrasi tabel baru |
| `backend/app/config.py` (modify) | `flow_download_dir`, `flow_lease_minutes`, `flow_max_attempts`, `flow_default_daily_limit` |
| `backend/app/render.py` (create) | logika domain: kuota, lease/requeue, klaim, kegagalan percobaan, `create_result_asset` |
| `backend/app/routers/render.py` (create) | endpoint owner: device, job, kuota |
| `backend/app/routers/flow.py` (create) | endpoint device: klaim, status, upload hasil |
| `backend/app/deps.py` (modify) | `get_render_device` |
| `backend/app/schemas.py` (modify) | skema request/response render |
| `backend/app/ingest.py` (create) | pindai folder unduhan → `create_result_asset` |
| `backend/app/worker.py` (modify) | task `render.ingest_downloads` + beat schedule |
| `docker-compose.yml` (modify) | service `beat`, mount folder unduhan ke worker/beat |
| `backend/tests/test_render_*.py` (create) | uji per task |
| `flow-extension/` (move dari `frontend/google-flow-autopilot/`) | extension + `lib.js` fungsi murni + `README.md` runbook VPS |

---

### Task 1: Model, migrasi, dan konfigurasi render

**Files:**
- Modify: `backend/app/models.py` (tambah di bawah `AgentRun`)
- Modify: `backend/app/config.py`
- Create: `backend/alembic/versions/20261103_<rev>_render_jobs.py` (`alembic revision --autogenerate -m "render jobs"`, `down_revision = "762290e1d3f6"`)
- Test: `backend/tests/test_render_models.py`

**Interfaces:**
- Produces:
  - `RENDER_MODES = ("talking_head", "broll")`
  - `RENDER_SLOTS = ("hook", "body", "cta", "broll")`
  - `RENDER_DURATIONS = ("4s", "6s", "8s", "10s")`
  - `RENDER_ACTIVE_STATUSES = ("claimed", "uploading_ref", "generating", "downloading")`
  - `RENDER_STATUSES = ("queued", *RENDER_ACTIVE_STATUSES, "done", "failed")`
  - `class RenderDevice`: `id`, `name: str(80)`, `token_hash: str(64) unique`, `is_active: bool = True`, `last_seen_at: datetime | None`, `created_at`
  - `class RenderJob`: `id`, `mode`, `slot`, `prompt: Text`, `target_duration: str(4) | None`, `reference_asset_id → assets.id NOT NULL`, `status = "queued"`, `stage_message: Text | None`, `attempts: int = 0`, `device_id → render_devices.id | None`, `claimed_at`, `heartbeat_at`, `result_asset_id → assets.id | None`, `error: Text | None`, `requested_by_id → users.id NOT NULL`, `created_at`, `updated_at`. CHECK untuk `mode`/`slot`/`status`, `target_duration IS NULL OR IN (...)`. Index `render_jobs_queue_idx (status, created_at)`.
  - `Settings.flow_download_dir: str | None = None`, `flow_lease_minutes: int = 15`, `flow_max_attempts: int = 3`, `flow_default_daily_limit: int = 30`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_status_render_job_tidak_valid_ditolak(db, make_user, photo_asset):
    owner = make_user("owner")
    db.add(RenderJob(mode="talking_head", slot="hook", prompt='x "halo"', reference_asset_id=photo_asset.id,
                     requested_by_id=owner.id, status="melayang"))
    with pytest.raises(IntegrityError):
        db.commit()

def test_target_duration_hanya_nilai_flow(db, make_user, photo_asset): ...  # "7s" -> IntegrityError
```

`photo_asset` adalah fixture baru di `conftest.py`: aset `photo` berstatus `ready`, lisensi `creator_licensed`. Dibuat langsung lewat model, tanpa file S3.

- [ ] **Step 2:** `uv run pytest tests/test_render_models.py -v` → FAIL (`ImportError: RenderJob`)
- [ ] **Step 3:** Tambah model, konstanta, setting, dan buat migrasi dengan autogenerate. Periksa bahwa CHECK constraint ikut masuk ke file migrasi.
- [ ] **Step 4:** `uv run pytest tests/test_render_models.py -v` → PASS. Jalankan juga seluruh suite: `uv run pytest` → PASS.
- [ ] **Step 5: Commit** `feat(render): tabel render_devices dan render_jobs`

---

### Task 2: Registrasi device dan autentikasi token

**Files:**
- Create: `backend/app/render.py`, `backend/app/routers/render.py`
- Modify: `backend/app/deps.py`, `backend/app/schemas.py`, `backend/app/main.py` (include router)
- Test: `backend/tests/test_render_devices.py`

**Interfaces:**
- Produces:
  - `render.hash_token(token: str) -> str` (hex SHA-256)
  - `POST /render-devices` body `RenderDeviceIn{name: str (1..80)}` → 201 `RenderDeviceCreated{id, name, token}`. `token = secrets.token_urlsafe(32)`, hanya muncul di respons ini.
  - `GET /render-devices` → `list[RenderDeviceOut{id, name, is_active, last_seen_at}]`
  - `PATCH /render-devices/{id}` body `{is_active: bool}` → `RenderDeviceOut`
  - `deps.get_render_device(x_device_token: str | None = Header(None), db) -> RenderDevice`. 401 `"Token device tidak valid."` bila kosong, salah, atau device nonaktif. Memperbarui `last_seen_at`.
  - Router owner: `can_manage_render = require_roles("owner")`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_owner_daftar_device_token_sekali_tampil(client, as_role, db):
    h = as_role("owner")
    r = client.post("/render-devices", headers=h, json={"name": "VPS Flow 1"})
    assert r.status_code == 201 and len(r.json()["token"]) >= 40
    assert "token" not in client.get("/render-devices", headers=h).json()[0]
    assert db.scalar(select(RenderDevice.token_hash)) == hash_token(r.json()["token"])

def test_token_salah_atau_device_nonaktif_401(client, as_role, flow_device): ...
    # GET /flow/ping: header kosong -> 401; token acak -> 401; PATCH is_active=false lalu ping lagi -> 401

def test_selain_owner_tidak_boleh_kelola_device(client, as_role):
    assert client.post("/render-devices", headers=as_role("marketing"), json={"name": "x"}).status_code == 403
```

`flow_device` adalah fixture baru: mendaftarkan device lewat API dan mengembalikan `{"id", "headers": {"X-Device-Token": token}}`. Untuk task ini, tes 401 cukup memakai endpoint uji sementara `GET /flow/ping`, yang dibuat di `routers/flow.py` dan tetap dipertahankan sebagai health check extension (balas `{"ok": true, "device": name}`).

- [ ] **Step 2:** `uv run pytest tests/test_render_devices.py -v` → FAIL (404)
- [ ] **Step 3:** Implementasikan. Bandingkan hash dengan `hmac.compare_digest`. Catat audit `render_device.create` / `render_device.update`.
- [ ] **Step 4:** Tes → PASS
- [ ] **Step 5: Commit** `feat(render): registrasi device render dan token X-Device-Token`

---

### Task 3: Membuat dan melihat job render

**Files:**
- Modify: `backend/app/routers/render.py`, `backend/app/schemas.py`, `backend/app/render.py`
- Test: `backend/tests/test_render_jobs.py`

**Interfaces:**
- Consumes: `RenderJob`, konstanta Task 1
- Produces:
  - `POST /render-jobs` body `RenderJobIn{reference_asset_id: UUID, mode, slot, prompt: str (1..4000), target_duration: str | None}` → 201 `RenderJobOut`
  - `RenderJobOut{id, mode, slot, prompt, target_duration, reference_asset_id, status, stage_message, attempts, error, result_asset_id, created_at, updated_at}`
  - `GET /render-jobs?status=` → `list[RenderJobOut]` (terbaru dulu, maks 100). `GET /render-jobs/{id}` → `RenderJobOut`
  - `render.validate_reference(asset: Asset, mode: str) -> None`. Melempar `HTTPException(422)` dengan pesan spesifik.
  - Aturan: `mode == "broll"` ⇒ `slot == "broll"`, dan `target_duration` default `"8s"` bila kosong. `mode == "talking_head"` ⇒ `slot in ("hook","body","cta")`, dan prompt wajib memuat teks bertanda kutip ganda (regex `"[^"]+"`).

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_owner_buat_job_talking_head(client, as_role, photo_asset): ...
    # 201, status "queued", attempts 0, target_duration None
def test_broll_default_8s_dan_slot_dipaksa(client, as_role, photo_asset): ...
    # mode broll tanpa target_duration -> "8s"; mode broll slot "hook" -> 422
@pytest.mark.parametrize("kasus", ["video", "lisensi_unknown", "masih_processing", "tanpa_dialog"])
def test_referensi_tidak_layak_ditolak_422(client, as_role, db, photo_asset, kasus): ...
def test_broll_tolak_lisensi_unknown_tapi_terima_internal(client, as_role, db, photo_asset): ...
def test_marketing_belum_boleh_buat_job_saat_pilot(client, as_role, photo_asset):
    assert client.post("/render-jobs", headers=as_role("marketing"), json={...}).status_code == 403
```

- [ ] **Step 2:** `uv run pytest tests/test_render_jobs.py -v` → FAIL
- [ ] **Step 3:** Implementasikan. Status referensi yang diterima: `ready`, `analyzed`, `approved`. Catat audit `render_job.create`.
- [ ] **Step 4:** Tes → PASS
- [ ] **Step 5: Commit** `feat(render): buat dan lihat job render dengan validasi referensi`

---

### Task 4: Klaim job, lease, dan kuota harian

**Files:**
- Create: `backend/app/routers/flow.py` (sudah ada `/flow/ping` dari Task 2)
- Modify: `backend/app/render.py`, `backend/app/routers/render.py`, `backend/app/schemas.py`
- Test: `backend/tests/test_render_claim.py`

**Interfaces:**
- Produces:
  - `render.daily_limit(db) -> int`. Membaca `guardrail_settings["flow_daily_clip_limit"]["limit"]`, default `Settings.flow_default_daily_limit`.
  - `render.used_today(db, now: datetime) -> int`. Menghitung `audit_logs` dengan `action == "render_job.claimed"` dan `at >= awal hari Asia/Jakarta`.
  - `render.register_attempt_failure(db, job: RenderJob, reason: str) -> None`. Bila `attempts < flow_max_attempts`: `status="queued"`, `device_id=None`, `stage_message=reason`. Bila tidak: `status="failed"`, `error=reason`. Audit `render_job.attempt_failed`.
  - `render.requeue_stale(db, now) -> int`. Job aktif dengan `heartbeat_at < now - lease` diproses lewat `register_attempt_failure(..., "Tidak ada kabar dari extension selama 15 menit")`.
  - `render.claim_next(db, device: RenderDevice, now) -> tuple[RenderJob | None, str]`. Reason: `"ok" | "empty" | "quota"`. Urutan: (1) job aktif milik device ini → `register_attempt_failure(..., "Device mengklaim ulang (Chrome/extension restart)")`; (2) `requeue_stale`; (3) kuota habis → `(None, "quota")`; (4) `SELECT ... WHERE status='queued' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1`; (5) set `status="claimed"`, `attempts += 1`, `device_id`, `claimed_at = heartbeat_at = now`, audit `render_job.claimed`.
  - `POST /flow/claim` (device) → `FlowClaimOut{job: FlowTask | None, reason}`. Bentuk `FlowTask{job_id, mode, slot, prompt, target_duration, reference_url (presign_get), reference_filename}`.
  - `GET /render-jobs/quota` (owner) → `{limit, used, remaining}`

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_klaim_mengambil_job_tertua_dan_menguncinya(client, flow_device, queued_jobs): ...
    # dua job; klaim pertama -> job tertua, status "claimed", attempts 1; klaim kedua oleh device lain -> job kedua
def test_antrian_kosong_reason_empty(client, flow_device): ...
def test_kuota_habis_job_tetap_queued(client, db, flow_device, queued_jobs, set_limit):
    set_limit(1)
    assert client.post("/flow/claim", headers=flow_device["headers"]).json()["job"] is not None
    r = client.post("/flow/claim", headers=flow_device["headers"]).json()
    assert r == {"job": None, "reason": "quota"}  # job kedua tetap queued
def test_kuota_pulih_tengah_malam_wib_bukan_utc(db, ...):
    # audit claimed pada 2026-11-03T16:30Z (= 23:30 WIB) dihitung untuk tgl 3;
    # used_today(now=2026-11-03T17:05Z (= 00:05 WIB tgl 4)) == 0
def test_lease_kedaluwarsa_job_kembali_ke_antrian(client, db, flow_device, queued_jobs): ...
    # klaim, mundurkan heartbeat_at 16 menit, klaim oleh device lain -> mendapat job yang sama, attempts 2
def test_percobaan_ketiga_gagal_permanen(db, ...): ...  # attempts 3 + stale -> status failed, error terisi
def test_device_klaim_ulang_menggugurkan_job_aktifnya(client, db, flow_device, queued_jobs): ...
```

`queued_jobs` dan `set_limit` adalah fixture baru di `conftest.py`.

- [ ] **Step 2:** `uv run pytest tests/test_render_claim.py -v` → FAIL
- [ ] **Step 3:** Implementasikan dengan `now` sebagai parameter supaya bisa diuji. Router mengisi `datetime.now(UTC)`. Pakai `zoneinfo.ZoneInfo("Asia/Jakarta")`.
- [ ] **Step 4:** Tes → PASS
- [ ] **Step 5: Commit** `feat(render): klaim job dengan lease 15 menit dan kuota harian WIB`

---

### Task 5: Laporan status dari extension dan render ulang

**Files:**
- Modify: `backend/app/routers/flow.py`, `backend/app/routers/render.py`, `backend/app/render.py`, `backend/app/schemas.py`
- Test: `backend/tests/test_render_status.py`

**Interfaces:**
- Produces:
  - `POST /flow/jobs/{job_id}/status` (device) body `FlowStatusIn{stage: Literal["uploading_ref","generating","downloading","downloaded","failed"], message: str (≤300)}` → `{ok: true}`
    - 404 bila job tidak ada. 409 `"Job ini bukan milik device Anda atau sudah tidak aktif."` bila `device_id` beda atau status tidak aktif.
    - Setiap laporan: `heartbeat_at = now`, `stage_message = message`.
    - `stage` `uploading_ref`/`generating`/`downloading` → `status = stage`. `downloaded` → status tetap `downloading` (menunggu ingest). `failed` → `register_attempt_failure(db, job, message)`.
  - `POST /render-jobs/{id}/retry` (owner) → `RenderJobOut`. Hanya untuk status `failed` atau `done`. Mengembalikan job ke `queued` dengan `attempts=0`, `error=None`, `result_asset_id=None`. Klaim berikutnya tetap memakan kuota. Audit `render_job.retry`.

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_laporan_memperbarui_status_dan_heartbeat(client, db, claimed_job): ...
def test_downloaded_tidak_mengubah_status_downloading(client, db, claimed_job): ...
def test_laporan_failed_captcha_masuk_antrian_lagi(client, db, claimed_job):
    # stage failed, message "captcha" -> status queued, stage_message "captcha", attempts tetap 1
def test_device_lain_tidak_boleh_lapor_409(client, claimed_job, second_device): ...
def test_render_ulang_job_selesai(client, as_role, db, done_job): ...  # -> queued, result_asset_id None
def test_render_ulang_job_yang_masih_jalan_ditolak_409(client, as_role, claimed_job): ...
```

Fixture baru di `conftest.py`: `claimed_job` (job yang sudah diklaim `flow_device`), `second_device` (device kedua terdaftar), `done_job` (job berstatus `done`). Ketiganya dibuat lewat API, bukan insert langsung, supaya audit klaim ikut tercatat.

- [ ] **Step 2:** `uv run pytest tests/test_render_status.py -v` → FAIL
- [ ] **Step 3:** Implementasikan
- [ ] **Step 4:** Tes → PASS
- [ ] **Step 5: Commit** `feat(render): laporan status extension dan render ulang`

---

### Task 6: Memasang hasil video sebagai aset (+ jalur upload cadangan)

**Files:**
- Modify: `backend/app/render.py`, `backend/app/routers/flow.py`, `backend/app/schemas.py`
- Test: `backend/tests/test_render_result.py`

**Interfaces:**
- Produces:
  - `render.create_result_asset(db, job: RenderJob, *, storage_key: str, size_bytes: int, filename: str) -> Asset`.
    - Membuat `Asset(type="video", mime="video/mp4", status="processing", license_status="internal", parent_asset_id=job.reference_asset_id, funnel=<funnel referensi>, uploaded_by_id=job.requested_by_id, original_filename=filename)`.
    - Mengisi job: `status="done"`, `result_asset_id`, `stage_message="Selesai"`. Audit `render_job.done`.
    - Pemanggil yang commit, lalu memanggil `process_asset.delay(str(asset.id))`.
  - `render.result_storage_key(job_id: UUID) -> str` = `f"renders/{job_id}/{uuid4()}.mp4"`
  - `POST /flow/jobs/{job_id}/upload-url` (device, job harus `downloading` milik device) → `{upload_url, upload_headers, storage_key}`
  - `POST /flow/jobs/{job_id}/uploaded` (device) body `{storage_key, width: int | None, height: int | None}` → `RenderJobOut`.
    - Ukuran dicek lewat `storage.head`.
    - Bila `0 < width < 720` dan `0 < height < 720`, `stage_message` diberi tanda `"Resolusi di bawah 720p (WxH) — dari jalur cadangan"`.

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_upload_cadangan_membuat_aset_turunan_referensi(client, db, downloading_job, media_dir):
    t = client.post(f"/flow/jobs/{downloading_job.id}/upload-url", headers=dev).json()
    httpx.put(t["upload_url"], content=(media_dir / "clip.mp4").read_bytes(), headers=t["upload_headers"])
    r = client.post(f"/flow/jobs/{downloading_job.id}/uploaded", headers=dev,
                    json={"storage_key": t["storage_key"], "width": 720, "height": 1280})
    job = r.json(); asset = db.get(Asset, uuid.UUID(job["result_asset_id"]))
    assert job["status"] == "done"
    assert asset.parent_asset_id == downloading_job.reference_asset_id and asset.license_status == "internal"
    assert asset.status == "ready"  # process_asset jalan eager di tes
def test_uploaded_tanpa_file_di_storage_ditolak_422(...): ...
def test_resolusi_rendah_diberi_tanda(...): ...  # width 360 height 640 -> stage_message memuat "di bawah 720p"
def test_upload_url_hanya_untuk_job_downloading(...): ...  # job generating -> 409
```

Fixture baru di `conftest.py`: `downloading_job`, yaitu `claimed_job` yang sudah melapor stage `downloading`. `dev` = `flow_device["headers"]`.

- [ ] **Step 2:** `uv run pytest tests/test_render_result.py -v` → FAIL
- [ ] **Step 3:** Implementasikan
- [ ] **Step 4:** Tes → PASS
- [ ] **Step 5: Commit** `feat(render): hasil render jadi aset turunan + jalur upload cadangan`

---

### Task 7: Ingest folder unduhan Chrome (jalur utama)

**Files:**
- Create: `backend/app/ingest.py`
- Modify: `backend/app/worker.py`, `docker-compose.yml`
- Test: `backend/tests/test_render_ingest.py`

**Interfaces:**
- Consumes: `render.create_result_asset`, `render.result_storage_key`, `storage.upload`
- Produces:
  - `ingest.scan_download_dir(db, root: Path, now: float) -> list[str]`. Mengembalikan daftar aksi untuk log, misalnya `"attached:<file>:<job_id>"` atau `"orphan:<file>"`.
    - Hanya file `*.mp4` dengan `mtime <= now - 5` yang diproses. `.crdownload` dan file yang baru berubah dilewati.
    - Ada tepat satu job `downloading` → file di-upload ke `result_storage_key`, lalu `create_result_asset`. File dipindah ke `root/processed/`.
    - Nol job `downloading` → file dipindah ke `root/orphans/`.
    - Lebih dari satu job `downloading` → file tidak disentuh, dicatat `"ambiguous:<file>"`. Ini seharusnya tidak terjadi dengan satu device.
  - Task Celery `render.ingest_downloads` (tanpa argumen). No-op bila `flow_download_dir` kosong. Dijadwalkan lewat `celery_app.conf.beat_schedule` setiap **5 detik**.
  - `docker-compose.yml`: service `beat` (`celery -A app.worker.celery_app beat --loglevel=info`). Volume `${FLOW_DOWNLOAD_DIR:-./.flow-downloads}:/flow-downloads` di worker, dan `FLOW_DOWNLOAD_DIR=/flow-downloads` di environment worker.

- [ ] **Step 1: Tulis tes yang gagal**

```python
def test_file_stabil_dipasang_ke_job_downloading(db, tmp_path, downloading_job, media_dir):
    f = tmp_path / "Flow_video.mp4"; shutil.copy(media_dir / "clip.mp4", f); old = time.time() - 10; os.utime(f, (old, old))
    actions = scan_download_dir(db, tmp_path, now=time.time())
    assert actions == [f"attached:Flow_video.mp4:{downloading_job.id}"]
    assert (tmp_path / "processed" / "Flow_video.mp4").exists()
    db.refresh(downloading_job); assert downloading_job.status == "done"
def test_unduhan_belum_selesai_dilewati(db, tmp_path, downloading_job): ...  # .crdownload & mtime baru -> []
def test_file_tanpa_job_masuk_orphans(db, tmp_path, media_dir): ...
def test_dua_job_downloading_tidak_dipasangkan(db, tmp_path, ...): ...  # "ambiguous:..."
```

- [ ] **Step 2:** `uv run pytest tests/test_render_ingest.py -v` → FAIL
- [ ] **Step 3:** Implementasikan. Pindahkan file dengan `Path.rename`. Buat subfolder dengan `mkdir(exist_ok=True)`.
- [ ] **Step 4:** Tes → PASS. Lalu `docker compose config` → valid.
- [ ] **Step 5: Commit** `feat(render): ingest folder unduhan Chrome lewat celery beat`

---

### Task 8: Extension — pindah ke monorepo dan jembatan ke backend

**Files:**
- Move: `frontend/google-flow-autopilot/extension/*` → `flow-extension/`. `SKILL.md` → `flow-extension/SKILL.md`. `flow-autopilot-cli.mjs` tidak ikut dipindah (diganti backend), hapus dari `frontend/`. Folder ini belum ter-track git, jadi cukup dipindah lalu `git add`.
- Create: `flow-extension/lib.js`, `flow-extension/lib.test.mjs`
- Modify: `flow-extension/manifest.json`, `flow-extension/background.js`, `flow-extension/popup.html`, `flow-extension/popup.js`

**Interfaces:**
- Produces (di `lib.js`, berupa global untuk content script dan `module.exports` untuk Node):
  - `computeTargetDuration(promptText) -> "4s"|"6s"|"8s"|"10s"`. Dipindah apa adanya dari `content.js`.
  - `resolveDuration(task) -> string`. Memakai `task.target_duration` bila ada. Bila tidak, `computeTargetDuration(task.prompt)`.
  - `apiUrl(baseUrl, path) -> string`. Menormalkan garis miring. Melempar error bila `baseUrl` bukan `https://` (kecuali `http://localhost`/`127.0.0.1` untuk pengembangan).
- `manifest.json`:
  - versi `4.0`, nama `"Haraka Flow Render Bridge"`
  - `host_permissions`: hapus `localhost:3210` dan jangan pakai `"<all_urls>"`. Tambahkan `optional_host_permissions: ["https://*/*", "http://localhost/*"]`. Popup meminta izin hanya untuk origin backend yang diisi, lewat `chrome.permissions.request`.
  - `content_scripts.js`: `["lib.js", "content.js"]`
- `background.js` (pengganti total `fetchQueueFromServer` dan polling `setInterval`):
  - `chrome.storage.local` menyimpan `{backendUrl, deviceToken, activeJobId}`.
  - Pesan dari content: `{action: "API", method, path, body}` → `fetch(apiUrl(backendUrl, path), {headers: {"X-Device-Token": deviceToken, "Content-Type": "application/json"}})` → `{ok, status, data}`. Ini satu-satunya jalur jaringan ke backend.
  - `POLL_QUEUE` dari heartbeat content: bila `activeJobId` kosong, `POST /flow/claim`. Bila dapat job, simpan `activeJobId` lalu kirim `INJECT_PROMPT` ke tab Flow.
  - `JOB_FINISHED` dari content: kosongkan `activeJobId`.
  - Listener `chrome.downloads` dan `DOWNLOAD_URL` tetap dipakai.
  - Opsi `chrome.downloads`: `saveAs: false`. Folder unduhan diatur lewat setelan Chrome (runbook Task 10).
- `popup`: form `backendUrl` + `deviceToken`, tombol **Simpan & uji** (`GET /flow/ping`), dan teks status job aktif. Mode prompt manual dihapus.

- [ ] **Step 1: Tulis tes yang gagal** `flow-extension/lib.test.mjs` (node:test):

```js
test('durasi dari jumlah kata dialog', () => {
  assert.equal(computeTargetDuration('x "satu dua tiga"'), '4s');
  assert.equal(computeTargetDuration(`x "${'k '.repeat(14).trim()}"`), '6s');
  assert.equal(computeTargetDuration(`x "${'k '.repeat(22).trim()}"`), '10s');
});
test('target_duration dari backend menang', () => assert.equal(resolveDuration({ prompt: 'x "a"', target_duration: '8s' }), '8s'));
test('apiUrl menolak http non-lokal', () => assert.throws(() => apiUrl('http://contoh.id', '/flow/claim')));
test('apiUrl menormalkan garis miring', () => assert.equal(apiUrl('https://api.x.id/', 'flow/claim'), 'https://api.x.id/flow/claim'));
```

- [ ] **Step 2:** `node --test flow-extension/` → FAIL (`lib.js` belum ada)
- [ ] **Step 3:** Pindahkan file, buat `lib.js`, tulis ulang `background.js`/`popup.*`, perbarui `manifest.json`
- [ ] **Step 4:** `node --test flow-extension/` → PASS. Muat extension sebagai *unpacked* di Chrome lokal. Halaman `chrome://extensions` tidak menampilkan error. Popup **Simpan & uji** ke backend lokal (`http://localhost:8000`) menampilkan nama device.
- [ ] **Step 5: Commit** `feat(flow-extension): pindah ke monorepo, jembatan API ber-token ke backend`

---

### Task 9: Extension — pipeline job tunggal, mode B-roll, dan laporan status

**Files:**
- Modify: `flow-extension/content.js`

**Interfaces:**
- Consumes: pesan `API` / `JOB_FINISHED` (Task 8), `resolveDuration` (Task 8), endpoint status/upload Task 5–6
- Produces (perubahan perilaku):
  - `handleIncomingTask(task: FlowTask)` → `runFullFlowPipeline(task)`. Satu job = satu klip. Rantai `ctaPrompt` dan `DOWNLOAD_NOW` dihapus.
  - `reportFlow(stage, message)` → pesan `API POST /flow/jobs/{job_id}/status`. Stage yang dipakai: `uploading_ref` (sebelum upload foto), `generating` (sesudah klik generate, diulang setiap 20 detik saat menunggu, yang sekaligus menjadi heartbeat), `downloading` (sebelum klik menu unduh), `downloaded` (sesudah `waitDownloadStarted` sukses), `failed` (semua jalur error).
  - Deteksi captcha: bila ada `iframe[src*="recaptcha"]` yang terlihat, atau teks "unusual traffic", → `reportFlow('failed', 'captcha')` lalu berhenti. Tidak boleh ada klik pada captcha.
  - `configureFlowSettings(resolveDuration(task))`. Untuk `mode === "broll"`, prompt dikirim apa adanya (tanpa syarat dialog).
  - `verifyDownloadWithDashboard` dihapus. Verifikasi isi naskah ada di fase berikutnya.
  - `fallbackDownloadVideo` jalur B → `API POST /flow/jobs/{id}/upload-url` → `fetch(PUT)` blob → `API POST /flow/jobs/{id}/uploaded {storage_key, width: videoWidth, height: videoHeight}`.
  - Setiap akhir pipeline (sukses atau gagal) → `JOB_FINISHED`.
  - Teks "Rafi" diganti "Haraka Flow". Nama file cadangan `Haraka_<slot>_<job_id>.mp4`.

- [ ] **Step 1:** Ubah `content.js` sesuai daftar di atas. Tidak ada tes otomatis untuk DOM Flow. Fungsi murni yang baru masuk ke `lib.js` beserta tesnya.
- [ ] **Step 2:** `node --test flow-extension/` → PASS. Lalu `rg "localhost:3210|Rafi|ctaPrompt|flow-verdict" flow-extension/` → tidak ada hasil.
- [ ] **Step 3: Uji lokal end-to-end.**
  - Siapkan backend lokal (`docker compose up -d`) dan Chrome lokal yang login ke akun render. Buat device dan satu job `talking_head` (slot `hook`) lewat `curl` dengan foto berlisensi.
  - Hasil yang diharapkan:
    - `GET /render-jobs/{id}` berpindah `queued → claimed → uploading_ref → generating → downloading`.
    - Jalur upload cadangan menghasilkan `done`. Jalur unduhan menunggu Task 7 aktif di mesin yang sama (`FLOW_DOWNLOAD_DIR` diarahkan ke folder unduhan Chrome).
  - Ulangi dengan satu job `broll`.
- [ ] **Step 4: Commit** `feat(flow-extension): satu job per klip, mode broll, laporan status dan captcha`

---

### Task 10: Runbook VPS dan uji coba seminggu

**Files:**
- Create: `flow-extension/README.md`
- Create: `backend/scripts/render_trial_report.py`

**Interfaces:**
- Produces:
  - `README.md` berisi:
    - Desktop virtual (Xvfb + desktop ringan + VNC hanya lewat SSH tunnel). Google Chrome non-headless dengan profil khusus akun render.
    - Folder unduhan Chrome = `FLOW_DOWNLOAD_DIR` yang juga di-mount ke worker.
    - Unit systemd Chrome dengan `MemoryMax=3G`, `Restart=always`, dan timer restart harian 04:00 WIB.
    - Pasang extension lewat *Load unpacked*. Isi backend URL + token di popup. Update lewat `git pull` lalu Reload.
    - Larangan: solver captcha, flag `--load-extension`, akun Google utama bisnis.
  - `render_trial_report.py --since YYYY-MM-DD` mencetak per hari:
    - jumlah klaim;
    - jumlah job `done` / `failed`;
    - jumlah `attempt_failed` per alasan (termasuk `captcha` dan lease habis);
    - median menit dari klaim sampai `done`.
    Data diambil dari `render_jobs` + `audit_logs`. Laporan ini dipakai untuk keputusan "tetap di VPS atau pindah ke mini PC" (spec §4.2).

- [ ] **Step 1:** Tulis `README.md` dan skrip laporan. Skrip diuji dengan data dari tes Task 4–6: `uv run python -m scripts.render_trial_report --since 2026-11-01` berjalan tanpa error di database dev.
- [ ] **Step 2: Deploy ke VPS dan verifikasi manual:**
  - 5 job berurutan (3 hook, 1 cta, 1 broll) semuanya `done`.
  - Hasilnya muncul di `/aset` sebagai turunan foto referensi.
  - Matikan Chrome di tengah job → dalam ≤ 16 menit job kembali `queued` lalu selesai.
- [ ] **Step 3: Commit** `docs(flow-extension): runbook VPS dan laporan uji coba render`

---

## Roadmap sesudah fase ini (rencana terpisah)

| Fase | Isi | Bergantung pada |
|---|---|---|
| 2. Otak AI + gerbang 1 | Slot LLM (`analysis_model`, `writer_model`) di `guardrail_settings`; analisis referensi (frame FFmpeg + transkrip); `content_jobs`; script 3 hook + body/CTA per tipe; cek klaim vs `claims`; versi alternatif tanpa klaim baru; pembuatan `render_jobs` otomatis | Fase 1 |
| 3. Komposisi + gerbang 2 | Service render Remotion (Node, satu job, batas memori); 3 template (Ads, Talking Head, Hard Sell ≤15 dtk); `compositions`; cek transkrip klip vs dialog; approval review video | Fase 1–2 |
| 4. Halaman `/konten` | UI di `frontend/`: upload referensi, pilih tipe, sisa kuota, progres job, review, unduh klip mentah, render ulang per klip | Fase 1–3 (bisa dimulai paralel dengan fase 3 memakai data fase 1–2) |
