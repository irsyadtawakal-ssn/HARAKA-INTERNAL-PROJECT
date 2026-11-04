"use client";

import { Droplets, Flower2, Sparkles, Wind } from "lucide-react";
import type { ChatMessage } from "@/lib/llm";
import { logWhatsAppClick, waHref, type WhatsAppContact } from "./WhatsAppCta";

export type ProductCategory = { id: string; name: string; items: string; heroIngredients: string; moqNote: string };

// Everyday words visitors and Rara use that the catalog's item list does not spell out.
const ALIASES: Record<string, string[]> = {
  "cat-skincare": ["skincare", "serum wajah", "face serum", "sunscreen", "sunblock", "moisturizer", "pelembap", "toner", "cleanser", "sabun muka", "masker wajah", "essence"],
  "cat-bodycare": ["bodycare", "body serum", "body lotion", "lotion", "lulur", "body scrub", "body wash", "sabun mandi", "hand cream", "body butter"],
  "cat-parfume": ["parfum", "parfume", "perfume", "eau de parfum", "edp", "edt", "body mist", "cologne", "wewangian"],
  "cat-haircare": ["haircare", "shampoo", "sampo", "conditioner", "hair serum", "hair tonic", "hair mask", "creambath", "hair oil", "minyak rambut"],
};
const ICONS: Record<string, typeof Droplets> = {
  "cat-skincare": Droplets,
  "cat-bodycare": Sparkles,
  "cat-parfume": Flower2,
  "cat-haircare": Wind,
};

// Drop bracketed details first so "Oils (Floral, Woody)" is not cut in half at its commas.
const list = (text: string, n: number) =>
  text.replace(/\s*\([^)]*\)/g, "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, n);
const shortName = (name: string) => name.replace(/\s*\(.*\)/, "");

/** Catalog phrases for a category, e.g. "face serum", "sunscreen", plus the aliases above. */
function phrases(c: ProductCategory): string[] {
  const fromItems = c.items
    .toLowerCase()
    .split(/[,/()]/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 4);
  return [...fromItems, ...(ALIASES[c.id] ?? []), shortName(c.name).toLowerCase()];
}

/** Categories a reply talks about, in catalog order; whole words only so "edp" does not match inside other words. */
export function mentionedCategories(text: string, categories: ProductCategory[]): ProductCategory[] {
  const t = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return categories.filter((c) => phrases(c).some((p) => t.includes(` ${p.replace(/[^\p{L}\p{N}]+/gu, " ").trim()} `)));
}

type Props = { category: ProductCategory; contact: WhatsAppContact; messages: ChatMessage[]; logged: boolean; onOpen(): void };

export default function ProductCard({ category, contact, messages, logged, onOpen }: Props) {
  const Icon = ICONS[category.id] ?? Sparkles;
  const name = shortName(category.name);
  return (
    <article className="product-card">
      <div className="product-icon" aria-hidden="true"><Icon size={18} /></div>
      <div className="product-body">
        <h3>Maklon {name}</h3>
        <p className="product-items">{list(category.items, 4).join(" · ")}</p>
        <p className="product-meta">Bahan unggulan: {list(category.heroIngredients, 3).join(", ")}</p>
        <p className="product-meta">{category.moqNote}</p>
        <a
          className="product-wa"
          href={waHref(contact, messages, `Maklon ${name}`)}
          target="_blank"
          rel="noreferrer"
          onClick={() => { logWhatsAppClick(messages, logged, `Maklon ${name}`); onOpen(); }}
        >
          Konsultasi {name} via WhatsApp
        </a>
      </div>
    </article>
  );
}
