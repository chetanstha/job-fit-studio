export const STATUSES = ["Saved", "Applied", "Interviewing", "Offer", "Rejected"] as const;
export type Status = (typeof STATUSES)[number];

export interface Resume {
  id: string;
  name: string; // e.g. "Data Analyst – v2"
  fileName?: string;
  text: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScoreBreakdown {
  skills: number;
  experience: number;
  education: number;
  keywords: number;
}

export interface Analysis {
  jobTitle: string;
  company: string;
  score: number;
  breakdown: ScoreBreakdown;
  verdict: string;
  strengths: { point: string; evidence: string }[];
  gaps: { point: string; suggestion: string }[];
  missingKeywords: string[];
  bullets: { original: string; improved: string }[];
  summary: string;
  screening: { question: string; answer: string }[];
  redFlags: string[];
}

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string;
  description: string;
  status: Status;
  createdAt: number;
  appliedOn: string; // yyyy-mm-dd or ""
  notes: string;
  resumeId: string | null;
  analysis?: Analysis;
  analyzedAt?: number;
  coverLetter?: string;
  tailoredResume?: string;
  followUp?: string;
  interview?: ChatMsg[];
  usage?: Usage;
}

export type ModelId = "claude-sonnet-5-5" | "claude-opus-5-5" | "claude-haiku-5-5";

export interface Settings {
  apiKey: string;
  model: ModelId;
  theme: "system" | "light" | "dark";
}

export interface AppData {
  version: 2;
  resumes: Resume[];
  activeResumeId: string | null;
  jobs: Job[];
  settings: Settings;
}
