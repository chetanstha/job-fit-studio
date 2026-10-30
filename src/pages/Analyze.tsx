import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { useAI } from "../lib/useAI";
import { ANALYSIS_TOOL, COACH_SYSTEM, analysisPrompt } from "../lib/prompts";
import type { Analysis, Job } from "../lib/types";
import { Thinking, useToast } from "../components/ui";
import { normalizeAnalysis } from "../lib/analysis";

export default function Analyze() {
  const { data, activeResume, addJob, updateJob } = useStore();
  const nav = useNavigate();
  const toast = useToast();
  const ai = useAI();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [resumeId, setResumeId] = useState(activeResume?.id ?? "");
  const [formError, setFormError] = useState("");

  const resume = data.resumes.find((r) => r.id === resumeId) ?? activeResume;

  function draft(): Omit<Job, "id" | "createdAt"> {
    return {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      url: url.trim(),
      description: description.trim(),
      status: "Saved",
      appliedOn: "",
      notes: "",
      resumeId: resume?.id ?? null,
    };
  }

  async function analyze() {
    setFormError("");
    if (!resume) return setFormError("Add a resume first.");
    if (description.trim().length < 120) return setFormError("Paste the full job description. It needs more detail to compare against.");
    const job = { ...draft(), id: "pending", createdAt: Date.now() } as Job;
    const out = await ai.tool<Analysis>({
      system: COACH_SYSTEM,
      prompt: analysisPrompt(job, resume),
      tool: ANALYSIS_TOOL,
      maxTokens: 4096,
    });
    if (!out) return;
    const analysis = normalizeAnalysis(out.result);
    const id = addJob({
      ...draft(),
      title: job.title || analysis.jobTitle || "Untitled role",
      company: job.company || analysis.company || "",
    });
    updateJob(id, { analysis, analyzedAt: Date.now(), usage: out.usage });
    nav(`/jobs/${id}`);
  }

  function saveOnly() {
    setFormError("");
    if (!title.trim() || !company.trim()) return setFormError("Add at least a job title and company to save it.");
    const id = addJob(draft());
    toast("Saved to tracker");
    nav(`/jobs/${id}`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Analyze a job</h1>
          <p className="muted">Paste a posting from LinkedIn or anywhere else. Claude scores your fit and drafts what you need to apply.</p>
        </div>
      </div>

      {!ai.hasKey && (
        <div className="notice warn">
          <span>AI analysis needs your Anthropic API key.</span>
          <Link className="btn sm" to="/settings">
            Add API key
          </Link>
        </div>
      )}

      <div className="grid-2">
        <div className="panel fields">
          <div className="field">
            <label htmlFor="resume">Resume to compare</label>
            {data.resumes.length ? (
              <select id="resume" value={resume?.id ?? ""} onChange={(e) => setResumeId(e.target.value)}>
                {data.resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="small">
                No resume yet. <Link to="/resumes">Add your resume</Link> first.
              </p>
            )}
          </div>
          <div className="fields-2">
            <div className="field">
              <label htmlFor="title">Job title</label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Analyst" />
            </div>
            <div className="field">
              <label htmlFor="company">Company</label>
              <input id="company" type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
            </div>
          </div>
          <div className="fields-2">
            <div className="field">
              <label htmlFor="location">Location</label>
              <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Remote" />
            </div>
            <div className="field">
              <label htmlFor="url">Posting link</label>
              <input id="url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.linkedin.com/jobs/view/…" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="desc">Full job description</label>
            <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} style={{ minHeight: 260 }} placeholder="Copy the whole description, including requirements and qualifications." />
          </div>
          <div className="row">
            {ai.running ? (
              <button className="btn" onClick={ai.stop}>
                Stop
              </button>
            ) : (
              <button className="btn primary" onClick={analyze} disabled={!ai.hasKey || !resume}>
                Analyze fit
              </button>
            )}
            <button className="btn" onClick={saveOnly} disabled={ai.running}>
              Save without analyzing
            </button>
          </div>
          {(formError || ai.error) && <p className="error" role="alert">{formError || ai.error}</p>}
        </div>

        <div className="panel">
          {ai.running ? (
            <Thinking label="Comparing your resume with the posting. This takes 15–40 seconds." />
          ) : (
            <div className="stack">
              <h2>What you'll get</h2>
              <ul className="points good">
                <li>
                  A fit score out of 100<span>Broken down into skills, experience, education and keywords.</span>
                </li>
                <li>
                  Strengths and gaps<span>Each strength is tied to a line in your resume; each gap comes with an honest fix.</span>
                </li>
                <li>
                  Missing keywords and red flags<span>Terms applicant tracking systems look for, and blockers like required clearances.</span>
                </li>
                <li>
                  Rewritten bullets and a tailored summary<span>Built only from facts already in your resume.</span>
                </li>
                <li>
                  Then, on the job's page<span>A streaming cover letter, a fully tailored resume, mock interview practice and a follow-up email.</span>
                </li>
              </ul>
              <p className="small muted">Requests go directly from your browser to Anthropic using your key, with the model chosen in Settings ({data.settings.model}).</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
