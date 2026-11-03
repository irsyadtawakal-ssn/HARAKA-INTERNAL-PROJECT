/**
 * Core type definitions for Haraka Erfi website
 */

export interface Service {
  slug: string
  title: string
  shortDescription: string
  order: number
}

export interface CaseStudy {
  slug: string
  brandName: string
  productCategory: "skincare" | "haircare" | "bodycare" | "makeup" | "other"
  tagline: string
  featured: boolean
}

export interface JournalArticle {
  slug: string
  title: string
  category: "brand-building" | "formulation" | "regulatory" | "industry" | "tips"
  excerpt: string
  publishedAt: string
  readingTime: number
  featured: boolean
}

export interface Certification {
  name: string
  issuer: string
  description: string
  order: number
}

export interface FAQItem {
  question: string
  answer: string
  category: "process" | "pricing" | "regulatory" | "technical" | "general"
  order: number
}
