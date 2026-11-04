import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Conversation from "@/components/Conversation";
import type { useConversation } from "@/lib/controller";

type Conv = ReturnType<typeof useConversation>;
const base = (over: Partial<Conv> = {}): Conv => ({
  state: "idle", audioLevel: 0, line: "Halo", messages: [], thread: [{ id: 0, role: "assistant", content: "Halo" }],
  streaming: null, micSupported: true, showWhatsApp: false,
  leadDone: false, micActive: false, voiceOn: true, toggleVoice: vi.fn(),
  send: vi.fn(async () => {}), startMic: vi.fn(), stopMic: vi.fn(), userGestured: vi.fn(), greet: vi.fn(async () => {}), greetEnded: vi.fn(), typing: vi.fn(),
  whatsappOpened: vi.fn(), reset: vi.fn(), ...over,
});
const WA = { number: "0831-3703-0656", prefill: "Halo Admin Haraka Erfi." };
const PRODUCTS = [
  { id: "cat-skincare", name: "Skincare", items: "Facial Cleanser, Face Serum, Sunscreen / Sunblock", heroIngredients: "Niacinamide, Multi-Ceramide", moqNote: "MOQ mulai 1.000 pcs" },
  { id: "cat-parfume", name: "Parfum (Perfume & Fragrance)", items: "Eau de Parfum (EDP), Body Mist", heroIngredients: "Fine Fragrance Oils", moqNote: "MOQ mulai 1.000 pcs" },
];

describe("Conversation", () => {
  it("sends the chip text when a chip is clicked", () => {
    const conv = base();
    render(<Conversation conv={conv} whatsapp={WA} />);
    fireEvent.click(screen.getByRole("button", { name: "Berapa MOQ?" }));
    expect(conv.send).toHaveBeenCalledWith("Berapa MOQ?");
  });

  it("shows the whole conversation, not just the latest reply", () => {
    render(<Conversation conv={base({ thread: [
      { id: 0, role: "assistant", content: "Halo" },
      { id: 1, role: "user", content: "Berapa MOQ?" },
      { id: 2, role: "assistant", content: "Mulai 1.000 pcs." },
      { id: 3, role: "user", content: "Bisa parfum?" },
    ], streaming: "Bisa, Kak" })} whatsapp={WA} />);
    const log = screen.getByRole("log");
    for (const t of ["Halo", "Berapa MOQ?", "Mulai 1.000 pcs.", "Bisa parfum?", "Bisa, Kak"]) {
      expect(log).toHaveTextContent(t);
    }
  });

  it("offers a fresh start once the visitor has asked something", () => {
    const conv = base({ thread: [{ id: 0, role: "assistant", content: "Halo" }, { id: 1, role: "user", content: "hai" }] });
    render(<Conversation conv={conv} whatsapp={WA} />);
    fireEvent.click(screen.getByRole("button", { name: "Mulai percakapan baru" }));
    expect(conv.reset).toHaveBeenCalled();
  });

  it("shows a product card once per category, under the reply that first mentions it", () => {
    const thread = [
      { id: 0, role: "assistant" as const, content: "Halo" },
      { id: 1, role: "user" as const, content: "rekomendasi?" },
      { id: 2, role: "assistant" as const, content: "Coba face serum multi-ceramide atau sunscreen ringan." },
      { id: 3, role: "user" as const, content: "kalau serum?" },
      { id: 4, role: "assistant" as const, content: "Face serum kami bisa custom, atau EDP juga laris." },
    ];
    render(<Conversation conv={base({ thread })} whatsapp={WA} products={PRODUCTS} />);
    expect(screen.getAllByRole("heading", { name: "Maklon Skincare" })).toHaveLength(1);
    const perfume = screen.getByRole("link", { name: "Konsultasi Parfum via WhatsApp" });
    expect(decodeURIComponent(perfume.getAttribute("href")!)).toContain("Tertarik: Maklon Parfum");
  });

  it("does not show product cards on the greeting or on errors", () => {
    const thread = [
      { id: 0, role: "assistant" as const, content: "Halo, mau bikin skincare?" },
      { id: 1, role: "assistant" as const, content: "Gagal memuat sunscreen", tone: "error" as const },
    ];
    render(<Conversation conv={base({ thread })} whatsapp={WA} products={PRODUCTS} />);
    expect(screen.queryByRole("heading", { name: /Maklon/ })).toBeNull();
  });

  it("explains the wait while the first words of a reply are on their way", () => {
    render(<Conversation conv={base({ streaming: "" })} whatsapp={WA} />);
    expect(screen.getByRole("status")).toHaveTextContent("Mira sedang membaca pertanyaan Kakak");
  });

  it("lets the visitor switch between Mira and Rara", () => {
    const pick = vi.fn();
    render(<Conversation conv={base()} whatsapp={WA} avatar="rara" onAvatarChange={pick} />);
    expect(screen.getByRole("radio", { name: "Rara" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Rara", { selector: "b" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Mira" }));
    expect(pick).toHaveBeenCalledWith("mira");
  });

  it("lets the visitor mute the avatar's voice", () => {
    const conv = base();
    render(<Conversation conv={conv} whatsapp={WA} />);
    fireEvent.click(screen.getByRole("button", { name: "Matikan suara Mira" }));
    expect(conv.toggleVoice).toHaveBeenCalled();
  });

  it("shows the time of each message and a copy button on Rara's answers", () => {
    const at = new Date(2026, 10, 3, 9, 5).getTime();
    const thread = [
      { id: 0, role: "assistant" as const, content: "Halo" },
      { id: 1, role: "user" as const, content: "hai", at },
      { id: 2, role: "assistant" as const, content: "MOQ 1.000 pcs", at },
    ];
    render(<Conversation conv={base({ thread })} whatsapp={WA} />);
    expect(screen.getAllByText("09.05")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Salin jawaban" })).toHaveLength(1);
  });

  it("hides the mic button when speech is unsupported", () => {
    render(<Conversation conv={base({ micSupported: false })} whatsapp={WA} />);
    expect(screen.queryByRole("button", { name: /mic/i })).toBeNull();
  });

  it("offers a WhatsApp button with the chat details prefilled, and no name/number form", () => {
    const messages = [{ role: "user" as const, content: "mau bikin serum 1000 pcs" }];
    render(<Conversation conv={base({ showWhatsApp: true, messages })} whatsapp={WA} />);
    const href = screen.getByRole("link", { name: "Chat via WhatsApp" }).getAttribute("href")!;
    expect(href.startsWith("https://wa.me/6283137030656?text=")).toBe(true);
    const text = decodeURIComponent(href.split("text=")[1]);
    expect(text).toContain("Halo Admin Haraka Erfi.");
    expect(text).toContain("Produk: Face Serum");
    expect(screen.queryByLabelText("Nomor WhatsApp")).toBeNull();
  });

  it("logs the WhatsApp click once and tells the controller", () => {
    const sendBeacon = vi.fn(() => true);
    Object.defineProperty(navigator, "sendBeacon", { value: sendBeacon, configurable: true });
    const conv = base({ showWhatsApp: true });
    render(<Conversation conv={conv} whatsapp={WA} />);
    fireEvent.click(screen.getByRole("link", { name: "Chat via WhatsApp" }));
    expect(sendBeacon).toHaveBeenCalledWith("/api/lead", expect.any(Blob));
    expect(conv.whatsappOpened).toHaveBeenCalled();
  });

  it("sends typed text on Enter", () => {
    const conv = base();
    render(<Conversation conv={conv} whatsapp={WA} />);
    const input = screen.getByPlaceholderText("Ketik atau tekan mic…");
    fireEvent.change(input, { target: { value: "bisa parfum?" } });
    fireEvent.submit(input.closest("form")!);
    expect(conv.send).toHaveBeenCalledWith("bisa parfum?");
  });

  it("turns the mic on even if the avatar is in the listening state from typing", () => {
    const conv = base({ state: "listening", micActive: false });
    render(<Conversation conv={conv} whatsapp={WA} />);
    fireEvent.click(screen.getByRole("button", { name: "Nyalakan mic" }));
    expect(conv.startMic).toHaveBeenCalled();
  });

  it("tells the controller when typing starts and stops", () => {
    const conv = base();
    render(<Conversation conv={conv} whatsapp={WA} />);
    const input = screen.getByPlaceholderText("Ketik atau tekan mic…");
    fireEvent.change(input, { target: { value: "a" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(conv.typing).toHaveBeenNthCalledWith(1, true);
    expect(conv.typing).toHaveBeenNthCalledWith(2, false);
  });
});
