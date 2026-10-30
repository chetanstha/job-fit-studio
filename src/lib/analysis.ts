import type { Analysis } from "./types";

const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

/** Guard against missing or out-of-range fields in the model's tool input. */
export function normalizeAnalysis(raw: Partial<Analysis>): Analysis {
  const b = (raw.breakdown ?? {}) as Partial<Analysis["breakdown"]>;
  return {
    jobTitle: String(raw.jobTitle ?? ""),
    company: String(raw.company ?? ""),
    score: clamp(raw.score),
    breakdown: { skills: clamp(b.skills), experience: clamp(b.experience), education: clamp(b.education), keywords: clamp(b.keywords) },
    verdict: String(raw.verdict ?? ""),
    strengths: arr(raw.strengths),
    gaps: arr(raw.gaps),
    missingKeywords: arr<string>(raw.missingKeywords),
    bullets: arr(raw.bullets),
    summary: String(raw.summary ?? ""),
    screening: arr(raw.screening),
    redFlags: arr<string>(raw.redFlags),
  };
}
