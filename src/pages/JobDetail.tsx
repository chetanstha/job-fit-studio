import { useState, type ChangeEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../lib/store";
import { useAI } from "../lib/useAI";
import { ANALYSIS_TOOL, COACH_SYSTEM, analysisPrompt, coverLetterPrompt, followUpPrompt, tailoredResumePrompt, type LetterTone } from "../lib/prompts";
import { STATUSES, type Analysis, type Job, type Resume, type Status } from "../lib/types";
import { band, daysSince, formatDate, needsFollowUp } from "../lib/util";
import { normalizeAnalysis } from "../lib/analysis";
import { ConfirmButton, CopyButton, ScoreBars, ScoreRing, Thinking, useToast } from "../components/ui";
import { GeneratePanel } from "../components/GeneratePanel";
import { InterviewChat } from "../components/InterviewChat";
import { isExampleId } from "../lib/sample";

type Tab = "fit" | "letter" | "resume" | "interview" | "followup" | "details";

export default function JobDetail() {
  const { id = "" } = useParams();
  const { data, updateJob, deleteJob } = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const job = data.jobs.find((j) => j.id === id);
  const [tab, setTab] = useState<Tab>("fit");
  const [tone, setTone] = useState<LetterTone>("Professional");
  const [letterNote, setLetterNote] = useState("");

  if (!job) {
    return (
      <div className="panel empty">
        <h2>Job not found</h2>
        <p>It may have been deleted.</p>
        <Link className="btn" to="/tracker">
          Back to tracker
        </Link>
      </div>
    );
  }

  const resume = data.resumes.find((r) => r.id === job.resumeId) ?? null;
  const days = daysSince(job.appliedOn);
  const patch = (p: Partial<Job>) => updateJob(job.id, p);
  const noResume = resume ? undefined : "Attach a resume to this job on the Fit analysis tab first.";

  const tabs: { id: Tab; label: string; done?: boolean }[] = [
    { id: "fit", label: "Fit analysis", done: Boolean(job.analysis) },
    { id: "letter", label: "Cover letter", done: Boolean(job.coverLetter) },
    { id: "resume", label: "Tailored resume", done: Boolean(job.tailoredResume) },
    { id: "interview", label: "Interview practice", done: Boolean(job.interview?.length) },
    { id: "followup", label: "Follow-up email", done: Boolean(job.followUp) },
    { id: "details", label: "Details & notes" },
  ];

  return (
    <>
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <p className="small">
            <Link to="/tracker">← Tracker</Link>
          </p>
          <h1 style={{ marginTop: 6 }}>
            {job.title} {isExampleId(job.id) && <span className="pill example">Example</span>}
          </h1>
          <p className="muted">
            {[job.company, job.location].filter(Boolean).join(" · ")}
            {job.url && (
              <>
                {" · "}
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                  Open posting ↗
                </a>
              </>
            )}
          </p>
        </div>
        <div className="row">
          <div className="field">
            <label htmlFor="status" className="lbl">
              Status
            </label>
            <select id="status" value={job.status} onChange={(e) => patch({ status: e.target.value as Status })} style={{ width: "auto" }}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="applied" className="lbl">
              Applied on
            </label>
            <input id="applied" type="date" value={job.appliedOn} onChange={(e) => patch({ appliedOn: e.target.value })} style={{ width: "auto" }} />
          </div>
        </div>
      </div>

      {needsFollowUp(job) && (
        <div className="notice warn">
          <span>
            You applied {days} days ago with no update. A short follow-up email can move things along.
          </span>
          <button className="btn sm" onClick={() => setTab("followup")}>
            Draft follow-up
          </button>
        </div>
      )}

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.done && <span className="tick" aria-label="done">✓</span>}
          </button>
        ))}
      </div>

      <div className="panel">
        {tab === "fit" && <FitTab job={job} resume={resume} resumes={data.resumes} onPatch={patch} />}
        {tab === "letter" && resume && (
          <GeneratePanel
            title="Cover letter"
            intro="Written from your resume for this specific posting. It streams in as Claude writes; edit freely, then copy it into the application."
            saved={job.coverLetter}
            onSave={(t) => patch({ coverLetter: t })}
            disabledReason={noResume}
            build={() => ({ system: COACH_SYSTEM, prompt: coverLetterPrompt(job, resume, tone, letterNote.trim()) })}
            controls={
              <div className="fields-2">
                <div className="field">
                  <label htmlFor="tone">Tone</label>
                  <select id="tone" value={tone} onChange={(e) => setTone(e.target.value as LetterTone)}>
                    <option>Professional</option>
                    <option>Warm and personable</option>
                    <option>Enthusiastic</option>
                    <option>Short and direct</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="note">Anything to mention? (optional)</label>
                  <input id="note" type="text" value={letterNote} onChange={(e) => setLetterNote(e.target.value)} placeholder="e.g. referred by Sam Patel; available to start in January" />
                </div>
              </div>
            }
            generateLabel="Write cover letter"
          />
        )}
        {tab === "resume" && resume && (
          <GeneratePanel
            title="Tailored resume"
            intro="A full rewrite of your resume aimed at this job. Employers, titles, dates and degrees stay exactly as they are; bullets, summary and skill order change to match the posting."
            saved={job.tailoredResume}
            onSave={(t) => patch({ tailoredResume: t })}
            build={() => ({ system: COACH_SYSTEM, prompt: tailoredResumePrompt(job, resume) })}
            generateLabel="Tailor my resume"
            maxTokens={4096}
          />
        )}
        {tab === "followup" && resume && (
          <GeneratePanel
            title="Follow-up email"
            intro="A short, polite note to the recruiter. Best sent about a week after applying."
            saved={job.followUp}
            onSave={(t) => patch({ followUp: t })}
            build={() => ({ system: COACH_SYSTEM, prompt: followUpPrompt(job, resume, days) })}
            generateLabel="Draft follow-up"
            maxTokens={800}
          />
        )}
        {(tab === "letter" || tab === "resume" || tab === "followup") && !resume && (
          <p className="small">Attach a resume to this job on the Fit analysis tab first.</p>
        )}
        {tab === "interview" && <InterviewChat job={job} resume={resume} onChange={(interview) => patch({ interview })} />}
        {tab === "details" && (
          <DetailsTab
            job={job}
            onPatch={patch}
            onDelete={() => {
              deleteJob(job.id);
              toast("Job deleted");
              nav("/tracker");
            }}
          />
        )}
      </div>
    </>
  );
}

function FitTab({ job, resume, resumes, onPatch }: { job: Job; resume: Resume | null; resumes: Resume[]; onPatch: (p: Partial<Job>) => void }) {
  const ai = useAI();
  const a = job.analysis;

  async function run(resumeId = job.resumeId) {
    const r = resumes.find((x) => x.id === resumeId);
    if (!r) return;
    if (job.description.trim().length < 120) {
      ai.setError("Add the full job description on the Details tab first.");
      return;
    }
    const out = await ai.tool<Analysis>({ system: COACH_SYSTEM, prompt: analysisPrompt(job, r), tool: ANALYSIS_TOOL });
    if (out) onPatch({ analysis: normalizeAnalysis(out.result), analyzedAt: Date.now(), usage: out.usage, resumeId: r.id });
  }

  const resumePicker = (
    <div className="row">
      <label htmlFor="jr" className="small muted">
        Resume
      </label>
      <select id="jr" value={job.resumeId ?? ""} onChange={(e) => onPatch({ resumeId: e.target.value })} style={{ width: "auto" }}>
        {!resume && <option value="">Choose a resume</option>}
        {resumes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      {ai.running ? (
        <button className="btn sm" onClick={ai.stop}>
          Stop
        </button>
      ) : (
        <button className="btn sm primary" onClick={() => run()} disabled={!ai.hasKey || !resume}>
          {a ? "Re-analyze" : "Analyze fit"}
        </button>
      )}
    </div>
  );

  if (ai.running) return (
    <div className="stack">
      {resumePicker}
      <Thinking label="Comparing your resume with the posting…" />
    </div>
  );

  if (!a)
    return (
      <div className="stack">
        {resumePicker}
        {!ai.hasKey && (
          <p className="small">
            Add your Anthropic API key in <Link to="/settings">Settings</Link> to analyze this job.
          </p>
        )}
        {ai.error && <p className="error">{ai.error}</p>}
        <div className="empty">
          <h3>Not analyzed yet</h3>
          <p>Analyze to get a fit score, strengths, gaps and tailored bullets.</p>
        </div>
      </div>
    );

  const { tone, label } = band(a.score);

  return (
    <div>
      <div className="spread" style={{ marginBottom: 16 }}>
        <span className="small muted">
          {job.analyzedAt ? `Analyzed ${formatDate(job.analyzedAt)}` : ""}
          {job.usage ? ` · ${(job.usage.inputTokens + job.usage.outputTokens).toLocaleString()} tokens` : ""}
        </span>
        {resumePicker}
      </div>
      {ai.error && <p className="error" style={{ marginBottom: 12 }}>{ai.error}</p>}

      <div className="cols" style={{ alignItems: "center" }}>
        <div className="verdict">
          <ScoreRing score={a.score} />
          <div>
            <span className={`pill ${tone}`}>{label}</span>
            <p style={{ marginTop: 8 }}>{a.verdict}</p>
          </div>
        </div>
        <ScoreBars breakdown={a.breakdown} />
      </div>

      {a.redFlags.length > 0 && (
        <div className="section">
          <h3>Possible blockers</h3>
          <ul className="points bad">
            {a.redFlags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="section cols">
        <div>
          <h3>Where you match</h3>
          <ul className="points good">
            {a.strengths.map((s, i) => (
              <li key={i}>
                {s.point}
                <span>{s.evidence}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Gaps to address</h3>
          <ul className="points gap">
            {a.gaps.map((g, i) => (
              <li key={i}>
                {g.point}
                <span>{g.suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {a.missingKeywords.length > 0 && (
        <div className="section stack" style={{ gap: 10 }}>
          <div className="spread">
            <h3>Keywords missing from your resume</h3>
            <CopyButton text={a.missingKeywords.join(", ")} label="Copy list" />
          </div>
          <div className="chips">
            {a.missingKeywords.map((k) => (
              <span className="chip" key={k}>
                {k}
              </span>
            ))}
          </div>
          <p className="small muted">Add these only where they're true. Applicant tracking systems scan for them.</p>
        </div>
      )}

      <div className="section stack" style={{ gap: 8 }}>
        <div className="spread">
          <h3>Tailored summary</h3>
          <CopyButton text={a.summary} />
        </div>
        <p>{a.summary}</p>
      </div>

      {a.bullets.length > 0 && (
        <div className="section">
          <h3>Stronger resume bullets</h3>
          {a.bullets.map((b, i) => (
            <div className="rewrite" key={i}>
              <div className="was">{b.original}</div>
              <div className="now">
                <p>{b.improved}</p>
                <CopyButton text={b.improved} />
              </div>
            </div>
          ))}
        </div>
      )}

      {a.screening.length > 0 && (
        <div className="section">
          <h3>Likely screening questions</h3>
          {a.screening.map((q, i) => (
            <div className="rewrite" key={i}>
              <div className="spread">
                <b>{q.question}</b>
                <CopyButton text={q.answer} />
              </div>
              <p>{q.answer}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailsTab({ job, onPatch, onDelete }: { job: Job; onPatch: (p: Partial<Job>) => void; onDelete: () => void }) {
  const [form, setForm] = useState({ title: job.title, company: job.company, location: job.location, url: job.url, description: job.description, notes: job.notes });
  const toast = useToast();
  const set = (k: keyof typeof form) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const changed = (Object.keys(form) as (keyof typeof form)[]).some((k) => form[k] !== job[k]);

  return (
    <form
      className="fields"
      onSubmit={(e) => {
        e.preventDefault();
        onPatch(form);
        toast("Saved");
      }}
    >
      <div className="fields-2">
        <div className="field">
          <label htmlFor="d-title">Job title</label>
          <input id="d-title" type="text" value={form.title} onChange={set("title")} />
        </div>
        <div className="field">
          <label htmlFor="d-company">Company</label>
          <input id="d-company" type="text" value={form.company} onChange={set("company")} />
        </div>
        <div className="field">
          <label htmlFor="d-location">Location</label>
          <input id="d-location" type="text" value={form.location} onChange={set("location")} />
        </div>
        <div className="field">
          <label htmlFor="d-url">Posting link</label>
          <input id="d-url" type="url" value={form.url} onChange={set("url")} />
        </div>
      </div>
      <div className="field">
        <label htmlFor="d-notes">Notes</label>
        <textarea id="d-notes" value={form.notes} onChange={set("notes")} style={{ minHeight: 90 }} placeholder="Recruiter name, referral, interview dates…" />
      </div>
      <div className="field">
        <label htmlFor="d-desc">Job description</label>
        <textarea id="d-desc" value={form.description} onChange={set("description")} style={{ minHeight: 240 }} />
      </div>
      <div className="spread">
        <button type="submit" className="btn primary" disabled={!changed}>
          Save changes
        </button>
        <ConfirmButton confirmLabel="Delete job" onConfirm={onDelete}>
          Delete this job
        </ConfirmButton>
      </div>
    </form>
  );
}
