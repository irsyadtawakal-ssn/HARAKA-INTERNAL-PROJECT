import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AssetLibraryTab from "@/components/dashboard/AssetLibraryTab";

const asset = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "photo",
  status: "ready",
  original_filename: `${id}.jpg`,
  size_bytes: 2048,
  license_status: "internal",
  funnel: "A",
  thumbnail_url: null,
  parent_asset_id: null,
  creator_name: null,
  notes: null,
  created_at: "2026-11-04T01:00:00Z",
  ...extra,
});

let calls: { url: string; init?: RequestInit }[];
let list: unknown[];

beforeEach(() => {
  calls = [];
  list = [asset("a1"), asset("a2", { license_status: "unknown" })];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const path = url.split("?")[0];
      let body: unknown = { detail: "nope" };
      if (path === "/api/factory/assets") body = { items: list, total: list.length };
      else if (path === "/api/factory/assets/a2" && init?.method === "PATCH") body = asset("a2", JSON.parse(String(init.body)));
      else if (path.startsWith("/api/factory/assets/")) body = { ...asset(path.split("/").pop()!), original_url: "https://x/o.jpg" };
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
});

describe("AssetLibraryTab", () => {
  it("lists assets with total", async () => {
    render(<AssetLibraryTab />);
    expect(await screen.findByText("2 aset")).toBeInTheDocument();
    expect(screen.getAllByTestId("asset-card")).toHaveLength(2);
  });

  it("filter sends query", async () => {
    render(<AssetLibraryTab />);
    await screen.findByText("2 aset");
    fireEvent.click(screen.getByRole("button", { name: "Foto" }));
    await act(async () => {});
    expect(calls.some((c) => c.url.startsWith("/api/factory/assets?") && c.url.includes("type=photo"))).toBe(true);
  });

  it("unknown license is flagged", async () => {
    render(<AssetLibraryTab />);
    expect(await screen.findByText("Lisensi belum jelas")).toBeInTheDocument();
  });

  it("edit license patches asset", async () => {
    render(<AssetLibraryTab />);
    fireEvent.click(await screen.findByRole("button", { name: /a2\.jpg/ }));
    const select = await screen.findByLabelText("Status izin");
    fireEvent.change(select, { target: { value: "internal" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await act(async () => {});
    const patch = calls.find((c) => c.init?.method === "PATCH");
    expect(patch?.url).toBe("/api/factory/assets/a2");
    expect(JSON.parse(String(patch?.init?.body))).toMatchObject({ license_status: "internal" });
  });
});
