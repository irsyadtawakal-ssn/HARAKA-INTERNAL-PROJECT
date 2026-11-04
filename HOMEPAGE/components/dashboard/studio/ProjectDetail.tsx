"use client";

import React, { useState } from "react";
import { Check, Film, Image as ImageIcon, RefreshCw, X } from "lucide-react";
import dash from "@/app/dashboard/dashboard.module.css";
import type { AssetRecord } from "@/lib/assetLabels";
import {
  CLIP_STATUS_LABELS,
  groupVideos,
  isClaimPending,
  jobSteps,
  slotLabel,
  timeAgo,
  type ContentJob,
  type RenderJob,
  type Script,
} from "@/lib/contentStudio";
import { projectTitle } from "./ProjectBoard";
import s from "./studio.module.css";

type Props = {
  job: ContentJob;
  script?: Script;
  reference?: AssetRecord;
  clipUrls: Record<string, string>;
  onClipError(assetId: string): void;
  onDecide(d: "approve" | "reject", note: string): void;
  onRetryJob(): void;
  onRetryClip(clipId: string): void;
  busy: Record<string, boolean>;
  error?: string;
  onClose(): void;
};

function ClipTile({ clip, url, busy, onError, onRetry }: { clip: RenderJob; url?: string; busy?: boolean; onError(): void; onRetry(): void }) {
  if (clip.status === "done" && url) {
    return (
      <div className={s.clipTile} data-status="done" title={slotLabel(clip.content_slot)}>
        <video src={url} controls playsInline onError={onError} />
      </div>
    );
  }
  return (
    <div className={s.clipTile} data-status={clip.status}>
      <span className={s.clipSlot}>{slotLabel(clip.content_slot)}</span>
      <span>{CLIP_STATUS_LABELS[clip.status] ?? clip.status}</span>
      {clip.status === "failed" && (
        <button type="button" className={s.retry} disabled={busy} onClick={onRetry}>
          Render ulang
        </button>
      )}
    </div>
  );
}

export default function ProjectDetail(p: Props) {
  const [note, setNote] = useState("");
  const { job } = p;
  const { videos, shared, others } = groupVideos(job, p.script);
  const tile = (clip: RenderJob) => (
    <ClipTile
      key={clip.id}
      clip={clip}
      url={clip.result_asset_id ? p.clipUrls[clip.result_asset_id] : undefined}
      busy={p.busy[`clip:${clip.id}`]}
      onError={() => clip.result_asset_id && p.onClipError(clip.result_asset_id)}
      onRetry={() => p.onRetryClip(clip.id)}
    />
  );

  return (
    <div className={s.backdrop} onClick={p.onClose}>
      <div role="dialog" aria-label={projectTitle(job)} className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHead}>
          <div className={s.drawerThumb}>
            {p.reference?.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- presigned URL storage
              <img src={p.reference.thumbnail_url} alt="" />
            ) : p.reference?.type === "video" ? (
              <Film size={20} aria-hidden />
            ) : (
              <ImageIcon size={20} aria-hidden />
            )}
          </div>
          <div>
            <h3 className={s.sectionTitle}>{projectTitle(job)}</h3>
            <span className={s.hint}>
              {timeAgo(job.created_at, new Date())}
              {p.reference ? ` · dari ${p.reference.original_filename}` : ""}
            </span>
          </div>
          <button type="button" className={s.iconButton} aria-label="Tutup" onClick={p.onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={s.stepper}>
          {jobSteps(job).map((st) => (
            <div key={st.key} className={s.stepItem} data-state={st.state}>
              <span>{st.label}</span>
              {st.detail && <span className={s.stepDetail}>{st.detail}</span>}
            </div>
          ))}
        </div>

        {job.error && <div className={s.error}>{job.error}</div>}
        {p.error && <div className={s.error}>{p.error}</div>}
        {job.status === "failed" && (
          <div>
            <button type="button" className={dash.btnSecondary} disabled={p.busy[`job:${job.id}`]} onClick={p.onRetryJob}>
              <RefreshCw size={14} /> Ulangi job
            </button>
          </div>
        )}

        {isClaimPending(job) && (
          <div className={s.claimBox}>
            <strong>Klaim baru perlu keputusan</strong>
            <span>Versi tanpa klaim baru sudah dirender. Setujui untuk mendaftarkan klaim baru dan merender versi aslinya.</span>
            <textarea
              aria-label="Catatan keputusan klaim"
              placeholder="Catatan (opsional)"
              className={s.note}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className={s.row}>
              <button type="button" className={dash.btnSecondary} disabled={p.busy[`claim:${job.id}`]} onClick={() => p.onDecide("approve", note)}>
                <Check size={14} /> Setujui
              </button>
              <button type="button" className={dash.btnSecondary} disabled={p.busy[`claim:${job.id}`]} onClick={() => p.onDecide("reject", note)}>
                <X size={14} /> Tolak
              </button>
            </div>
          </div>
        )}

        <div>
          <span className={s.stepLabel}>Hasil: 3 video</span>
          <div className={s.videoCols}>
            {videos.map((v) => (
              <div key={v.index} className={s.videoCol}>
                <span className={s.videoTitle}>Video {v.index}</span>
                <span className={s.videoHook}>{v.hookText ? `“${v.hookText}”` : "Hook belum ditulis"}</span>
                <div className={s.clipStrip}>
                  {v.clips.map(tile)}
                  {v.missing.map((slot) => (
                    <div key={slot} className={s.clipTile}>
                      <span className={s.clipSlot}>{slotLabel(slot)}</span>
                      <span>Belum ada</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {(shared.body || shared.cta) && (
          <div className={s.shared}>
            <span className={s.stepLabel}>Dipakai di ketiga video</span>
            {shared.body && (
              <span>
                <strong>Body:</strong> {shared.body}
              </span>
            )}
            {shared.cta && (
              <span>
                <strong>CTA:</strong> {shared.cta}
              </span>
            )}
          </div>
        )}

        {others.length > 0 && (
          <div>
            <span className={s.stepLabel}>Klip lain</span>
            <div className={s.clipStrip} style={{ gridAutoColumns: "90px" }}>
              {others.map(tile)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
