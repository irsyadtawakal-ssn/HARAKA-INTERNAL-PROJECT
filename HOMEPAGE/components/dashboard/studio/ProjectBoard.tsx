"use client";

import React from "react";
import { Film, Image as ImageIcon } from "lucide-react";
import type { AssetRecord } from "@/lib/assetLabels";
import {
  CONTENT_TYPES,
  jobStageLabel,
  jobSteps,
  projectCategory,
  timeAgo,
  type ContentJob,
  type ContentType,
  type ProjectFilter,
} from "@/lib/contentStudio";
import s from "./studio.module.css";

type Props = {
  jobs: ContentJob[];
  assets: Record<string, AssetRecord>;
  filter: ProjectFilter;
  onFilter(f: ProjectFilter): void;
  onOpen(id: string): void;
  now: Date;
};

export const TYPE_LABEL = Object.fromEntries(CONTENT_TYPES.map((t) => [t.value, t.label])) as Record<ContentType, string>;

export const CATEGORY_LABEL: Record<Exclude<ProjectFilter, "all">, string> = {
  processing: "Diproses",
  decision: "Perlu keputusan",
  ready: "Siap",
  failed: "Gagal",
};

const TABS: { value: ProjectFilter; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "processing", label: "Diproses" },
  { value: "decision", label: "Perlu keputusan" },
  { value: "ready", label: "Siap" },
  { value: "failed", label: "Gagal" },
];

export function projectTitle(job: ContentJob): string {
  return `${TYPE_LABEL[job.type] ?? job.type} · Funnel ${job.funnel}`;
}

export default function ProjectBoard({ jobs, assets, filter, onFilter, onOpen, now }: Props) {
  const counted = jobs.map((job) => ({ job, cat: projectCategory(job) }));
  const count = (f: ProjectFilter) => (f === "all" ? jobs.length : counted.filter((c) => c.cat === f).length);
  const shown = counted.filter((c) => filter === "all" || c.cat === filter);

  return (
    <section className={s.main} aria-label="Proyek konten">
      <div className={s.row} style={{ justifyContent: "space-between" }}>
        <h3 className={s.sectionTitle}>Proyek konten</h3>
        <div className={s.tabs}>
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`${s.tab} ${filter === t.value ? s.tabActive : ""}`}
              aria-pressed={filter === t.value}
              onClick={() => onFilter(t.value)}
            >
              {t.label} <span className={s.tabCount}>{count(t.value)}</span>
            </button>
          ))}
        </div>
      </div>

      {shown.length ? (
        <div className={s.projectGrid}>
          {shown.map(({ job, cat }) => {
            const ref = assets[job.reference_asset_id];
            return (
              <button key={job.id} type="button" data-testid="project-card" className={s.projectCard} onClick={() => onOpen(job.id)}>
                <div className={s.projectThumb}>
                  {ref?.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned URL storage
                    <img src={ref.thumbnail_url} alt="" />
                  ) : ref?.type === "video" ? (
                    <Film size={28} aria-hidden />
                  ) : (
                    <ImageIcon size={28} aria-hidden />
                  )}
                  <span className={s.projectBadge} data-cat={cat}>
                    {CATEGORY_LABEL[cat]}
                  </span>
                </div>
                <div className={s.projectBody}>
                  <span className={s.projectTitle}>{projectTitle(job)}</span>
                  <span className={s.projectMeta}>
                    {timeAgo(job.created_at, now)}
                    {ref ? ` · ${ref.original_filename}` : ""}
                  </span>
                  <span className={s.stepDots}>
                    {jobSteps(job).map((st) => (
                      <span key={st.key} className={s.stepDot} data-state={st.state} />
                    ))}
                    <span>{jobStageLabel(job)}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={s.empty}>{jobs.length ? "Tidak ada konten di filter ini." : "Belum ada konten. Pilih referensi di kiri lalu Generate."}</div>
      )}
    </section>
  );
}
