import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Avatar from "@/components/avatar/Avatar";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ mode: "placeholder" }))));
});

describe("Avatar", () => {
  it("renders the placeholder image with the current state", async () => {
    render(<Avatar state="listening" audioLevel={0} />);
    const img = await waitFor(() => screen.getByRole("img"));
    expect(img.getAttribute("src")).toMatch(/placeholder\.(jpg|png)$/);
    expect(document.querySelector('[data-state="listening"]')).not.toBeNull();
  });
});
