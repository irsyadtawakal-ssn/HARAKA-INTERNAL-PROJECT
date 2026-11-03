import { describe, it, expect } from "vitest";
import { extractPhone, redactPhones } from "@/lib/lead";

describe("extractPhone", () => {
  it("normalises a dashed 08 number", () => expect(extractPhone(["nomorku 0812-3456-7890"])).toBe("081234567890"));
  it("normalises a +62 number with spaces", () => expect(extractPhone(["+62 812 3456 7890"])).toBe("081234567890"));
  it("ignores prices and other numbers", () => expect(extractPhone(["harga 15000"])).toBeNull());
  it("prefers the latest message", () => expect(extractPhone(["0811111111", "ganti ya 0822 2222 2222"])).toBe("082222222222"));
});

describe("redactPhones", () => {
  it("replaces phone numbers with [nomor]", () => expect(redactPhones("WA aku 0812-3456-7890 ya")).toBe("WA aku [nomor] ya"));
});
