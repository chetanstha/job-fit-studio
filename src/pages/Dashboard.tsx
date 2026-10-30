import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { STATUSES, type Job } from "../lib/types";
import { daysSince, needsFollowUp } from "../lib/util";
import { ScorePill } from "../components/ui";

export default function Dashboard() {
  const { data, activeResume, loadExamples, clearExamples, hasExamples } = useStore();
  const { jobs } = data;
  const hasKey = Boolean(data.settings.apiKey);

  const stats = useMemo(() => {
    const submitted = jobs.filter((j) => j.status !== "Saved");
    const responded = jobs.filter((j) => j.status === "Interviewing" || j.status === "Offer");
    const scored = jobs.filter((j) => j.analysis);
    const avgFit = scored.length ? Math.round(scored.reduce((s, j) => s + (j.analysis?.score ?? 0), 0) / scored.length) : null;
    const weekAgo = jobs.filter((j) => {
      const d = daysSince(j.appliedOn);
      return d !== null && d < 7;
    }).length;
    return {
      submitted: submitted.length,
      responseRate: submitted.length ? Math.round((responded.length / submitted.length) * 100) : null,
      avgFit,
      weekAgo,
      followUps: jobs.filter(needsFollowUp),
      readyToApply: jobs
        .filter((j) => j.status === "Saved" && j.analysis)
        .sort((a, b) => (b.analysis?.score ?? 0) - (a.analysis?.score ?? 0))
        .slice(0, 5),
    };
  }, [jobs]);

  const isEmpty = jobs.length === 0 && data.resumes.length === 0;

  if (isEmpty) return <Welcome hasKey={hasKey} onExamples={loadExamples} />;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Your job search</h1>
          <p className="muted">
            {activeResume ? (
              <>
                Active resume: <Link to="/resumes">{activeResume.name}</Link>
              </>
            ) : (
              <>
                No active resume. <Link to="/resumes">Add one</Link> to analyze jobs.
              </>
            )}
          </p>
        </div>
        <div className="row">
          {hasExamples && (
            <button className="btn" onClick={clearExamples}>
              Remove example data
            </button>
          )}
          <Link to="/analyze" className="btn primary">
            Analyze a job
          </Link>
        </div>
      </div>

      {!hasKey && (
        <div className="notice warn">
          <span>Add your Anthropic API key to turn on fit analysis, cover letters and interview practice.</span>
          <Link to="/settings" className="btn sm">
            Add API key
          </Link>
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <b>{stats.submitted}</b>
          <span>Applications sent</span>
        </div>
        <div className="kpi">
          <b>{stats.weekAgo}</b>
          <span>Sent in the last 7 days</span>
        </div>
        <div className="kpi">
          <b>{stats.responseRate == null ? "—" : `${stats.responseRate}%`}</b>
          <span>Got an interview or offer</span>
        </div>
        <div className="kpi">
          <b>{stats.avgFit ?? "—"}</b>
          <span>Average fit score</span>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        <div className="panel stack">
          <h2>Pipeline</h2>
          <Funnel jobs={jobs} />
        </div>
        <div className="panel stack">
          <div className="spread">
            <h2>Applications per week</h2>
            <span className="small muted">last 8 weeks</span>
          </div>
          <WeeklyChart jobs={jobs} />
        </div>
        <div className="panel">
          <div className="spread" style={{ marginBottom: 6 }}>
            <h2>Follow up</h2>
            <span className="pill mid mono">{stats.followUps.length}</span>
          </div>
          {stats.followUps.length === 0 ? (
            <p className="muted small">Nothing overdue. Applications show up here 7 days after you apply.</p>
          ) : (
            stats.followUps.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="list-link">
                <span>
                  <span className="t">{j.title}</span>
                  <span className="small muted"> · {j.company}</span>
                </span>
                <span className="small muted mono">{daysSince(j.appliedOn)}d</span>
              </Link>
            ))
          )}
        </div>
        <div className="panel">
          <h2 style={{ marginBottom: 6 }}>Best fits to apply to</h2>
          {stats.readyToApply.length === 0 ? (
            <p className="muted small">Analyzed jobs you haven't applied to yet appear here, best fit first.</p>
          ) : (
            stats.readyToApply.map((j) => (
              <Link key={j.id} to={`/jobs/${j.id}`} className="list-link">
                <span>
                  <span className="t">{j.title}</span>
                  <span className="small muted"> · {j.company}</span>
                </span>
                <ScorePill score={j.analysis?.score} />
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}

function Funnel({ jobs }: { jobs: Job[] }) {
  const counts = STATUSES.map((s) => ({ s, n: jobs.filter((j) => j.status === s).length }));
  const max = Math.max(1, ...counts.map((c) => c.n));
  return (
    <div className="funnel">
      {counts.map(({ s, n }) => (
        <div className="funnel-row" key={s}>
          <span>{s}</span>
          <div className="funnel-bar" style={{ width: `${(n / max) * 100}%`, opacity: s === "Rejected" ? 0.4 : 1 }} />
          <span className="mono" style={{ textAlign: "right" }}>
            {n}
          </span>
        </div>
      ))}
    </div>
  );
}

function WeeklyChart({ jobs }: { jobs: Job[] }) {
  const weeks = 8;
  const buckets = Array.from({ length: weeks }, () => 0);
  for (const j of jobs) {
    const d = daysSince(j.appliedOn);
    if (d === null) continue;
    const w = Math.floor(d / 7);
    if (w < weeks) buckets[weeks - 1 - w] += 1;
  }
  const max = Math.max(4, ...buckets);
  const W = 360, H = 170, padL = 26, padB = 22, padT = 10;
  const bw = (W - padL) / weeks;
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  const label = (i: number) => (i === weeks - 1 ? "now" : `-${weeks - 1 - i}w`);
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Applications sent per week: ${buckets.join(", ")}`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeDasharray={t ? "3 3" : undefined} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {buckets.map((v, i) => {
          const x = padL + i * bw + bw * 0.18;
          const w = bw * 0.64;
          const last = i === weeks - 1;
          return (
            <g key={i}>
              {v > 0 && <rect x={x} y={y(v)} width={w} height={y(0) - y(v)} rx={3} fill="var(--accent)" opacity={last ? 1 : 0.55} />}
              {v > 0 && (
                <text x={x + w / 2} y={y(v) - 4} textAnchor="middle" style={{ fill: "var(--fg)" }}>
                  {v}
                </text>
              )}
              <text x={x + w / 2} y={H - 6} textAnchor="middle">
                {label(i)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Welcome({ hasKey, onExamples }: { hasKey: boolean; onExamples: () => void }) {
  const steps = [
    { done: hasKey, title: "Add your Anthropic API key", body: "AI features run with your own key, straight from this browser.", to: "/settings", cta: "Open Settings" },
    { done: false, title: "Upload your resume", body: "PDF, Word or text. Keep a version for each kind of role.", to: "/resumes", cta: "Add resume" },
    { done: false, title: "Paste a job posting", body: "Get a fit score, gaps, keywords, tailored bullets and more.", to: "/analyze", cta: "Analyze a job" },
  ];
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Apply smarter, not to everything</h1>
          <p className="muted">
            Job Fit Studio compares your resume with each posting, tells you honestly how well you fit, and writes the tailored cover letter,
            resume and follow-up you need. It also runs mock interviews and tracks every application.
          </p>
        </div>
      </div>
      <div className="stack">
        {steps.map((s, i) => (
          <div key={s.title} className="panel spread">
            <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
              <span className={`pill ${s.done ? "good" : "neutral"} mono`}>{s.done ? "✓" : i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p className="small muted">{s.body}</p>
              </div>
            </div>
            <Link to={s.to} className={`btn ${i === steps.findIndex((x) => !x.done) ? "primary" : ""}`}>
              {s.cta}
            </Link>
          </div>
        ))}
        <div className="notice">
          <span>Want to look around first? Load a fictional resume and five sample applications. You can remove them in one click.</span>
          <button className="btn sm" onClick={onExamples}>
            Load example data
          </button>
        </div>
      </div>
    </>
  );
}
