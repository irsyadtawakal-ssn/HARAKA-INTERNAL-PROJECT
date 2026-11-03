export function TrustStrip() {
  const certifications = ["BPOM", "HALAL", "CPKB", "ISO 22716"]

  const stats = [{ value: "Est. 2015", label: "Berpengalaman" }]

  return (
    <section className="bg-cream-50 border-border/30 border-b py-4 md:py-5">
      <div className="container-default">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          {/* Certifications */}
          <div className="text-ink-500 flex flex-wrap items-center justify-center gap-5 font-mono text-[11px] tracking-widest uppercase sm:justify-start md:gap-8">
            {certifications.map((cert) => (
              <span key={cert}>{cert}</span>
            ))}
          </div>

          {/* Separator */}
          <div className="bg-border hidden h-6 w-px sm:block" />

          {/* Stats */}
          <div className="flex items-center gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center sm:text-right">
                <div className="text-ink-900 font-mono text-xs leading-tight font-medium md:text-sm">
                  {stat.value}
                </div>
                <div className="text-ink-500 mt-0.5 text-[10px] tracking-wide uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
