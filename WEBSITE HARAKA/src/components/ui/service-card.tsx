import Link from "next/link"
import { cn } from "@/lib/utils"

interface ServiceCardProps {
  number: string
  title: string
  description: string
  href: string
  className?: string
}

export function ServiceCard({ number, title, description, href, className }: ServiceCardProps) {
  return (
    <Link href={href} className={cn("card card-accent group block", className)}>
      <div className="card-number">{number}</div>
      <h3 className="heading-sm mb-3">{title}</h3>
      <p className="body-sm text-ink-700 mb-6">{description}</p>
      <span className="link-inline link-arrow text-sm">Pelajari lebih lanjut</span>
    </Link>
  )
}
