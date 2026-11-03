import json

import httpx
import pytest
from sqlalchemy import select

from app import llm, storage
from app.content import analysis
from app.models import Asset, AssetAnalysis, ContentJob

RESULT = {"footage_type": "product", "best_frame": 0, "hook_3s": "Serum glowing", "key_message": "Maklon skincare", "tags": ["serum"], "quality": {}}


def _job(db, owner, asset) -> ContentJob:
    job = ContentJob(type="video_ads", funnel="A", reference_asset_id=asset.id, requested_by_id=owner.id)
    db.add(job)
    db.commit()
    return job


@pytest.fixture
def owner(make_user):
    return make_user("owner")


def test_foto_dipakai_sebagai_start_frame(db, owner, stored_asset, fake_llm):
    photo = stored_asset("photo")
    fake_llm.reply("analysis", RESULT)
    found, start = analysis.analyze_reference(db, _job(db, owner, photo))
    assert start.id == photo.id
    assert found.footage_type == "product" and found.agent_run_id is not None
    assert len(db.scalars(select(AssetAnalysis)).all()) == 1


def test_video_membuat_foto_start_frame(db, owner, stored_asset, fake_llm):
    video = stored_asset("video")
    fake_llm.reply("analysis", {**RESULT, "best_frame": 2})
    _, start = analysis.analyze_reference(db, _job(db, owner, video))
    assert start.id != video.id and start.type == "photo" and start.parent_asset_id == video.id
    assert start.license_status == "creator_licensed" and start.status == "ready"
    assert storage.head(start.storage_key) is not None
    parts = fake_llm.calls[0]["messages"][-1]["content"]
    assert sum(1 for p in parts if p["type"] == "image_url") == 6


def test_analisis_dipakai_ulang(db, owner, stored_asset, fake_llm):
    video = stored_asset("video")
    fake_llm.reply("analysis", RESULT)
    job = _job(db, owner, video)
    _, first = analysis.analyze_reference(db, job)
    _, second = analysis.analyze_reference(db, job)
    assert len(fake_llm.calls) == 1 and second.id == first.id
    assert len(db.scalars(select(Asset).where(Asset.parent_asset_id == video.id)).all()) == 1


def test_video_rusak_gagal_rapi(db, owner, make_user, media_dir, fake_llm):
    import uuid

    asset_id = uuid.uuid4()
    key = f"assets/{asset_id}/original.mp4"
    storage.upload(media_dir / "broken.mp4", key, "video/mp4")
    broken = Asset(
        id=asset_id, type="video", status="ready", storage_key=key, original_filename="broken.mp4", mime="video/mp4",
        size_bytes=10, uploaded_by_id=owner.id, license_status="internal",
    )
    db.add(broken)
    db.commit()
    with pytest.raises(analysis.AnalysisError, match="frame"):
        analysis.analyze_reference(db, _job(db, owner, broken))
    assert fake_llm.calls == []


def test_best_frame_di_luar_rentang_pakai_tengah(db, owner, stored_asset, fake_llm):
    video = stored_asset("video")
    fake_llm.reply("analysis", {**RESULT, "best_frame": 99, "footage_type": "alien"})
    found, start = analysis.analyze_reference(db, _job(db, owner, video))
    assert start.type == "photo" and found.footage_type == "other"


def test_transkrip_opsional(db, monkeypatch):
    base = llm.get_settings.__wrapped__()
    monkeypatch.setattr(llm, "get_settings", lambda: base.model_copy(update={"llm_base_url": "http://x/v1", "llm_api_key": "k", "llm_transcribe_model": "whisper"}))
    monkeypatch.setattr(llm, "_transport", httpx.MockTransport(lambda r: httpx.Response(200, json={"text": "Halo semua"})))
    import tempfile
    from pathlib import Path

    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        wav.write_bytes(b"RIFF")
        assert llm.transcribe(db, wav) == "Halo semua"
    monkeypatch.setattr(llm, "_transport", httpx.MockTransport(lambda r: httpx.Response(500, text="boom")))
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "a.wav"
        wav.write_bytes(b"RIFF")
        assert llm.transcribe(db, wav) is None
    assert json  # noqa: B018
