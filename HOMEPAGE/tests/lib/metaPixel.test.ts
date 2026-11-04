import { afterEach, describe, expect, it, vi } from "vitest";
import { isPixelId, trackPixel } from "@/lib/metaPixel";
import { logWhatsAppClick } from "@/components/WhatsAppCta";

type W = Window & { fbq?: unknown };

describe("Meta Pixel", () => {
  afterEach(() => {
    delete (window as W).fbq;
  });

  it("accepts only numeric pixel IDs", () => {
    expect(isPixelId("1234567890123456")).toBe(true);
    expect(isPixelId("")).toBe(false);
    expect(isPixelId("123');alert(1);//")).toBe(false);
  });

  it("does nothing when the pixel is not loaded", () => {
    expect(() => trackPixel("Lead")).not.toThrow();
  });

  it("sends Lead once per conversation when WhatsApp is clicked", () => {
    const fbq = vi.fn();
    (window as W).fbq = fbq;
    logWhatsAppClick([], false, "Maklon Skincare");
    logWhatsAppClick([], true, "Maklon Skincare");
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(fbq).toHaveBeenCalledWith("track", "Lead", expect.objectContaining({ content_name: "Maklon Skincare" }));
  });
});
