import type { Job } from "./types";

export function daysSince(date: string): number | null {
  if (!date) return null;
  const t = new Date(date + "T00:00:00").getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export const FOLLOW_UP_DAYS = 7;

export function needsFollowUp(job: Job) {
  const d = daysSince(job.appliedOn);
  return job.status === "Applied" && d !== null && d >= FOLLOW_UP_DAYS;
}

export function band(score: number): { tone: "good" | "mid" | "low"; label: string } {
  if (score >= 75) return { tone: "good", label: "Strong match" };
  if (score >= 55) return { tone: "mid", label: "Partial match" };
  return { tone: "low", label: "Weak match" };
}

export function wordCount(s: string) {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function formatDate(ms: number | string) {
  const d = typeof ms === "string" ? new Date(ms + "T00:00:00") : new Date(ms);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
