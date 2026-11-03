import { cn } from "@/lib/utils"

interface ProcessStepProps {
  number: string
  label: string
  description: string
  className?: string
}

export function ProcessStep({ number, label, description, className }: ProcessStepProps) {
  return (
    <div className={cn("text-left", className)}>
      <div className="step-number">{number}</div>
      <div className="step-label">{label}</div>
      <p className="step-description">{description}</p>
    </div>
  )
}
