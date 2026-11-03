import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Conversation from "@/components/Conversation";
import type { useConversation } from "@/lib/controller";

type Conv = ReturnType<typeof useConversation>;
const base = (over: Partial<Conv> = {}): Conv => ({
  state: "idle", audioLevel: 0, line: "Halo", messages: [], micSupported: true, showLeadForm: false,
  leadDone: false, chatPhone: null, micActive: false,
  send: vi.fn(async () => {}), startMic: vi.fn(), stopMic: vi.fn(), userGestured: vi.fn(), typing: vi.fn(),
  leadSubmitted: vi.fn(), ...over,
});

describe("Conversation", () => {
  it("sends the chip text when a chip is clicked", () => {
    const conv = base();
    render(<Conversation conv={conv} />);
    fireEvent.click(screen.getByRole("button", { name: "Berapa MOQ?" }));
    expect(conv.send).toHaveBeenCalledWith("Berapa MOQ?");
  });

  it("hides the mic button when speech is unsupported", () => {
    render(<Conversation conv={base({ micSupported: false })} />);
    expect(screen.queryByRole("button", { name: /mic/i })).toBeNull();
  });

  it("shows the lead form with the phone found in chat", () => {
    render(<Conversation conv={base({ showLeadForm: true, chatPhone: "081234567890" })} />);
    expect(screen.getByLabelText("Nomor WhatsApp")).toHaveValue("081234567890");
  });

  it("offers a WhatsApp button once the lead is done", () => {
    render(<Conversation conv={base({ leadDone: true })} />);
    expect(screen.getByRole("link", { name: "Chat WhatsApp sekarang" })).toHaveAttribute("href", "https://wa.me/6283137030656");
  });

  it("sends typed text on Enter", () => {
    const conv = base();
    render(<Conversation conv={conv} />);
    const input = screen.getByPlaceholderText("Ketik atau tekan mic…");
    fireEvent.change(input, { target: { value: "bisa parfum?" } });
    fireEvent.submit(input.closest("form")!);
    expect(conv.send).toHaveBeenCalledWith("bisa parfum?");
  });

  it("turns the mic on even if the avatar is in the listening state from typing", () => {
    const conv = base({ state: "listening", micActive: false });
    render(<Conversation conv={conv} />);
    fireEvent.click(screen.getByRole("button", { name: "Nyalakan mic" }));
    expect(conv.startMic).toHaveBeenCalled();
  });

  it("tells the controller when typing starts and stops", () => {
    const conv = base();
    render(<Conversation conv={conv} />);
    const input = screen.getByPlaceholderText("Ketik atau tekan mic…");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(conv.typing).toHaveBeenNthCalledWith(1, true);
    expect(conv.typing).toHaveBeenNthCalledWith(2, false);
  });
});
