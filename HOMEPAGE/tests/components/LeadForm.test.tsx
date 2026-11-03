import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LeadForm from "@/components/LeadForm";

const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 201 }));
beforeEach(() => { fetchMock.mockClear(); vi.stubGlobal("fetch", fetchMock); });

describe("LeadForm", () => {
  it("pre-fills the phone number found in chat", () => {
    render(<LeadForm defaultPhone="081234567890" messages={[]} onSubmitted={() => {}} />);
    expect(screen.getByLabelText("Nomor WhatsApp")).toHaveValue("081234567890");
  });

  it("shows the exact consent line with a privacy link", () => {
    render(<LeadForm defaultPhone={null} messages={[]} onSubmitted={() => {}} />);
    expect(screen.getByText("Dengan mengirim, Kakak setuju dihubungi tim Haraka Erfi.", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /privasi/i })).toHaveAttribute("href", "/privasi");
  });

  it("does not submit without a name", () => {
    render(<LeadForm defaultPhone="081234567890" messages={[]} onSubmitted={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the lead and reports the name", async () => {
    const onSubmitted = vi.fn();
    render(<LeadForm defaultPhone="081234567890" messages={[{ role: "user", content: "serum" }]} onSubmitted={onSubmitted} />);
    fireEvent.change(screen.getByLabelText("Nama"), { target: { value: "Dina" } });
    fireEvent.click(screen.getByRole("button", { name: "Kirim" }));
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledWith("Dina"));
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body).toMatchObject({ name: "Dina", whatsapp: "081234567890", messages: [{ role: "user", content: "serum" }] });
  });
});

describe("LeadForm phone pre-fill", () => {
  it("picks up a number given in chat after the form opened, unless the visitor typed one", () => {
    const { rerender } = render(<LeadForm defaultPhone={null} messages={[]} onSubmitted={() => {}} />);
    rerender(<LeadForm defaultPhone="081234567890" messages={[]} onSubmitted={() => {}} />);
    expect(screen.getByLabelText("Nomor WhatsApp")).toHaveValue("081234567890");
    fireEvent.change(screen.getByLabelText("Nomor WhatsApp"), { target: { value: "0899" } });
    rerender(<LeadForm defaultPhone="082222222222" messages={[]} onSubmitted={() => {}} />);
    expect(screen.getByLabelText("Nomor WhatsApp")).toHaveValue("0899");
  });
});
