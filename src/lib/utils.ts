import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// 1. The shadcn/ui utility (this was missing!)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 2. Our custom slugify utility
export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}