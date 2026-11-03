import pytest
from sqlalchemy.exc import IntegrityError

from app.models import ContentJob, RenderJob


def _job(photo_asset, owner, **kw) -> ContentJob:
    return ContentJob(
        type=kw.pop("type", "video_ads"), funnel="A", reference_asset_id=kw.pop("reference_asset_id", photo_asset.id),
        requested_by_id=owner.id, **kw,
    )


def test_content_job_default_queued(db, photo_asset, make_user):
    job = _job(photo_asset, make_user("owner"))
    db.add(job)
    db.commit()
    assert job.status == "queued" and job.script_id is None and job.claim_approval_id is None


def test_tipe_tidak_dikenal_ditolak(db, photo_asset, make_user):
    db.add(_job(photo_asset, make_user("owner"), type="podcast"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_referensi_tidak_ada_ditolak(db, photo_asset, make_user):
    import uuid

    db.add(_job(photo_asset, make_user("owner"), reference_asset_id=uuid.uuid4()))
    with pytest.raises(IntegrityError):
        db.commit()


def test_content_slot_hanya_nilai_valid(db, photo_asset, make_user):
    owner = make_user("owner")
    db.add(RenderJob(mode="broll", slot="broll", prompt="p", reference_asset_id=photo_asset.id, requested_by_id=owner.id, content_slot="hook9"))
    with pytest.raises(IntegrityError):
        db.commit()
