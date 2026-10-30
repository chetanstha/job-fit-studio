import { useMemo, useState, type DragEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { STATUSES, type Job, type Status } from "../lib/types";
import { daysSince, formatDate, needsFollowUp } from "../lib/util";
import { ScorePill, useToast } from "../components/ui";
import { isExampleId } from "../lib/sample";

type View = "board" | "list";
type Sort = "recent" | "score" | "company";

const initialView = (): View => {
  try {
    return (localStorage.getItem("jfs.trackerView") as View) || "board";
  } catch {
    return "board";
  }
};

export default function Tracker() {
  const { data, updateJob } = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const [view, setView] = useState<View>(initialView);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Status | null>(null);

  const jobs = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? data.jobs.filter((j) => `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(needle)) : data.jobs;
    const sorted = [...list];
    if (sort === "recent") sorted.sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "score") sorted.sort((a, b) => (b.analysis?.score ?? -1) - (a.analysis?.score ?? -1));
    if (sort === "company") sorted.sort((a, b) => a.company.localeCompare(b.company));
    return sorted;
  }, [data.jobs, q, sort]);

  function pickView(v: View) {
    setView(v);
    try {
      localStorage.setItem("jfs.trackerView", v);
    } catch {
      /* ignore */
    }
  }

  function move(id: string, status: Status) {
    const job = data.jobs.find((j) => j.id === id);
    if (!job || job.status === status) return;
    updateJob(id, { status });
    toast(`Moved to ${status}`);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Tracker</h1>
          <p className="muted">Drag cards between columns as applications move forward. Anything applied to 7+ days ago is flagged for follow-up.</p>
        </div>
        <Link to="/analyze" className="btn primary">
          Add a job
        </Link>
      </div>

      <div className="spread" style={{ marginBottom: 14 }}>
        <div className="row" style={{ flex: "1 1 280px" }}>
          <label htmlFor="search" className="sr-only">
            Search jobs
          </label>
          <input id="search" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, company or location" style={{ maxWidth: 320 }} />
          <label htmlFor="sort" className="sr-only">
            Sort
          </label>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ width: "auto" }}>
            <option value="recent">Newest first</option>
            <option value="score">Best fit first</option>
            <option value="company">Company A–Z</option>
          </select>
        </div>
        <div className="row" role="group" aria-label="View">
          <button className={`btn sm ${view === "board" ? "primary" : ""}`} aria-pressed={view === "board"} onClick={() => pickView("board")}>
            Board
          </button>
          <button className={`btn sm ${view === "list" ? "primary" : ""}`} aria-pressed={view === "list"} onClick={() => pickView("list")}>
            List
          </button>
        </div>
      </div>

      {data.jobs.length === 0 ? (
        <div className="panel empty">
          <h2>No applications yet</h2>
          <p>Analyze a job posting and it lands here, ready to track.</p>
          <Link to="/analyze" className="btn primary">
            Analyze your first job
          </Link>
        </div>
      ) : view === "board" ? (
        <div className="board">
          {STATUSES.map((status) => {
            const col = jobs.filter((j) => j.status === status);
            return (
              <section
                key={status}
                className={`col ${overCol === status ? "over" : ""}`}
                aria-label={status}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  if (overCol !== status) setOverCol(status);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverCol(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragId;
                  if (id) move(id, status);
                  setOverCol(null);
                  setDragId(null);
                }}
              >
                <div className="col-head">
                  <span>{status}</span>
                  <span className="mono muted">{col.length}</span>
                </div>
                {col.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    dragging={dragId === j.id}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", j.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(j.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverCol(null);
                    }}
                    onOpen={() => nav(`/jobs/${j.id}`)}
                  />
                ))}
                {col.length === 0 && <p className="small muted" style={{ padding: "6px 4px" }}>Drop here</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Fit</th>
                <th>Status</th>
                <th>Applied</th>
                <th>Next step</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <Link to={`/jobs/${j.id}`} style={{ fontWeight: 600, color: "var(--fg)" }}>
                      {j.title}
                    </Link>{" "}
                    {isExampleId(j.id) && <span className="pill example">Example</span>}
                    <div className="small muted">{[j.company, j.location].filter(Boolean).join(" · ")}</div>
                  </td>
                  <td>
                    <ScorePill score={j.analysis?.score} />
                  </td>
                  <td>
                    <select aria-label={`Status for ${j.title}`} value={j.status} onChange={(e) => move(j.id, e.target.value as Status)}>
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="mono small">{j.appliedOn ? formatDate(j.appliedOn) : "—"}</td>
                  <td>
                    <NextStep job={j} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.jobs.length > 0 && jobs.length === 0 && <p className="muted" style={{ marginTop: 12 }}>No jobs match “{q}”.</p>}
    </>
  );
}

function NextStep({ job }: { job: Job }) {
  const d = daysSince(job.appliedOn);
  if (needsFollowUp(job)) return <span className="pill mid">Follow up · {d}d</span>;
  if (job.status === "Saved" && !job.analysis) return <span className="small muted">Analyze fit</span>;
  if (job.status === "Saved" && !job.coverLetter) return <span className="small muted">Write cover letter</span>;
  if (job.status === "Saved") return <span className="small muted">Ready to apply</span>;
  if (job.status === "Interviewing") return <span className="small muted">Practice interview</span>;
  if (job.status === "Applied" && d !== null) return <span className="small muted">Applied {d}d ago</span>;
  return null;
}

function JobCard({
  job,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
}: {
  job: Job;
  dragging: boolean;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
}) {
  return (
    <article
      className={`card ${dragging ? "dragging" : ""}`}
      draggable
      tabIndex={0}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      aria-label={`${job.title} at ${job.company}`}
    >
      <div className="title">{job.title}</div>
      <div className="meta">{[job.company, job.location].filter(Boolean).join(" · ")}</div>
      <div className="foot">
        <ScorePill score={job.analysis?.score} />
        <NextStep job={job} />
      </div>
      {isExampleId(job.id) && <span className="pill example" style={{ justifySelf: "start" }}>Example</span>}
    </article>
  );
}
