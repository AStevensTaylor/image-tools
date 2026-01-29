import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS class names, resolving conflicts intelligently.
 * Combines clsx for conditional classes with tailwind-merge for conflict resolution.
 * @param inputs - Class names or conditional class objects
 * @returns Merged and deduplicated class name string
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
