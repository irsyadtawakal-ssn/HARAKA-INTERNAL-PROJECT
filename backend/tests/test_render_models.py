import pytest
from sqlalchemy.exc import IntegrityError

from app.models import RenderJob


def _job(owner, photo_asset, **overrides) -> RenderJob:
    fields = dict(
        mode="talking_head",
        slot="hook",
        prompt='Close-up. She says: "Halo"',
        reference_asset_id=photo_asset.id,
        requested_by_id=owner.id,
    )
    fields.update(overrides)
    return RenderJob(**fields)


def test_job_baru_default_queued(db, make_user, photo_asset):
    job = _job(make_user("owner"), photo_asset)
    db.add(job)
    db.commit()
    assert job.status == "queued" and job.attempts == 0 and job.target_duration is None


def test_status_render_job_tidak_valid_ditolak(db, make_user, photo_asset):
    db.add(_job(make_user("owner"), photo_asset, status="melayang"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_target_duration_hanya_nilai_flow(db, make_user, photo_asset):
    db.add(_job(make_user("owner"), photo_asset, target_duration="7s"))
    with pytest.raises(IntegrityError):
        db.commit()


def test_mode_dan_slot_divalidasi(db, make_user, photo_asset):
    owner = make_user("owner")
    db.add(_job(owner, photo_asset, mode="vlog"))
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
    db.add(_job(owner, photo_asset, slot="outro"))
    with pytest.raises(IntegrityError):
        db.commit()
