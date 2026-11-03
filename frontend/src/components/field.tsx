const controlBase =
  "rounded-lg border border-line bg-surface text-ink placeholder:text-ink-faint focus:border-berry focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-berry/25 disabled:bg-well disabled:text-ink-soft";

/** Input/select di dalam form: selebar kolomnya. */
export const inputClass = `w-full px-3 py-2 ${controlBase}`;

/** Select ringkas di baris filter: selebar isinya. */
export const filterSelectClass = `px-3 py-[7px] text-sm font-medium ${controlBase}`;

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[13px] text-ink-soft">{hint}</span>}
    </label>
  );
}
