import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FactOrbs from "@/components/FactOrbs";

describe("FactOrbs", () => {
  it("renders the five company facts", () => {
    render(<FactOrbs />);
    for (const text of ["18+", "brand partner", "6 tahap", "Sejak 2015", "CPKB · BPOM · HALAL", "Skincare · Bodycare"]) {
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
    }
  });
});
