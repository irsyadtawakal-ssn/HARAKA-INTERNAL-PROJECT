"""Tab Pembuatan Konten: setting LLM, content_jobs, keputusan klaim. Selama pilot hanya owner (spec §3.5)."""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app import audit, llm
from app.db import get_db
from app.deps import client_ip, require_roles
from app.models import GuardrailSetting, User
from app.schemas import ContentLlmIn, ContentLlmOut

router = APIRouter(tags=["content"])

can_manage_content = require_roles("owner")


@router.get("/settings/content-llm", response_model=ContentLlmOut)
def get_content_llm(db: Session = Depends(get_db), _: User = Depends(can_manage_content)) -> dict:
    return llm.get_models(db)


@router.put("/settings/content-llm", response_model=ContentLlmOut)
def put_content_llm(
    body: ContentLlmIn, request: Request, db: Session = Depends(get_db), user: User = Depends(can_manage_content)
) -> dict:
    before = llm.get_models(db)
    value = {"analysis_model": body.analysis_model.strip(), "writer_model": body.writer_model.strip()}
    db.merge(GuardrailSetting(key=llm.SETTING_KEY, value=value, updated_by_id=user.id))
    audit.record(
        db, actor_type="user", actor_id=user.id, action="content_llm.update", entity="guardrail_setting",
        entity_id=llm.SETTING_KEY, before=before, after=value, ip=client_ip(request),
    )
    db.commit()
    return value
