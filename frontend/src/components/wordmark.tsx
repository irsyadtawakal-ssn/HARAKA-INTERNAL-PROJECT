/** Wordmark: nama perusahaan + nama alat, tanpa logo buatan (logo resmi Haraka Erfi belum diberikan). */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <div className="leading-tight">
      <div className={`font-semibold tracking-tight text-ink ${size === "lg" ? "text-2xl" : "text-[17px]"}`}>Haraka Erfi</div>
      <div className={`text-ink-soft ${size === "lg" ? "text-base" : "text-[13px]"}`}>Marketing Factory</div>
    </div>
  );
}
