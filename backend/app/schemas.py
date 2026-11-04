import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Role = Literal["owner", "marketing", "creator", "ads_admin", "sales", "viewer"]
AssetFunnel = Literal["A", "B", "both"]
LicenseStatus = Literal["unknown", "internal", "creator_licensed", "testimonial_consented"]


class LoginIn(BaseModel):
    # Bukan EmailStr: login hanya mencocokkan dengan email yang sudah tersimpan.
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str
    role: Role
    is_active: bool
    last_login_at: datetime | None


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(default="", max_length=120)
    password: str = Field(min_length=10, max_length=200)
    role: Role


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    role: Role | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=10, max_length=200)


class UploadUrlIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    mime: str
    size_bytes: int = Field(gt=0)
    parent_asset_id: uuid.UUID | None = None


class UploadUrlOut(BaseModel):
    asset_id: uuid.UUID
    upload_url: str
    upload_headers: dict[str, str]
    expires_in: int


class AssetMetadataIn(BaseModel):
    creator_name: str | None = Field(default=None, max_length=120)
    captured_at: date | None = None
    license_status: LicenseStatus = "unknown"
    license_expires_at: date | None = None
    funnel: AssetFunnel | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AssetUpdate(BaseModel):
    creator_name: str | None = Field(default=None, max_length=120)
    captured_at: date | None = None
    license_status: LicenseStatus | None = None
    license_expires_at: date | None = None
    funnel: AssetFunnel | None = None
    notes: str | None = Field(default=None, max_length=2000)


class AssetReviewIn(BaseModel):
    action: Literal["approve", "reject", "archive"]
    note: str | None = Field(default=None, max_length=2000)


class AssetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: Literal["video", "photo"]
    status: str
    original_filename: str
    mime: str
    size_bytes: int
    checksum_sha256: str | None
    duplicate_of_id: uuid.UUID | None
    duration_s: Decimal | None
    width: int | None
    height: int | None
    creator_name: str | None
    captured_at: date | None
    uploaded_by_id: uuid.UUID
    license_status: LicenseStatus
    license_expires_at: date | None
    parent_asset_id: uuid.UUID | None
    version: int
    funnel: AssetFunnel | None
    notes: str | None
    error: str | None
    created_at: datetime
    updated_at: datetime
    thumbnail_url: str | None = None
    # Hanya diisi di endpoint detail.
    original_url: str | None = None


class AssetPage(BaseModel):
    items: list[AssetOut]
    total: int


# --- Render Google Flow (spec §4.2) ---
RenderMode = Literal["talking_head", "broll"]
RenderSlot = Literal["hook", "body", "cta", "broll"]
RenderDuration = Literal["4s", "6s", "8s", "10s"]


class RenderDeviceIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class RenderDeviceUpdate(BaseModel):
    is_active: bool


class RenderDeviceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    is_active: bool
    last_seen_at: datetime | None


class RenderDeviceCreated(RenderDeviceOut):
    # Hanya muncul sekali, saat device dibuat.
    token: str


class RenderJobIn(BaseModel):
    reference_asset_id: uuid.UUID
    mode: RenderMode
    slot: RenderSlot
    prompt: str = Field(min_length=1, max_length=4000)
    target_duration: RenderDuration | None = None


class RenderJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    mode: RenderMode
    slot: RenderSlot
    prompt: str
    target_duration: RenderDuration | None
    reference_asset_id: uuid.UUID
    status: str
    stage_message: str | None
    attempts: int
    error: str | None
    result_asset_id: uuid.UUID | None
    content_slot: str | None = None
    created_at: datetime
    updated_at: datetime


class ContentJobIn(BaseModel):
    type: Literal["video_ads", "talking_head", "hard_sell"]
    funnel: Literal["A", "B"]
    reference_asset_id: uuid.UUID


class ContentJobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    funnel: str
    status: str
    error: str | None
    reference_asset_id: uuid.UUID
    start_asset_id: uuid.UUID | None
    script_id: uuid.UUID | None
    pending_script_id: uuid.UUID | None
    claim_approval_id: uuid.UUID | None
    render_jobs: list[RenderJobOut] = []
    created_at: datetime
    updated_at: datetime


class FlowTask(BaseModel):
    job_id: uuid.UUID
    mode: RenderMode
    slot: RenderSlot
    prompt: str
    target_duration: RenderDuration | None
    reference_asset_id: uuid.UUID
    reference_url: str
    reference_filename: str


class FlowClaimOut(BaseModel):
    job: FlowTask | None
    reason: Literal["ok", "empty", "quota"]


class RenderQuotaOut(BaseModel):
    limit: int
    used: int
    remaining: int


class FlowStatusIn(BaseModel):
    stage: Literal["uploading_ref", "generating", "downloading", "downloaded", "failed"]
    message: str = Field(default="", max_length=300)
    # Untuk stage downloaded: nama file unduhan Chrome (path lengkap boleh; yang disimpan hanya nama file).
    filename: str | None = Field(default=None, max_length=1024)


class FlowUploadUrlOut(BaseModel):
    upload_url: str
    upload_headers: dict[str, str]
    storage_key: str


class FlowUploadedIn(BaseModel):
    storage_key: str = Field(min_length=1, max_length=300)
    width: int | None = Field(default=None, ge=0)
    height: int | None = Field(default=None, ge=0)


class ScriptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    funnel: str
    duration_s: int
    headline: str | None
    caption: str | None
    hooks: list[dict]
    body: str
    cta: str | None
    shot_list: list
    version: int
    parent_script_id: uuid.UUID | None
    status: str
    created_at: datetime


class ContentLlmIn(BaseModel):
    analysis_model: str = Field(max_length=120)
    writer_model: str = Field(max_length=120)


class ContentLlmOut(ContentLlmIn):
    pass
