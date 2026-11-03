import { cn } from "@/lib/utils"

interface StatBlockProps {
  value: string | number
  label: string
  subtext?: string
  className?: string
}

export function StatBlock({ value, label, subtext, className }: StatBlockProps) {
  return (
    <div className={cn("text-center", className)}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {subtext && <div className="stat-subtext">{subtext}</div>}
    </div>
  )
}
