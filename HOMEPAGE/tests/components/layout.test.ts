import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// jsdom has no layout engine, so this guards the CSS rules that keep phones scroll-free;
// the real check is the 375px browser pass described in the README.
const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
const mobile = css.slice(css.indexOf("@media (max-width: 768px)"));

describe("phone-safe layout rules", () => {
  it("never lets the page scroll sideways", () => {
    expect(css).toMatch(/body\s*{[^}]*overflow-x:\s*hidden/);
  });
  it("puts the fact cards back into the flow on phones", () => {
    expect(mobile).toMatch(/\.orb\s*{\s*position:\s*static/);
  });
  it("sizes the avatar by screen width on phones", () => {
    expect(mobile).toMatch(/\.avatar-slot\s*{[^}]*width:\s*min\(88vw/);
  });
  it("uses a single-column page with no fixed minimum width", () => {
    expect(css).not.toMatch(/min-width:\s*(\d{4}|[4-9]\d{2})px/);
  });
});
