# Job Fit Studio

An AI job-application assistant built with React and the Claude API. Upload your resume, paste a job posting, and get an honest fit score plus everything you need to apply: tailored bullets, a cover letter, a fully tailored resume, mock interview practice and a follow-up email. A drag-and-drop tracker and dashboard keep your whole search organized.

**Live app:** https://chetanstha.github.io/job-fit-studio/

## Features

**AI (Claude)**
- **Fit analysis.** A 0–100 score broken down into skills, experience, education and keywords, with strengths tied to evidence in your resume, gaps with honest fixes, missing ATS keywords, possible blockers, rewritten bullets, a tailored summary and likely screening questions. Uses forced tool use with a JSON schema, so results are always structured.
- **Streaming cover letters** in four tones, with an optional note (a referral, a start date). Edit and save in place.
- **Tailored resume.** A complete rewrite aimed at one posting that keeps employers, titles, dates and degrees unchanged.
- **Mock interviews.** Claude plays the hiring manager, asks one question at a time from the posting and your resume, and scores each answer. Type `end` for a readiness summary.
- **Follow-up emails** drafted from how long ago you applied.
- **Resume review.** A recruiter-style critique of any saved resume.
- Every AI response streams live and can be stopped. Token usage is shown after each call.

**Organization**
- **Resume library.** Upload PDF, Word (.docx) or text; keep a version per kind of role and pick which one each job uses.
- **Tracker.** A Kanban board (drag cards between Saved, Applied, Interviewing, Offer and Rejected) or a sortable, searchable list. Applications 7+ days old with no update are flagged for follow-up.
- **Dashboard.** Applications sent, weekly activity, interview rate, average fit, pipeline funnel, overdue follow-ups and your best-fit unapplied jobs.
- Example data to explore the app, light and dark themes, and JSON backup export and import.

## Privacy and your API key

There is no backend. All data lives in your browser's local storage. AI requests go straight from your browser to Anthropic using **your own API key** (create one at [console.anthropic.com](https://console.anthropic.com/settings/keys)). The key is stored only in your browser and is never included in exports. Use it only on your own device and set a spend limit in the Anthropic Console.

## It doesn't auto-apply

Job Fit Studio prepares applications; you submit them. LinkedIn's User Agreement prohibits automated applying, and tailored applications get better results than mass ones. Always read AI-written text before you send it.

## Development

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run typecheck
```

Stack: React 18, TypeScript, Vite, React Router (hash routing for static hosting), pdf.js and mammoth for resume parsing. The Claude client in `src/lib/claude.ts` uses `fetch` with server-sent-event streaming, with no SDK dependency.

```
src/
  lib/        claude.ts (API client), prompts.ts, store.tsx (state + persistence), parseResume.ts, types.ts
  components/ GeneratePanel (streaming writer), InterviewChat, shared UI
  pages/      Dashboard, Analyze, JobDetail, Tracker, Resumes, Settings
```

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions** once.

`legacy/claude-artifact.html` is the original single-file version that runs inside Claude.
