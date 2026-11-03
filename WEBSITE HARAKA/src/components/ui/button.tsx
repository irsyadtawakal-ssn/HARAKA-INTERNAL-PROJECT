import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-sans font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-warm focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-gold-warm text-navy hover:bg-gold-deep hover:text-white rounded-lg",
        secondary:
          "border border-ink-300 bg-transparent text-ink-900 hover:bg-cream-200 rounded-lg",
        ghost:
          "text-ink-900 underline underline-offset-4 decoration-ink-300 hover:decoration-gold-warm",
        pill: "bg-gold-warm text-navy hover:bg-gold-deep hover:text-white rounded-lg",
        outline_light:
          "border border-cream-50/25 text-cream-50 hover:bg-cream-50/10 hover:border-cream-50/40 rounded-lg",
      },
      size: {
        default: "h-12 px-6 text-sm min-w-[120px]",
        sm: "h-10 px-4 text-xs min-w-[100px]",
        lg: "h-14 px-8 text-base min-w-[160px]",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
