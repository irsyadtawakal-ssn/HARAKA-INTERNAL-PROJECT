import type { Metadata } from "next";
import { Suspense } from "react";
import { AssetGallery } from "./asset-gallery";

export const metadata: Metadata = { title: "Aset" };

export default function AssetsPage() {
  return (
    <Suspense>
      <AssetGallery />
    </Suspense>
  );
}
