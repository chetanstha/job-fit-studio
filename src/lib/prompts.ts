import type { Job, Resume } from "./types";

const HONESTY =
  "Never invent employers, job titles, dates, degrees, certifications, numbers or skills that are not in the resume. " +
  "If a metric would help but is not in the resume, leave it out rather than making one up. Write in plain, natural English.";

export const COACH_SYSTEM =
  "You are an experienced technical recruiter and resume coach. You give candid, specific, practical advice. " + HONESTY;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "\n[truncated]" : s);

export function jobBlock(job: Pick<Job, "title" | "company" | "location" | "description">) {
  return `<job_posting>
Title: ${job.title || "(not given)"}
Company: ${job.company || "(not given)"}
Location: ${job.location || "(not given)"}

${clip(job.description, 16000)}
</job_posting>`;
}

export function resumeBlock(resume: Resume) {
  return `<resume>\n${clip(resume.text, 20000)}\n</resume>`;
}

const pts = (props: Record<string, unknown>, required: string[]) => ({ type: "object", properties: props, required });
const str = (description: string) => ({ type: "string", description });
const score = (description: string) => ({ type: "integer", minimum: 0, maximum: 100, description });

export const ANALYSIS_TOOL = {
  name: "record_job_fit",
  description: "Record a structured assessment of how well the resume fits the job posting.",
  input_schema: pts(
    {
      jobTitle: str("Job title, from the posting."),
      company: str("Company name from the posting, or empty string."),
      score: score("Overall honest fit. 75+ strong, 55-74 partial, below 55 weak."),
      breakdown: pts(
        {
          skills: score("Required and preferred skills covered."),
          experience: score("Seniority, years and relevance of experience."),
          education: score("Degree and certification requirements met."),
          keywords: score("How many of the posting's important terms appear in the resume."),
        },
        ["skills", "experience", "education", "keywords"],
      ),
      verdict: str("One plain sentence explaining the overall score."),
      strengths: {
        type: "array",
        maxItems: 5,
        items: pts({ point: str("Requirement the candidate meets."), evidence: str("The resume fact that shows it.") }, ["point", "evidence"]),
      },
      gaps: {
        type: "array",
        maxItems: 5,
        items: pts({ point: str("Requirement not shown in the resume."), suggestion: str("Concrete, honest way to address it.") }, ["point", "suggestion"]),
      },
      missingKeywords: { type: "array", maxItems: 12, items: { type: "string" }, description: "Important skills or terms in the posting absent from the resume." },
      bullets: {
        type: "array",
        maxItems: 5,
        items: pts(
          {
            original: str("An existing resume bullet, copied verbatim."),
            improved: str("A rewrite aimed at this job using only facts from the resume."),
          },
          ["original", "improved"],
        ),
      },
      summary: str("A 2-3 sentence professional summary tailored to this job."),
      screening: {
        type: "array",
        maxItems: 4,
        items: pts({ question: str("Likely screening question."), answer: str("Short first-person answer grounded in the resume.") }, ["question", "answer"]),
      },
      redFlags: {
        type: "array",
        maxItems: 4,
        items: { type: "string" },
        description: "Hard blockers or concerns in the posting for this candidate (e.g. required clearance, relocation, a must-have they lack). Empty if none.",
      },
    },
    ["jobTitle", "company", "score", "breakdown", "verdict", "strengths", "gaps", "missingKeywords", "bullets", "summary", "screening", "redFlags"],
  ),
};

export function analysisPrompt(job: Job, resume: Resume) {
  return `Compare this candidate's resume with the job posting and record your assessment with the record_job_fit tool.

${jobBlock(job)}

${resumeBlock(resume)}`;
}

export type LetterTone = "Professional" | "Warm and personable" | "Short and direct" | "Enthusiastic";

export function coverLetterPrompt(job: Job, resume: Resume, tone: LetterTone, extra: string) {
  return `Write a cover letter for this job.

Tone: ${tone}. Length: ${tone === "Short and direct" ? "150-200" : "250-330"} words.
Start with "Dear Hiring Manager," and end with the candidate's real name as it appears in the resume.
Open with why this specific role and company, not a generic line. Connect two or three of the candidate's most relevant real achievements to the posting's top requirements.
Output only the letter text, with blank lines between paragraphs. No subject line, no placeholders in brackets.
${extra ? `\nThe candidate adds: ${extra}\n` : ""}
${jobBlock(job)}

${resumeBlock(resume)}`;
}

export function tailoredResumePrompt(job: Job, resume: Resume) {
  return `Rewrite this resume so it is as strong as possible for the job below, ready to paste into a document.

Keep every employer, title, date and degree exactly as in the original. You may reorder sections and bullets, rewrite bullets to lead with relevant impact, rewrite the summary, and reorganize the skills list so the posting's most important skills come first. Use the posting's terminology where it truthfully describes the candidate's work. Drop or shorten content that is irrelevant to this role.

Format as plain text with clear section headings in capitals and "- " bullets. Output only the resume.

${jobBlock(job)}

${resumeBlock(resume)}`;
}

export function followUpPrompt(job: Job, resume: Resume, days: number | null) {
  return `Write a short, polite follow-up email to the recruiter or hiring manager about this application${
    days != null ? `, sent ${days} days after applying` : ""
  }. 90-140 words. Include a subject line on the first line as "Subject: ...", then a blank line, then the email. Restate interest, mention one relevant qualification from the resume, and ask about next steps. End with the candidate's real name from the resume.

${jobBlock(job)}

${resumeBlock(resume)}`;
}

export function interviewSystem(job: Job, resume: Resume) {
  return `You are a hiring manager conducting a realistic practice interview for the role below. The person replying is the candidate.

How to run the interview:
- Ask ONE question at a time. Mix behavioral, role-specific technical and motivation questions drawn from the posting's real requirements and the candidate's resume.
- After each answer, give brief feedback in this exact format before the next question:
  **Feedback:** two or three sentences on what worked and what to improve (use the STAR method as a lens for behavioral answers).
  **Score:** n/10
  **Next question:** the question
- Keep a supportive but honest tone. If an answer is vague, say exactly what detail is missing.
- If the candidate types "end" or "done", stop asking and give an overall summary: top three strengths, top three things to practice, and an overall readiness score out of 10.

${COACH_SYSTEM}

${jobBlock(job)}

${resumeBlock(resume)}`;
}

export const INTERVIEW_KICKOFF = "I'm ready. Please introduce yourself briefly and ask the first question.";
