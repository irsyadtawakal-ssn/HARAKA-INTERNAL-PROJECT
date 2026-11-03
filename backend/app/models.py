"""Model data inti (PRD §12). Nilai pilihan disimpan sebagai text + CHECK, bukan enum PostgreSQL,
supaya menambah nilai cukup dengan migrasi CHECK baru tanpa ALTER TYPE."""

import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    LargeBinary,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base

ROLES = ("owner", "marketing", "creator", "ads_admin", "sales", "viewer")
FUNNELS = ("A", "B")
ASSET_FUNNELS = ("A", "B", "both")
ASSET_TYPES = ("video", "photo")
# uploading: URL upload sudah dibuat, file belum dikonfirmasi; processing: metadata/thumbnail diproses worker;
# ready: metadata siap, menunggu analisis AI; failed: pemrosesan gagal (lihat kolom error).
ASSET_STATUSES = ("uploading", "processing", "ready", "analyzed", "approved", "rejected", "archived", "failed")
LICENSE_STATUSES = ("unknown", "internal", "creator_licensed", "testimonial_consented")
REVIEW_STATUSES = ("draft", "approved", "revision_requested", "rejected")
LEAD_EVENTS = (
    "page_view",
    "whatsapp_click",
    "form_submit",
    "contacted",
    "qualified",
    "meeting_booked",
    "quotation_sent",
    "deal_won",
    "deal_lost",
    "opt_out",
)
RENDER_MODES = ("talking_head", "broll")
RENDER_SLOTS = ("hook", "body", "cta", "broll")
# Durasi klip yang bisa dipilih di Google Flow.
RENDER_DURATIONS = ("4s", "6s", "8s", "10s")
# Status selama job dipegang extension; lease dihitung dari heartbeat_at.
RENDER_ACTIVE_STATUSES = ("claimed", "uploading_ref", "generating", "downloading")
# downloaded: unduhan sudah dipicu, job tidak lagi dipegang device; menunggu file di-ingest (tetap kena lease).
RENDER_STATUSES = ("queued", *RENDER_ACTIVE_STATUSES, "downloaded", "done", "failed")
# Status yang bisa dipasangkan dengan file di folder unduhan Chrome.
RENDER_INGEST_STATUSES = ("downloading", "downloaded")
CONTENT_TYPES = ("video_ads", "talking_head", "hard_sell")
CONTENT_STATUSES = ("queued", "analyzing", "writing", "rendering", "failed")
# Posisi klip dalam satu Generate; mode broll memaksa render_jobs.slot = "broll", jadi urutan dibawa kolom ini.
CONTENT_SLOTS = ("hook1", "hook2", "hook3", "body", "cta")
APPROVAL_ACTIONS = (
    "claim",
    "testimonial",
    "promo",
    "publish_lp",
    "activate_ad",
    "budget_change",
)


def _in(column: str, values: tuple[str, ...]) -> str:
    return f"{column} IN ({', '.join(repr(v) for v in values)})"


def _uuid_pk() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


def _created_at() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint(_in("role", ROLES), name="role_valid"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    # Dinaikkan untuk mencabut semua token login milik user ini (ganti password, nonaktif).
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()


class Claim(Base):
    """Claims & Offers Library (PRD §7.8): satu-satunya sumber klaim yang boleh dipakai LP/iklan."""

    __tablename__ = "claims"
    __table_args__ = (
        CheckConstraint(
            _in("category", ("capacity", "legal", "certification", "moq", "price", "promo", "portfolio", "testimonial")),
            name="category_valid",
        ),
        CheckConstraint(_in("status", ("draft", "approved", "retired")), name="status_valid"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_key: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    approved_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = _created_at()


class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = (
        CheckConstraint(_in("type", ASSET_TYPES), name="type_valid"),
        CheckConstraint(_in("status", ASSET_STATUSES), name="status_valid"),
        CheckConstraint(_in("license_status", LICENSE_STATUSES), name="license_status_valid"),
        CheckConstraint(f"funnel IS NULL OR {_in('funnel', ASSET_FUNNELS)}", name="funnel_valid"),
        Index("assets_gallery_idx", "status", "created_at"),
        Index("assets_checksum_idx", "checksum_sha256"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="uploading")
    storage_key: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    thumbnail_key: Mapped[str | None] = mapped_column(Text)
    original_filename: Mapped[str] = mapped_column(Text, nullable=False)
    mime: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    checksum_sha256: Mapped[str | None] = mapped_column(String(64))
    duplicate_of_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assets.id"))
    duration_s: Mapped[Decimal | None] = mapped_column(Numeric(10, 3))
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    creator_name: Mapped[str | None] = mapped_column(String(120))
    captured_at: Mapped[date | None] = mapped_column(Date)
    uploaded_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    license_status: Mapped[str] = mapped_column(String(30), nullable=False, default="unknown")
    license_doc_key: Mapped[str | None] = mapped_column(Text)
    license_expires_at: Mapped[date | None] = mapped_column(Date)
    parent_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assets.id"))
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    funnel: Mapped[str | None] = mapped_column(String(4))
    notes: Mapped[str | None] = mapped_column(Text)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AgentRun(Base):
    __tablename__ = "agent_runs"
    __table_args__ = (CheckConstraint(_in("status", ("running", "succeeded", "failed")), name="status_valid"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    agent: Mapped[str] = mapped_column(String(40), nullable=False)
    input_refs: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    prompt_version: Mapped[str | None] = mapped_column(String(40))
    model: Mapped[str | None] = mapped_column(String(80))
    tokens_in: Mapped[int | None] = mapped_column(Integer)
    tokens_out: Mapped[int | None] = mapped_column(Integer)
    cost_usd: Mapped[Decimal | None] = mapped_column(Numeric(12, 6))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    output: Mapped[dict | None] = mapped_column(JSONB)
    error: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = _created_at()


class RenderDevice(Base):
    """Mesin Chrome + extension Google Flow yang boleh mengambil job render. Token disimpan sebagai hash."""

    __tablename__ = "render_devices"

    id: Mapped[uuid.UUID] = _uuid_pk()
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()


class RenderJob(Base):
    """Satu klip yang dirender di Google Flow dari satu foto referensi (spec §4.2)."""

    __tablename__ = "render_jobs"
    __table_args__ = (
        CheckConstraint(_in("mode", RENDER_MODES), name="mode_valid"),
        CheckConstraint(_in("slot", RENDER_SLOTS), name="slot_valid"),
        CheckConstraint(_in("status", RENDER_STATUSES), name="status_valid"),
        CheckConstraint(
            f"target_duration IS NULL OR {_in('target_duration', RENDER_DURATIONS)}", name="target_duration_valid"
        ),
        CheckConstraint(f"content_slot IS NULL OR {_in('content_slot', CONTENT_SLOTS)}", name="content_slot_valid"),
        Index("render_jobs_queue_idx", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    slot: Mapped[str] = mapped_column(String(10), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    # Kosong = extension menghitung durasi dari panjang dialog.
    target_duration: Mapped[str | None] = mapped_column(String(4))
    reference_asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    stage_message: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    device_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("render_devices.id"))
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    heartbeat_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    result_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assets.id"))
    # Nama file unduhan Chrome yang dilaporkan extension; dipakai ingest untuk memasangkan file ke job yang tepat.
    download_filename: Mapped[str | None] = mapped_column(String(255))
    error: Mapped[str | None] = mapped_column(Text)
    requested_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    content_job_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("content_jobs.id"))
    content_slot: Mapped[str | None] = mapped_column(String(10))
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class ContentJob(Base):
    """Satu Generate: satu konsep dari satu referensi, menjadi 3 variasi hook (spec §3.3)."""

    __tablename__ = "content_jobs"
    __table_args__ = (
        CheckConstraint(_in("type", CONTENT_TYPES), name="type_valid"),
        CheckConstraint(_in("funnel", FUNNELS), name="funnel_valid"),
        CheckConstraint(_in("status", CONTENT_STATUSES), name="status_valid"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    funnel: Mapped[str] = mapped_column(String(4), nullable=False)
    reference_asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id"), nullable=False)
    # Foto yang dikirim ke Flow: foto referensi itu sendiri, atau frame terbaik dari video referensi.
    start_asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assets.id"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="queued")
    error: Mapped[str | None] = mapped_column(Text)
    # script_id: versi yang dirender langsung. pending_script_id: versi dengan klaim baru, menunggu approval.
    script_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scripts.id"))
    pending_script_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scripts.id"))
    claim_approval_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("approvals.id"))
    requested_by_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AssetAnalysis(Base):
    __tablename__ = "asset_analysis"

    id: Mapped[uuid.UUID] = _uuid_pk()
    asset_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("assets.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_runs.id"))
    transcript: Mapped[str | None] = mapped_column(Text)
    hook_3s: Mapped[str | None] = mapped_column(Text)
    key_message: Mapped[str | None] = mapped_column(Text)
    footage_type: Mapped[str | None] = mapped_column(String(30))
    audience: Mapped[str | None] = mapped_column(String(4))
    cta_detected: Mapped[str | None] = mapped_column(Text)
    claims_detected: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    quality: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    created_at: Mapped[datetime] = _created_at()


class Script(Base):
    __tablename__ = "scripts"
    __table_args__ = (
        CheckConstraint(_in("funnel", FUNNELS), name="funnel_valid"),
        CheckConstraint("duration_s IN (15, 30, 45)", name="duration_valid"),
        CheckConstraint(_in("status", REVIEW_STATUSES), name="status_valid"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    funnel: Mapped[str] = mapped_column(String(4), nullable=False)
    duration_s: Mapped[int] = mapped_column(Integer, nullable=False)
    hooks: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    shot_list: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    caption: Mapped[str | None] = mapped_column(Text)
    headline: Mapped[str | None] = mapped_column(Text)
    cta: Mapped[str | None] = mapped_column(Text)
    source_asset_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False, default=list)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    parent_script_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scripts.id"))
    agent_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_runs.id"))
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    reviewed_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    review_comment: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()


class ContentBrief(Base):
    __tablename__ = "content_briefs"
    __table_args__ = (
        CheckConstraint(_in("type", ("editor", "creator")), name="type_valid"),
        CheckConstraint(_in("funnel", FUNNELS), name="funnel_valid"),
        CheckConstraint(_in("status", ("draft", "assigned", "in_progress", "done", "cancelled")), name="status_valid"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    funnel: Mapped[str] = mapped_column(String(4), nullable=False)
    script_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scripts.id"))
    asset_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False, default=list)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    assignee_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    due_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = _created_at()


class LandingPage(Base):
    __tablename__ = "landing_pages"
    __table_args__ = (
        CheckConstraint(_in("funnel", FUNNELS), name="funnel_valid"),
        CheckConstraint(_in("status", ("draft", "live", "paused", "archived")), name="status_valid"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    slug: Mapped[str] = mapped_column(String(120), nullable=False, unique=True)
    funnel: Mapped[str] = mapped_column(String(4), nullable=False)
    campaign_goal: Mapped[str | None] = mapped_column(Text)
    template_id: Mapped[str] = mapped_column(String(40), nullable=False)
    domain: Mapped[str | None] = mapped_column(String(253))
    # Versi yang sedang diedit dan versi yang sedang tayang; rollback = pindahkan published_version_id.
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("landing_page_versions.id", use_alter=True, name="landing_pages_current_version_fk")
    )
    published_version_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("landing_page_versions.id", use_alter=True, name="landing_pages_published_version_fk")
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    created_at: Mapped[datetime] = _created_at()
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class LandingPageVersion(Base):
    __tablename__ = "landing_page_versions"
    __table_args__ = (UniqueConstraint("landing_page_id", "version_no", "variant_key"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    landing_page_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("landing_pages.id", ondelete="CASCADE"), nullable=False
    )
    version_no: Mapped[int] = mapped_column(Integer, nullable=False)
    variant_key: Mapped[str] = mapped_column(String(4), nullable=False, default="A")
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    asset_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False, default=list)
    claim_ids: Mapped[list[uuid.UUID]] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=False, default=list)
    change_prompt: Mapped[str | None] = mapped_column(Text)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    created_by_agent_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_runs.id"))
    qa_result: Mapped[dict | None] = mapped_column(JSONB)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = _created_at()


class TrackingConfig(Base):
    __tablename__ = "tracking_configs"

    id: Mapped[uuid.UUID] = _uuid_pk()
    landing_page_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("landing_pages.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    pixel_id: Mapped[str | None] = mapped_column(String(40))
    capi_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    event_mapping: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    wa_number: Mapped[str | None] = mapped_column(String(20))
    wa_prefill_template: Mapped[str | None] = mapped_column(Text)
    utm_defaults: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    consent_text_version: Mapped[str | None] = mapped_column(String(40))


class Campaign(Base):
    __tablename__ = "campaigns"
    __table_args__ = (
        CheckConstraint(_in("funnel", FUNNELS), name="funnel_valid"),
        CheckConstraint(_in("platform", ("meta",)), name="platform_valid"),
        UniqueConstraint("platform", "external_id"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    platform: Mapped[str] = mapped_column(String(20), nullable=False, default="meta")
    external_id: Mapped[str | None] = mapped_column(String(64))
    funnel: Mapped[str] = mapped_column(String(4), nullable=False)
    objective: Mapped[str | None] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")
    daily_budget_idr: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    landing_page_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("landing_pages.id"))
    ads_system_ref: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()


class AdCreative(Base):
    __tablename__ = "ad_creatives"

    id: Mapped[uuid.UUID] = _uuid_pk()
    campaign_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False)
    adset_external_id: Mapped[str | None] = mapped_column(String(64))
    ad_external_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    creative_external_id: Mapped[str | None] = mapped_column(String(64))
    asset_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("assets.id"))
    script_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("scripts.id"))
    headline: Mapped[str | None] = mapped_column(Text)
    primary_text: Mapped[str | None] = mapped_column(Text)
    cta: Mapped[str | None] = mapped_column(String(40))
    utm: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="draft")


class AdMetricsDaily(Base):
    __tablename__ = "ad_metrics_daily"

    date: Mapped[date] = mapped_column(Date, primary_key=True)
    ad_creative_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ad_creatives.id", ondelete="CASCADE"), primary_key=True
    )
    spend_idr: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    impressions: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    clicks: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    ctr: Mapped[Decimal | None] = mapped_column(Numeric(8, 5))
    cpc_idr: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    leads: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    frequency: Mapped[Decimal | None] = mapped_column(Numeric(8, 3))


class Lead(Base):
    __tablename__ = "leads"
    __table_args__ = (
        CheckConstraint(_in("source", ("form", "wa_click", "wa_organic")), name="source_valid"),
        CheckConstraint(f"funnel IS NULL OR {_in('funnel', FUNNELS)}", name="funnel_valid"),
        Index("leads_created_idx", "created_at"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    ref_code: Mapped[str | None] = mapped_column(String(16), unique=True)
    source: Mapped[str] = mapped_column(String(20), nullable=False)
    funnel: Mapped[str | None] = mapped_column(String(4))
    landing_page_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("landing_pages.id"))
    lp_version_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("landing_page_versions.id"))
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"))
    ad_creative_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("ad_creatives.id"))
    utm: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    fbclid: Mapped[str | None] = mapped_column(Text)
    fbp: Mapped[str | None] = mapped_column(Text)
    fbc: Mapped[str | None] = mapped_column(Text)
    # PII (isi form, nomor HP) hanya boleh disimpan terenkripsi di level aplikasi (PRD §8).
    form_payload_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary)
    phone_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary)
    phone_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    consent_text_version: Mapped[str | None] = mapped_column(String(40))
    current_status: Mapped[str] = mapped_column(String(30), nullable=False, default="new")
    created_at: Mapped[datetime] = _created_at()


class LeadEvent(Base):
    __tablename__ = "lead_events"
    __table_args__ = (CheckConstraint(_in("event", LEAD_EVENTS), name="event_valid"),)

    id: Mapped[uuid.UUID] = _uuid_pk()
    lead_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    event: Mapped[str] = mapped_column(String(30), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text)
    value_idr: Mapped[Decimal | None] = mapped_column(Numeric(16, 2))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source_system: Mapped[str] = mapped_column(String(20), nullable=False)
    # Kunci idempotensi webhook (mis. id event dari sistem WA).
    external_event_id: Mapped[str | None] = mapped_column(String(80), unique=True)


class Approval(Base):
    __tablename__ = "approvals"
    __table_args__ = (
        CheckConstraint(_in("action", APPROVAL_ACTIONS), name="action_valid"),
        CheckConstraint(
            _in("status", ("pending", "approved", "rejected", "expired", "invalidated")), name="status_valid"
        ),
        Index("approvals_pending_idx", "status", "created_at"),
    )

    id: Mapped[uuid.UUID] = _uuid_pk()
    subject_type: Mapped[str] = mapped_column(String(40), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    action: Mapped[str] = mapped_column(String(30), nullable=False)
    payload_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Hash snapshot: bila isi subjek berubah setelah disetujui, hash tidak cocok -> approval invalid.
    snapshot_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    requested_by_agent_run_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("agent_runs.id"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    decided_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = _created_at()


class GuardrailSetting(Base):
    """Kill switch, batas budget, stop-loss, allowlist domain, batas biaya AI (PRD §7.7, §10)."""

    __tablename__ = "guardrail_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_by_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        CheckConstraint(_in("actor_type", ("user", "agent", "system")), name="actor_type_valid"),
        Index("audit_logs_entity_idx", "entity", "entity_id"),
        Index("audit_logs_at_idx", "at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    actor_type: Mapped[str] = mapped_column(String(10), nullable=False)
    actor_id: Mapped[str | None] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(60), nullable=False)
    entity: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(64))
    before: Mapped[dict | None] = mapped_column(JSONB)
    after: Mapped[dict | None] = mapped_column(JSONB)
    ip: Mapped[str | None] = mapped_column(String(45))
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
