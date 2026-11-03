import uuid
from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.content import pipeline, writer
from app.models import Approval, AssetAnalysis, Claim, ContentJob, RenderJob, Script

SLOTS = ["hook1", "hook2", "hook3", "body", "cta"]


def _draft(mode: str = "broll", *, claim_ids=(), new_claims=(), slots=SLOTS) -> writer.ScriptDraft:
    def slot(name: str) -> dict:
        dialog = f"Dialog {name}" if mode == "talking_head" else None
        prompt = f'A woman says: "{dialog}"' if dialog else f"Slow dolly over serum bottles {name}"
        extra = {"claim_ids": list(claim_ids), "new_claims": list(new_claims)} if name == "hook1" else {}
        return {"slot": name, "dialog": dialog, "overlay_text": f"Teks {name}", "flow_prompt": prompt, **extra}

    return writer.ScriptDraft.model_validate({"headline": "H", "caption": "C", "slots": [slot(s) for s in slots]})


def _reply(mode: str = "broll") -> dict:
    return _draft(mode).model_dump(mode="json")


@pytest.fixture
def setup(db, make_user, photo_asset):
    owner = make_user("owner")

    def _make(content_type: str = "video_ads"):
        job = ContentJob(type=content_type, funnel="A", reference_asset_id=photo_asset.id, start_asset_id=photo_asset.id, requested_by_id=owner.id)
        analysis = AssetAnalysis(asset_id=photo_asset.id, footage_type="product", tags=[], quality={})
        db.add_all([job, analysis])
        db.commit()
        return job, analysis

    return _make


def _approved(db, text="MOQ 1.000 pcs", **kw) -> Claim:
    claim = Claim(category="moq", text=text, status="approved", **kw)
    db.add(claim)
    db.commit()
    return claim


def test_klaim_terdaftar_langsung_render(db, setup, photo_asset, fake_llm):
    job, analysis = setup()
    claim = _approved(db)
    pipeline.apply_gate(db, job, _draft(claim_ids=[str(claim.id)]), photo_asset, analysis)
    db.commit()
    jobs = db.scalars(select(RenderJob).where(RenderJob.content_job_id == job.id)).all()
    assert sorted(j.content_slot for j in jobs) == sorted(SLOTS) and all(j.status == "queued" for j in jobs)
    assert job.claim_approval_id is None and job.script_id is not None and job.pending_script_id is None


def test_klaim_baru_membuat_approval_dan_alternatif(db, setup, photo_asset, fake_llm):
    job, analysis = setup()
    fake_llm.reply("writer", _reply())
    pipeline.apply_gate(db, job, _draft(new_claims=["Sertifikat halal MUI"]), photo_asset, analysis)
    db.commit()
    approval = db.get(Approval, job.claim_approval_id)
    assert approval.action == "claim" and approval.status == "pending"
    assert approval.payload_snapshot["new_claims"] == ["Sertifikat halal MUI"] and len(approval.snapshot_hash) == 64
    v1, v2 = db.get(Script, job.pending_script_id), db.get(Script, job.script_id)
    assert (v1.version, v2.version, v2.parent_script_id) == (1, 2, v1.id) and approval.subject_id == v1.id
    assert len(db.scalars(select(RenderJob).where(RenderJob.content_job_id == job.id)).all()) == 5
    assert "di luar daftar" in fake_llm.calls[0]["messages"][0]["content"]


def test_klaim_kedaluwarsa_dan_retired_dihitung_baru(db):
    old = _approved(db, "Klaim lama", valid_until=date.today() - timedelta(days=1))
    retired = Claim(category="moq", text="Klaim pensiun", status="retired")
    fresh = _approved(db, "Klaim aktif", valid_from=date.today() - timedelta(days=1), valid_until=date.today() + timedelta(days=30))
    db.add(retired)
    db.commit()
    usable = pipeline.usable_claims(db, date.today())
    assert [c.id for c in usable] == [fresh.id]
    found = pipeline.find_new_claims(_draft(claim_ids=[str(old.id), str(retired.id), str(fresh.id)]), usable)
    assert sorted(found) == sorted([f"(id tidak dikenal) {old.id}", f"(id tidak dikenal) {retired.id}"])


def test_claim_id_karangan_dihitung_baru():
    assert pipeline.find_new_claims(_draft(claim_ids=["bukan-uuid"]), []) == ["(id tidak dikenal) bukan-uuid"]


def test_alternatif_masih_ada_klaim_baru_gagal(db, setup, photo_asset, fake_llm):
    job, analysis = setup()
    fake_llm.reply("writer", _draft(new_claims=["Klaim lagi"]).model_dump(mode="json"))
    with pytest.raises(writer.WriterError, match="klaim baru"):
        pipeline.apply_gate(db, job, _draft(new_claims=["Sertifikat halal MUI"]), photo_asset, analysis)
    db.rollback()
    assert db.scalars(select(RenderJob)).all() == [] and db.scalars(select(Approval)).all() == []


@pytest.mark.parametrize("content_type, mode, flow_slots", [
    ("talking_head", "talking_head", {"hook", "body", "cta"}),
    ("video_ads", "broll", {"broll"}),
    ("hard_sell", "broll", {"broll"}),
])
def test_slot_dan_mode_sesuai_tipe(db, setup, photo_asset, content_type, mode, flow_slots):
    job, analysis = setup(content_type)
    slots = ["hook1", "hook2", "hook3", "cta"] if content_type == "hard_sell" else SLOTS
    pipeline.apply_gate(db, job, _draft(mode, slots=slots), photo_asset, analysis)
    db.commit()
    jobs = db.scalars(select(RenderJob).where(RenderJob.content_job_id == job.id)).all()
    assert len(jobs) == len(slots) and {j.mode for j in jobs} == {mode} and {j.slot for j in jobs} == flow_slots
    script = db.get(Script, job.script_id)
    assert script.duration_s == (15 if content_type == "hard_sell" else 30) and script.funnel == "A"
    assert uuid.UUID(str(script.source_asset_ids[0])) == photo_asset.id


def test_klaim_di_dialog_tanpa_deklarasi_terdeteksi():
    draft = _draft("talking_head")
    draft.slots[0].dialog = "Bersertifikat BPOM dan dijamin putih"
    draft.caption = "Sudah terbukti klinis"
    found = " | ".join(pipeline.find_new_claims(draft, []))
    assert all(token in found.lower() for token in ("bpom", "dijamin", "terbukti", "klinis"))


def test_token_berisiko_aman_bila_ada_di_klaim_terdaftar(db):
    claim = _approved(db, "Terdaftar BPOM nomor NA1234")
    draft = _draft("talking_head")
    draft.slots[0].dialog = "Produk terdaftar BPOM"
    assert pipeline.find_new_claims(draft, [claim]) == []


def test_klaim_kedaluwarsa_tampil_dengan_teksnya(db):
    old = _approved(db, "Diskon 50 persen", valid_until=date.today() - timedelta(days=1))
    found = pipeline.find_new_claims(_draft(claim_ids=[str(old.id)]), [], lookup=lambda cid: db.get(Claim, uuid.UUID(cid)))
    assert found == ["(tidak berlaku: kedaluwarsa) Diskon 50 persen"]
