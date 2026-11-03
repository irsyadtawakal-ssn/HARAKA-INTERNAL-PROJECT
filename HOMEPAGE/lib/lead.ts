export const LEAD_MARKER = "[[LEAD]]";

export function stripMarker(text: string): string {
  return text.split(LEAD_MARKER).join("").trim();
}

// Indonesian mobile numbers: 08…, +628… or 628…, with optional spaces or dashes.
const PHONE_RE = /(?:\+?62|0)[\s-]?8(?:[\s-]?\d){7,11}/g;

function normalise(raw: string): string | null {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = "0" + digits.slice(2);
  return /^08\d{8,11}$/.test(digits) ? digits : null;
}

/** Finds the most recent Indonesian mobile number in the given texts, normalised to 08…. */
export function extractPhone(texts: string[]): string | null {
  for (let i = texts.length - 1; i >= 0; i--) {
    const matches = texts[i].match(PHONE_RE) ?? [];
    for (let j = matches.length - 1; j >= 0; j--) {
      const phone = normalise(matches[j]);
      if (phone) return phone;
    }
  }
  return null;
}

export function redactPhones(text: string): string {
  return text.replace(PHONE_RE, "[nomor]");
}

export type ExtractedLeadSummary = {
  produk: string | null;
  jumlah: string | null;
  budget: string | null;
  launching: string | null;
};

export function heuristicLeadSummary(messages: { role: string; content: string }[]): ExtractedLeadSummary {
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ");
  const lower = userText.toLowerCase();
  let produk: string | null = null;
  if (lower.includes("sunscreen") || lower.includes("sunblock")) produk = "Sunscreen / Sunblock";
  else if (lower.includes("serum")) produk = "Face Serum";
  else if (lower.includes("moisturizer") || lower.includes("cream") || lower.includes("krim")) produk = "Moisturizer";
  else if (lower.includes("cleanser") || lower.includes("facial wash") || lower.includes("sabun")) produk = "Facial Cleanser";
  else if (lower.includes("toner")) produk = "Toner";
  else if (lower.includes("parfum") || lower.includes("edp") || lower.includes("body mist")) produk = "Parfum / Fragrance";
  else if (lower.includes("lotion") || lower.includes("scrub") || lower.includes("body")) produk = "Bodycare";
  else if (lower.includes("shampoo") || lower.includes("hair")) produk = "Haircare";

  const qtyMatch = userText.match(/\b(\d[\d.,]*\s*(?:pcs|botol|paket|ribu|k))\b/i);
  const budgetMatch = userText.match(/\b((?:rp\s*)?\d[\d.,]*\s*(?:juta|jt|miliar|ribu))\b/i);
  const launchMatch = userText.match(
    /\b(januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember|bulan depan|tahun depan|q[1-4]\s*202\d|lebaran)\b/i
  );

  return {
    produk,
    jumlah: qtyMatch ? qtyMatch[1] : null,
    budget: budgetMatch ? budgetMatch[1] : null,
    launching: launchMatch ? launchMatch[1] : null,
  };
}
