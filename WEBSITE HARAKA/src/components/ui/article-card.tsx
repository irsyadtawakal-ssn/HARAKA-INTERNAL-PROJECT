import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface ArticleCardProps {
  slug: string
  title: string
  category: string
  publishedAt: string
  thumbnailSrc: string
  className?: string
}

export function ArticleCard({
  slug,
  title,
  category,
  publishedAt,
  thumbnailSrc,
  className,
}: ArticleCardProps) {
  return (
    <Link href={`/jurnal/${slug}`} className={cn("group block", className)}>
      <div className="relative mb-5 overflow-hidden">
        <Image
          src={thumbnailSrc}
          alt={title}
          width={400}
          height={225}
          className="image-editorial image-ratio-16-9 transition-transform duration-300 group-hover:scale-102"
        />
      </div>
      <div className="label text-gold-deep mb-2">{category}</div>
      <h3 className="heading-md text-ink-900 decoration-gold-warm transition-all group-hover:underline">
        {title}
      </h3>
      <time className="caption mt-2 block">{publishedAt}</time>
      <span className="link-inline link-arrow mt-4 inline-block text-sm">Baca</span>
    </Link>
  )
}
