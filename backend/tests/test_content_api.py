import uuid

import pytest
from sqlalchemy import select

from app import llm
from app.content import pipeline
from app.models import AgentRun, Approval, Claim, ContentJob, RenderJob, Script

ANALYSIS = {"footage_type": "product", "best_frame": 1, "hook_3s": "Serum glowing", "key_message": "Maklon skincare", "tags": ["serum"], "quality": {}}
ADS = ["hook1", "hook2", "hook3", "body", "cta"]


def _writer_reply(*, new_claims=(), slots=ADS) -> dict:
    def slot(name: str) -> dict:
        extra = {"new_claims": list(new_claims)} if name == "hook1" else {}
        return {"slot": name, "overlay_text": f"Teks {name}", "flow_prompt": f"Slow dolly over serum bottles {name}", "target_duration": "8s", **extra}

    return {"headline": "H", "caption": "C", "slots": [slot(s) for s in slots]}


def _post(client, headers, asset, **kw):
    return client.post("/content-jobs", headers=headers, json={"type": "video_ads", "funnel": "A", "reference_asset_id": str(asset.id), **kw})


def _get(client, headers, job_id) -> dict:
    return client.get(f"/content-jobs/{job_id}", headers=headers).json()


def test_alur_penuh_foto(client, db, owner_headers, stored_asset, fake_llm):
    photo = stored_asset("photo")
    fake_llm.reply("analysis", ANALYSIS)
    fake_llm.reply("writer", _writer_reply())
    r = _post(client, owner_headers, photo)
    assert r.status_code == 201, r.text
    job = _get(client, owner_headers, r.json()["id"])
    assert job["status"] == "rendering" and job["error"] is None and job["start_asset_id"] == str(photo.id)
    assert sorted(j["content_slot"] for j in job["render_jobs"]) == sorted(ADS)
    assert sorted(a.agent for a in db.scalars(select(AgentRun))) == ["content_analysis", "content_writer"]
    assert [j["id"] for j in client.get("/content-jobs", headers=owner_headers).json()] == [job["id"]]


def test_talking_head_tolak_foto_tanpa_izin(client, db, owner_headers, stored_asset, fake_llm):
    photo = stored_asset("photo", license_status="unknown")
    r = _post(client, owner_headers, photo, type="talking_head")
    assert r.status_code == 422 and fake_llm.calls == []
    assert _post(client, owner_headers, stored_asset("photo", "unknown")).status_code == 422
    assert _post(client, owner_headers, stored_asset("video", "unknown"), type="talking_head").status_code == 422


def test_referensi_tidak_ada_404(client, owner_headers):
    r = client.post("/content-jobs", headers=owner_headers, json={"type": "video_ads", "funnel": "A", "reference_asset_id": str(uuid.uuid4())})
    assert r.status_code == 404


def test_video_referensi_masuk(client, owner_headers, stored_asset, fake_llm):
    video = stored_asset("video")
    fake_llm.reply("analysis", ANALYSIS)
    fake_llm.reply("writer", _writer_reply())
    job = _get(client, owner_headers, _post(client, owner_headers, video).json()["id"])
    assert job["status"] == "rendering" and job["start_asset_id"] not in (None, str(video.id))
    assert {j["reference_asset_id"] for j in job["render_jobs"]} == {job["start_asset_id"]}


def test_llm_gagal_job_failed_lalu_retry(client, db, owner_headers, stored_asset, fake_llm):
    photo = stored_asset("photo")
    fake_llm.reply("analysis", llm.LLMError("LLM tidak bisa dihubungi: refused"))
    job = _get(client, owner_headers, _post(client, owner_headers, photo).json()["id"])
    assert job["status"] == "failed" and "tidak bisa dihubungi" in job["error"] and job["render_jobs"] == []
    assert db.scalars(select(RenderJob)).all() == []

    fake_llm.reply("analysis", ANALYSIS)
    fake_llm.reply("writer", _writer_reply())
    assert client.post(f"/content-jobs/{job['id']}/retry", headers=owner_headers).status_code == 200
    assert _get(client, owner_headers, job["id"])["status"] == "rendering"
    assert client.post(f"/content-jobs/{job['id']}/retry", headers=owner_headers).status_code == 409


def test_penulis_gagal_menyimpan_agent_run_dan_nol_render(client, db, owner_headers, stored_asset, fake_llm):
    photo = stored_asset("photo")
    fake_llm.reply("analysis", ANALYSIS)
    fake_llm.reply("writer", "bukan json")
    fake_llm.reply("writer", "tetap bukan json")
    job = _get(client, owner_headers, _post(client, owner_headers, photo).json()["id"])
    assert job["status"] == "failed" and "dua percobaan" in job["error"]
    assert db.scalars(select(RenderJob)).all() == [] and len(db.scalars(select(AgentRun)).all()) == 3


def test_task_dua_kali_tidak_menggandakan(client, db, owner_headers, stored_asset, fake_llm):
    photo = stored_asset("photo")
    fake_llm.reply("analysis", ANALYSIS)
    fake_llm.reply("writer", _writer_reply())
    job_id = _post(client, owner_headers, photo).json()["id"]
    calls = len(fake_llm.calls)
    pipeline.run_generate(db, uuid.UUID(job_id))
    assert len(fake_llm.calls) == calls and len(db.scalars(select(RenderJob)).all()) == 5


@pytest.fixture
def pending_claim(client, db, owner_headers, stored_asset, fake_llm):
    photo = stored_asset("photo")
    fake_llm.reply("analysis", ANALYSIS)
    fake_llm.reply("writer", _writer_reply(new_claims=["Sertifikat halal MUI"]))
    fake_llm.reply("writer", _writer_reply())
    return _get(client, owner_headers, _post(client, owner_headers, photo).json()["id"])


def test_keputusan_klaim_approve(client, db, owner_headers, pending_claim):
    job = pending_claim
    assert job["claim_approval_id"] and job["pending_script_id"] and len(job["render_jobs"]) == 5
    r = client.post(f"/content-jobs/{job['id']}/claim-decision", headers=owner_headers, json={"decision": "approve"})
    assert r.status_code == 200, r.text
    after = _get(client, owner_headers, job["id"])
    assert len(after["render_jobs"]) == 10 and after["pending_script_id"] is None
    assert sorted(j["content_slot"] for j in after["render_jobs"]) == sorted(ADS * 2)
    claim = db.scalar(select(Claim).where(Claim.text == "Sertifikat halal MUI"))
    assert claim.status == "approved" and claim.approved_by_id is not None
    assert db.get(Approval, uuid.UUID(job["claim_approval_id"])).status == "approved"
    assert db.get(Script, uuid.UUID(job["pending_script_id"])).status == "approved"


def test_keputusan_klaim_reject(client, db, owner_headers, pending_claim):
    job = pending_claim
    r = client.post(f"/content-jobs/{job['id']}/claim-decision", headers=owner_headers, json={"decision": "reject", "note": "belum ada sertifikat"})
    assert r.status_code == 200
    after = _get(client, owner_headers, job["id"])
    assert len(after["render_jobs"]) == 5 and after["pending_script_id"] is None
    assert db.get(Script, uuid.UUID(job["pending_script_id"])).status == "rejected"
    assert db.get(Approval, uuid.UUID(job["claim_approval_id"])).status == "rejected"
    assert db.scalar(select(Claim).where(Claim.text == "Sertifikat halal MUI")) is None
    assert client.post(f"/content-jobs/{job['id']}/claim-decision", headers=owner_headers, json={"decision": "approve"}).status_code == 409


def test_peran_marketing_ditolak(client, as_role, stored_asset):
    marketing = as_role("marketing")
    assert _post(client, marketing, stored_asset("photo")).status_code == 403
    assert client.post(f"/content-jobs/{uuid.uuid4()}/claim-decision", headers=marketing, json={"decision": "approve"}).status_code == 403
    assert client.get("/content-jobs", headers=marketing).status_code == 403
