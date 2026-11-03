import React from "react"
import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  variant?: "default" | "white" | "dark"
  size?: "sm" | "md" | "lg"
}

export function Logo({ className, variant = "default", size = "md" }: LogoProps) {
  const sizeClasses = {
    sm: "w-32 h-10",
    md: "w-40 h-12",
    lg: "w-48 h-14",
  }

  const colorClasses = {
    default: "text-charcoal-dark",
    white: "text-cream-base",
    dark: "text-charcoal-dark",
  }

  return (
    <div className={cn("flex items-center", sizeClasses[size], className)}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={colorClasses[variant]}
      >
        {/* Globe Icon */}
        <g>
          <circle cx="30" cy="30" r="18" stroke="currentColor" strokeWidth="1.5" fill="none" />
          {/* Vertical line */}
          <line x1="30" y1="12" x2="30" y2="48" stroke="currentColor" strokeWidth="1" />
          {/* Horizontal line */}
          <line x1="12" y1="30" x2="48" y2="30" stroke="currentColor" strokeWidth="1" />
          {/* Curved lines for globe effect */}
          <path d="M 18 18 Q 30 24 42 18" stroke="currentColor" strokeWidth="1" fill="none" />
          <path d="M 18 42 Q 30 36 42 42" stroke="currentColor" strokeWidth="1" fill="none" />
          <path
            d="M 18 30 Q 24 24 30 30 Q 36 36 42 30"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
          />
        </g>

        {/* Haraka Text */}
        <text
          x="65"
          y="25"
          fontFamily="DM Sans, sans-serif"
          fontSize="18"
          fontWeight="600"
          fill="currentColor"
        >
          Haraka
        </text>
        {/* Erfi Text */}
        <text
          x="65"
          y="45"
          fontFamily="DM Sans, sans-serif"
          fontSize="18"
          fontWeight="400"
          fill="currentColor"
        >
          Erfi
        </text>
      </svg>
    </div>
  )
}
