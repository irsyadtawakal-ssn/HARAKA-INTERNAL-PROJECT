import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge Tailwind classes with proper precedence
 * Used for component className overrides
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
