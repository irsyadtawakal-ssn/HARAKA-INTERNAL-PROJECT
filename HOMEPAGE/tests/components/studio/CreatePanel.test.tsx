import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CreatePanel from "@/components/dashboard/studio/CreatePanel";
import type { AssetRecord } from "@/lib/assetLabels";

const asset = (id: string, status: AssetRecord["status"] = "ready"): AssetRecord => ({
  id,
  type: "photo",
  status,
  original_filename: `${id}.jpg`,
  license_status: "internal",
  funnel: "A",
  parent_asset_id: null,
  thumbnail_url: null,
});

function setup(over: Partial<React.ComponentProps<typeof CreatePanel>> = {}) {
  const props: React.ComponentProps<typeof CreatePanel> = {
    references: [asset("a1")],
    processing: [asset("p1", "processing")],
    refId: "a1",
    onPickRef: vi.fn(),
    type: "video_ads",
    onType: vi.fn(),
    funnel: "A",
    onFunnel: vi.fn(),
    license: "",
    onLicense: vi.fn(),
    onUpload: vi.fn(),
    uploadProgress: null,
    uploadError: null,
    formError: null,
    submitting: false,
    flowOffline: false,
    onGenerate: vi.fn(),
    ...over,
  };
  render(<CreatePanel {...props} />);
  return props;
}

describe("CreatePanel", () => {
  it("summary follows type", () => {
    setup({ type: "hard_sell" });
    expect(screen.getByText(/memakai 4 klip kuota/)).toBeInTheDocument();
  });

  it("processing asset not selectable", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: /p1\.jpg/ }));
    expect(props.onPickRef).not.toHaveBeenCalled();
  });

  it("generate calls once and disables while submitting", () => {
    const props = setup();
    fireEvent.click(screen.getByRole("button", { name: "Generate" }));
    expect(props.onGenerate).toHaveBeenCalledTimes(1);
  });

  it("disables generate while submitting", () => {
    setup({ submitting: true });
    expect(screen.getByRole("button", { name: "Generate" })).toBeDisabled();
  });

  it("warns when the render machine is offline", () => {
    setup({ flowOffline: true });
    expect(screen.getByText(/Mesin Flow offline — klip akan antri/)).toBeInTheDocument();
  });
});
