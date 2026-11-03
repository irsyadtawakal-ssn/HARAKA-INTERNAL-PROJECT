import type { Metadata } from "next";
import { Suspense } from "react";
import { AssetDetail } from "./asset-detail";

export const metadata: Metadata = { title: "Detail aset" };

export default function AssetDetailPage() {
  return (
    <Suspense fallback={<p className="text-ink-soft">Memuat aset…</p>}>
      <AssetDetail />
    </Suspense>
  );
}
