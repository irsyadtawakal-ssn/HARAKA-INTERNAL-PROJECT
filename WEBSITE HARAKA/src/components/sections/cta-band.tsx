import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface CTABandProps {
  eyebrow?: string
  headline: string
  subtext?: string
  primaryCTA: {
    label: string
    href: string
  }
  secondaryCTA?: {
    label: string
    href: string
  }
  className?: string
}

export function CTABand({
  eyebrow,
  headline,
  subtext,
  primaryCTA,
  secondaryCTA,
  className,
}: CTABandProps) {
  return (
    <section
      className={cn("section-padding-y bg-navy border-cream-50/10 border-t text-center", className)}
    >
      <div className="container-default">
        {eyebrow && (
          <div className="text-gold-warm mb-3 font-sans text-xs font-bold tracking-widest uppercase">
            — {eyebrow}
          </div>
        )}

        <h2 className="text-cream-50 mx-auto mb-4 max-w-[640px] font-sans text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl md:text-5xl">
          {headline}
        </h2>

        {subtext && (
          <p className="text-ink-300 mx-auto mb-8 max-w-[540px] font-sans text-base leading-relaxed font-normal">
            {subtext}
          </p>
        )}

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button
            variant="primary"
            size="lg"
            className="w-full font-sans font-bold sm:w-auto"
            asChild
          >
            <Link href={primaryCTA.href} target="_blank" rel="noopener noreferrer">
              {primaryCTA.label}
            </Link>
          </Button>
          {secondaryCTA && (
            <Link
              href={secondaryCTA.href}
              className="text-gold-warm px-2 py-3 font-sans text-base font-semibold transition-colors hover:text-white"
            >
              {secondaryCTA.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
