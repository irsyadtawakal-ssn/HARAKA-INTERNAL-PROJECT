import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StudioHeader from "@/components/dashboard/studio/StudioHeader";

const counts = { processing: 2, decision: 1, ready: 0, failed: 0 };

describe("StudioHeader", () => {
  it("shows offline machine", () => {
    render(<StudioHeader quota={{ limit: 30, used: 4, remaining: 26 }} flow="offline" counts={counts} />);
    expect(screen.getByText("26 / 30 klip")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(screen.getByText("Klip menunggu sampai mesin online")).toBeInTheDocument();
    expect(screen.getByText("2 diproses · 1 perlu keputusan")).toBeInTheDocument();
  });

  it("handles no device", () => {
    render(<StudioHeader quota={null} flow="none" counts={counts} />);
    expect(screen.getByText("Belum terhubung")).toBeInTheDocument();
  });
});
