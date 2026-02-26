import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse combat power string to numeric value
 * e.g. "375.7M" → 375700000, "19.3M" → 19300000
 */
export function parseCombatPower(value: string | number): number {
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  const match = str.match(/^([\d.]+)\s*M$/i);
  if (match) {
    return Math.round(parseFloat(match[1]) * 1_000_000);
  }
  const numMatch = str.match(/^[\d.]+$/);
  if (numMatch) {
    return parseFloat(str);
  }
  return 0;
}

/**
 * Format numeric combat power to display string
 * e.g. 375700000 → "375.7M"
 */
export function formatCombatPower(value: number): string {
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + 'M';
  }
  return value.toLocaleString();
}

/**
 * Generate a simple unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/**
 * Format troop ratio for display
 */
export function formatTroopRatio(infantry: number, lancer: number, marksman: number): string {
  return `${infantry}:${lancer}:${marksman}`;
}

/**
 * Normalize nickname for comparison (strip alliance tags like [HAN], [KOR])
 * Keeps original casing and special characters, only removes bracket tags.
 */
export function normalizeNickname(name: string): string {
  return name
    .trim()
    .replace(/^\[.*?\]\s*/, '')
    .trim();
}
