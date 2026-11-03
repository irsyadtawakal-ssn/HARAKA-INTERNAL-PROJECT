# Haraka Erfi — AI Marketing Factory

Sistem internal: upload aset → AI meramu script/LP/draft iklan → review manusia → tayang → baca hasil → ulang.
Spesifikasi lengkap ada di [docs/PRD-haraka-ai-marketing-factory.md](docs/PRD-haraka-ai-marketing-factory.md).

## Status

| Bagian (PRD §14) | Status |
|---|---|
| Hari 1 — fondasi: infra dev, skema DB §12 (19 tabel) + migrasi, auth JWT + RBAC 6 peran, audit log | ✅ |
| Hari 2 — Asset Library API: upload presigned, metadata, thumbnail, checksum/duplikat, lisensi, review | ✅ |
| Dashboard Next.js: login, galeri + filter, upload drag-and-drop dengan progres, detail aset + review | ✅ |
| Hari 2 — perubahan repo WA (W-01) | ⏳ belum |
| Hari 3 dan seterusnya | ⏳ belum |

## Struktur

```
docker-compose.yml     Postgres 16 (5442), Redis (6390), S3 dev (9010); profil "app" = API (8010) + worker
backend/
  app/
    models.py          entitas PRD §12
    routers/           auth, users, assets
    worker.py          Celery: proses aset (checksum, ffprobe, thumbnail)
    storage.py         S3 + presigned URL
  alembic/             migrasi
  scripts/             set_password, smoke
  tests/               pytest terhadap Postgres/S3/ffmpeg sungguhan
frontend/              Next.js 16 (port 3010): dashboard internal
  src/proxy.ts         tanpa cookie sesi -> /login
  src/app/api/         BFF: login (cookie httpOnly) + proxy ke FastAPI; token tidak pernah sampai ke JavaScript browser
  src/app/(app)/aset/  galeri dan detail aset
docs/                  PRD + blueprint
```

## Menjalankan (dev)

Butuh Docker, [uv](https://docs.astral.sh/uv/), dan ffmpeg di PATH.

```bash
docker compose up -d
```

```bash
cd backend && cp .env.example .env
```

Isi `JWT_SECRET` dan `BOOTSTRAP_OWNER_*` di `backend/.env`, lalu:

```bash
cd backend && uv sync && uv run alembic upgrade head && uv run uvicorn app.main:app --port 8010 --reload
```

Dokumentasi API interaktif: http://127.0.0.1:8010/docs. Owner pertama dibuat otomatis dari `BOOTSTRAP_OWNER_*`
saat tabel users masih kosong. Dengan `CELERY_EAGER=true`, aset diproses langsung di proses API (tanpa worker).

Dashboard (butuh API di port 8010):

```bash
cd frontend && cp .env.example .env.local && npm install && npm run dev -- --port 3010
```

Buka http://localhost:3010 dan masuk dengan akun owner dari `BOOTSTRAP_OWNER_*`.

Semua di container (API + worker Celery sungguhan):

```bash
docker compose --profile app up -d --build
```

## Uji

```bash
cd backend && uv run pytest
```

Smoke test terhadap API yang sedang berjalan (health → login owner → upload foto → status `ready`):

```bash
cd backend && uv run python -m scripts.smoke
```

## Catatan

- Object storage dev memakai `zenko/cloudserver` karena image MinIO tidak bisa di-pull dari mesin ini.
  Production cukup mengganti `S3_*` di `.env`.
- Upload saat ini satu PUT (maks 5 GB di S3; batas app 2 GB). Upload multipart/resumable (PRD A-01) belum.
- Kolom PII di `leads` sengaja berbentuk `*_encrypted` (bytea); enkripsinya dibangun bersama endpoint lead (Hari 5).
- Login belum punya pembatasan percobaan gagal (rate limit) — wajib sebelum production.
