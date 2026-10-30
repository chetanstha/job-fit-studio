# Job Fit Studio

A single-page web app for job hunting. Add your resume once, paste a job posting, and get:

- An AI **fit score** (0–100) with a one-line verdict
- Where you match and the gaps to address
- Keywords from the posting that are missing from your resume
- Rewrites of your existing resume bullets, aimed at the job
- A tailored professional summary and a cover letter in your chosen tone
- Likely screening questions with suggested answers
- An **application tracker** (Saved → Applied → Interviewing → Offer / Rejected) that flags applications needing a follow-up after 7 days

Resumes can be uploaded as PDF (read with pdf.js), Word `.docx` (read with mammoth.js) or plain text, or pasted in.

## How it runs

The app is one file, `index.html`, with no build step.

It was built as a Claude artifact. The AI features use Claude's artifact runtime (`claude.use("sample")`), and the resume and tracker are saved to your account (`claude.use("db")`). **Opened outside Claude** (for example from GitHub Pages or by opening the file locally), the resume upload and tracker still work and save to your browser's local storage, but the AI analysis is unavailable.

## It doesn't auto-apply

Job Fit Studio does not submit applications. LinkedIn's User Agreement prohibits automated applying, so you review and send each application yourself. Always read AI-written text before you use it.
