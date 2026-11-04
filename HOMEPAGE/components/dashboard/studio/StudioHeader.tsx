"use client";

import React from "react";
import { Gauge, Layers, Plug, PlugZap } from "lucide-react";
import type { ProjectFilter, Quota } from "@/lib/contentStudio";
import s from "./studio.module.css";

export type FlowState = "online" | "offline" | "none" | "unknown";

type Props = {
  quota: Quota | null;
  flow: FlowState;
  counts: Record<Exclude<ProjectFilter, "all">, number>;
};

const FLOW: Record<FlowState, { label: string; hint: string; cls: string }> = {
  online: { label: "Online", hint: "Klip dirender otomatis", cls: s.flowOnline },
  offline: { label: "Offline", hint: "Klip menunggu sampai mesin online", cls: s.flowOffline },
  none: { label: "Belum terhubung", hint: "Extension Flow belum tersambung", cls: s.flowNone },
  unknown: { label: "Belum terhubung", hint: "Status mesin belum bisa dibaca", cls: s.flowNone },
};

export default function StudioHeader({ quota, flow, counts }: Props) {
  const f = FLOW[flow];
  return (
    <div className={s.stats}>
      <div className={s.stat}>
        <span className={s.statLabel}>Kuota hari ini</span>
        <span className={s.statValue}>
          <Gauge size={16} aria-hidden /> {quota ? `${quota.remaining} / ${quota.limit} klip` : "-"}
        </span>
        <span className={s.statHint}>Reset tiap pukul 00.00 WIB</span>
      </div>
      <div className={s.stat}>
        <span className={s.statLabel}>Mesin render Flow</span>
        <span className={`${s.statValue} ${f.cls}`}>
          {flow === "online" ? <PlugZap size={16} aria-hidden /> : <Plug size={16} aria-hidden />} {f.label}
        </span>
        <span className={s.statHint}>{f.hint}</span>
      </div>
      <div className={s.stat}>
        <span className={s.statLabel}>Proyek</span>
        <span className={s.statValue}>
          <Layers size={16} aria-hidden /> {counts.processing} diproses · {counts.decision} perlu keputusan
        </span>
        <span className={s.statHint}>
          {counts.ready} siap · {counts.failed} gagal
        </span>
      </div>
    </div>
  );
}
