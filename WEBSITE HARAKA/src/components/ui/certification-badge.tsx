import Image from "next/image"
import { cn } from "@/lib/utils"

interface CertificationBadgeProps {
  name: string
  logoSrc: string
  logoAlt: string
  className?: string
}

export function CertificationBadge({ name, logoSrc, logoAlt, className }: CertificationBadgeProps) {
  return (
    <div className={cn("cert-badge", className)}>
      <Image src={logoSrc} alt={logoAlt} width={80} height={24} className="cert-logo" />
      <span className="cert-name">{name}</span>
    </div>
  )
}
