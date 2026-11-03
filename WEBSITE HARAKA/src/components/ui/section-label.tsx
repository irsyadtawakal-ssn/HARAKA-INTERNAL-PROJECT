import { cn } from "@/lib/utils"

interface SectionLabelProps {
  children: React.ReactNode
  dark?: boolean
  className?: string
}

export function SectionLabel({ children, dark = false, className }: SectionLabelProps) {
  return (
    <div className="mb-4 block">
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 font-sans text-[11px] font-bold tracking-widest uppercase transition-colors",
          dark
            ? "bg-gold-warm/15 text-gold-warm border-gold-warm/30"
            : "bg-gold-pale/80 text-gold-deep border-gold-warm/35",
          className,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", dark ? "bg-gold-warm" : "bg-gold-deep")} />
        {children}
      </span>
    </div>
  )
}
