import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProjectBoard from "@/components/dashboard/studio/ProjectBoard";
import type { ContentJob } from "@/lib/contentStudio";

const job = (id: string, status: string): ContentJob => ({
  id,
  type: "video_ads",
  funnel: "A",
  status,
  error: status === "failed" ? "x" : null,
  reference_asset_id: "a1",
  start_asset_id: null,
  script_id: null,
  pending_script_id: null,
  claim_approval_id: null,
  render_jobs: [],
  created_at: "2026-11-04T09:55:00Z",
  updated_at: "2026-11-04T09:55:00Z",
});

const now = new Date("2026-11-04T10:00:00Z");

describe("ProjectBoard", () => {
  it("filters by category", () => {
    const onFilter = vi.fn();
    const jobs = [job("j1", "analyzing"), job("j2", "failed")];
    const { rerender } = render(<ProjectBoard jobs={jobs} assets={{}} filter="all" onFilter={onFilter} onOpen={vi.fn()} now={now} />);
    expect(screen.getAllByTestId("project-card")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Gagal 1" }));
    expect(onFilter).toHaveBeenCalledWith("failed");
    rerender(<ProjectBoard jobs={jobs} assets={{}} filter="failed" onFilter={onFilter} onOpen={vi.fn()} now={now} />);
    expect(screen.getAllByTestId("project-card")).toHaveLength(1);
    expect(screen.getByText("5 menit lalu")).toBeInTheDocument();
  });

  it("empty state", () => {
    render(<ProjectBoard jobs={[]} assets={{}} filter="all" onFilter={vi.fn()} onOpen={vi.fn()} now={now} />);
    expect(screen.getByText("Belum ada konten. Pilih referensi di kiri lalu Generate.")).toBeInTheDocument();
  });

  it("opens a project", () => {
    const onOpen = vi.fn();
    render(<ProjectBoard jobs={[job("j1", "analyzing")]} assets={{}} filter="all" onFilter={vi.fn()} onOpen={onOpen} now={now} />);
    fireEvent.click(screen.getByTestId("project-card"));
    expect(onOpen).toHaveBeenCalledWith("j1");
  });
});
