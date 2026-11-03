const FACTS = [
  { big: "18+", small: "brand partner", pos: "left-top" },
  { big: "Skincare · Bodycare", small: "Haircare · Parfum", pos: "left-bottom" },
  { big: "6 tahap", small: "ide → siap jual", pos: "right-top" },
  { big: "Sejak 2015", small: "Bekasi", pos: "right-bottom" },
] as const;

export default function FactOrbs() {
  return (
    <>
      <span className="badge">CPKB · BPOM · HALAL</span>
      <ul className="orbs" aria-label="Fakta Haraka Erfi">
        {FACTS.map((f) => (
          <li key={f.big} className={`orb orb-${f.pos}`}>
            <b>{f.big}</b>
            <span>{f.small}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
