import { FlatCompat } from "@eslint/eslintrc"
import { dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Disallow inline style attributes — all styling via Tailwind / CSS vars
      "react/forbid-dom-props": ["error", { forbid: ["style"] }],
      // Enforce accessible interactive elements
      "jsx-a11y/interactive-supports-focus": "warn",
      // Prevent client components from being used unnecessarily
      "@next/next/no-async-client-component": "error",
    },
  },
]

export default eslintConfig
