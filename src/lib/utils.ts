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
 * Normalize nickname for display:
 * 1. Strip alliance tags like [HAN], [KOR]
 * 2. Strip rank medal emojis from alliance member list screenshots
 */
export function normalizeNickname(name: string): string {
  return name
    .trim()
    .replace(/^\[.*?\]\s*/, '')                    // [HAN], [KOR] 등 연맹 태그 제거
    .replace(/^[\u{1F947}\u{1F948}\u{1F949}\u{2B50}\u{1F539}\u{1F538}\u{1F3C5}\u{1F451}\u{1F48E}]+\s*/u, '') // 🥇🥈🥉⭐🔹🔸🏅👑💎
    .trim();
}

/**
 * Small caps / phonetic Latin → standard Latin mapping
 * 게임 닉네임에서 sᴜɴsᴇᴛ 같은 유니코드 스몰캡 처리
 */
const SMALL_CAPS: Record<string, string> = {
  '\u1D00': 'a', '\u0299': 'b', '\u1D04': 'c', '\u1D05': 'd',
  '\u1D07': 'e', '\uA730': 'f', '\u0262': 'g', '\u029C': 'h',
  '\u026A': 'i', '\u1D0A': 'j', '\u1D0B': 'k', '\u029F': 'l',
  '\u1D0D': 'm', '\u0274': 'n', '\u1D0F': 'o', '\u1D18': 'p',
  '\u01EB': 'q', '\u0280': 'r', '\uA731': 's', '\u1D1B': 't',
  '\u1D1C': 'u', '\u1D20': 'v', '\u1D21': 'w', '\u028F': 'y',
  '\u1D22': 'z',
};

/**
 * Aggressive normalization for matching/merging:
 * 1. NFKC normalization (한글 자모 합성, CJK 호환 한자 통일)
 * 2. Small caps → standard Latin (ᴜ→u, ɴ→n, ᴇ→e, ᴛ→t)
 * 3. Keep only: basic Latin, Hangul, CJK, Japanese kana, digits
 *    (strips Vai ꕥ, Tibetan ༄, decorative symbols etc.)
 * 4. Lowercase
 */
export function normalizeForMatch(name: string): string {
  let s = normalizeNickname(name).normalize('NFKC');
  // Small caps → regular Latin
  s = Array.from(s).map(c => SMALL_CAPS[c] ?? c).join('');
  return s
    .replace(/[^a-zA-Z0-9\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/gu, '')
    .toLowerCase();
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Similarity score between two nicknames (0~1, 1 = identical)
 * Uses normalizeForMatch internally for fair comparison
 */
export function levenshteinSimilarity(a: string, b: string): number {
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}
