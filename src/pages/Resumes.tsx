import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { extractResumeText } from "../lib/parseResume";
import { formatDate, wordCount } from "../lib/util";
import { useAI } from "../lib/useAI";
import { COACH_SYSTEM } from "../lib/prompts";
import { ConfirmButton, CopyButton, RichText, Thinking, useToast } from "../components/ui";
import { isExampleId } from "../lib/sample";

export default function Resumes() {
  const { data, activeResume, saveResume, deleteResume, setActiveResume } = useStore();
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | undefined>();
  const [reading, setReading] = useState(false);
  const [fileMsg, setFileMsg] = useState("");
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const editorOpen = editingId !== null;

  const ai = useAI();
  const [review, setReview] = useState("");
  const [reviewFor, setReviewFor] = useState<string | null>(null);

  function startNew() {
    setEditingId("new");
    setName(data.resumes.length ? `Resume v${data.resumes.length + 1}` : "My resume");
    setText("");
    setFileName(undefined);
    setFileMsg("");
  }

  function startEdit(id: string) {
    const r = data.resumes.find((x) => x.id === id);
    if (!r) return;
    setEditingId(id);
    setName(r.name);
    setText(r.text);
    setFileName(r.fileName);
    setFileMsg("");
  }

  async function onFile(file?: File) {
    if (!file) return;
    if (!editorOpen) startNew();
    setReading(true);
    setFileMsg(`Reading ${file.name}…`);
    try {
      const t = await extractResumeText(file);
      if (t.length < 80) throw new Error("Couldn't find much text in that file. If it's a scanned image, paste the text instead.");
      setText(t);
      setFileName(file.name);
      setName((n) => (n && !/^Resume v\d+$|^My resume$/.test(n) ? n : file.name.replace(/\.[^.]+$/, "")));
      setFileMsg(`Read ${wordCount(t).toLocaleString()} words from ${file.name}. Check the text, then save.`);
    } catch (e) {
      setFileMsg(e instanceof Error ? e.message : "Couldn't read that file.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onSave() {
    if (text.trim().length < 80) {
      setFileMsg("That looks too short to be a resume. Paste or upload the full text.");
      return;
    }
    saveResume({ id: editingId === "new" ? undefined : editingId!, name: name.trim() || "Untitled resume", text: text.trim(), fileName });
    toast("Resume saved");
    setEditingId(null);
  }

  async function getReview(id: string) {
    const r = data.resumes.find((x) => x.id === id);
    if (!r) return;
    setReviewFor(id);
    setReview("");
    await ai.stream({
      system: COACH_SYSTEM,
      maxTokens: 1800,
      messages: [
        {
          role: "user",
          content: `Review this resume as a recruiter would on a first 30-second scan, then in depth. Use these headings in markdown bold: **First impression**, **What works**, **Fix first** (the 3-5 highest-impact changes, each with a concrete before/after example from the resume), **Formatting and ATS**, **Missing information**. Be specific and candid.\n\n<resume>\n${r.text}\n</resume>`,
        },
      ],
      onText: setReview,
    });
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Resumes</h1>
          <p className="muted">Keep a version for each kind of role you apply for. The active resume is used for new analyses.</p>
        </div>
        {!editorOpen && (
          <button className="btn primary" onClick={startNew}>
            Add resume
          </button>
        )}
      </div>

      {editorOpen && (
        <div className="panel stack" style={{ marginBottom: 20 }}>
          <div className="spread">
            <h2>{editingId === "new" ? "New resume" : "Edit resume"}</h2>
            <button className="btn ghost sm" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
          <div
            className={`drop ${over ? "over" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              onFile(e.dataTransfer.files[0]);
            }}
          >
            <strong>{reading ? "Reading file…" : "Drop your resume here or click to upload"}</strong>
            <span className="small">PDF, Word (.docx) or text. Scanned image PDFs can't be read.</span>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          {fileMsg && <p className="small muted" role="status">{fileMsg}</p>}
          <div className="field">
            <label htmlFor="rname">Name this version</label>
            <input id="rname" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Analyst – v2" />
          </div>
          <div className="field">
            <label htmlFor="rtext">Resume text</label>
            <textarea id="rtext" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 340 }} placeholder="Or paste your resume text here." />
            <span className="small muted">{wordCount(text).toLocaleString()} words</span>
          </div>
          <div className="row">
            <button className="btn primary" onClick={onSave} disabled={reading}>
              Save resume
            </button>
          </div>
        </div>
      )}

      {data.resumes.length === 0 && !editorOpen ? (
        <div className="panel empty">
          <h2>No resumes yet</h2>
          <p>Upload your resume once and every job analysis will use it.</p>
          <button className="btn primary" onClick={startNew}>
            Add your resume
          </button>
        </div>
      ) : (
        <div className="resume-list">
          {data.resumes.map((r) => {
            const isActive = r.id === activeResume?.id;
            const usedBy = data.jobs.filter((j) => j.resumeId === r.id).length;
            return (
              <div key={r.id} className="stack" style={{ gap: 0 }}>
                <div className={`resume-item ${isActive ? "active" : ""}`}>
                  <div className="page-icon" aria-hidden="true" />
                  <div className="meta">
                    <strong>
                      {r.name} {isExampleId(r.id) && <span className="pill example">Example</span>}
                    </strong>
                    <span className="small muted">
                      {wordCount(r.text).toLocaleString()} words · updated {formatDate(r.updatedAt)} · used for {usedBy} job{usedBy === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="row">
                    {isActive ? (
                      <span className="pill good">Active</span>
                    ) : (
                      <button className="btn sm" onClick={() => setActiveResume(r.id)}>
                        Make active
                      </button>
                    )}
                    <button className="btn sm" onClick={() => getReview(r.id)} disabled={ai.running}>
                      AI review
                    </button>
                    <button className="btn sm" onClick={() => startEdit(r.id)}>
                      Edit
                    </button>
                    <ConfirmButton onConfirm={() => deleteResume(r.id)}>Delete</ConfirmButton>
                  </div>
                </div>
                {reviewFor === r.id && (
                  <div className="panel" style={{ marginTop: 8 }}>
                    <div className="spread" style={{ marginBottom: 10 }}>
                      <h3>Resume review</h3>
                      <div className="row">
                        {ai.running ? (
                          <button className="btn sm" onClick={ai.stop}>
                            Stop
                          </button>
                        ) : (
                          <CopyButton text={review} />
                        )}
                        <button className="btn ghost sm" onClick={() => setReviewFor(null)}>
                          Close
                        </button>
                      </div>
                    </div>
                    {!ai.hasKey ? (
                      <p className="small">
                        Add your Anthropic API key in <Link to="/settings">Settings</Link> to get an AI review.
                      </p>
                    ) : ai.error ? (
                      <p className="error">{ai.error}</p>
                    ) : review ? (
                      <RichText text={review} />
                    ) : (
                      <Thinking label="Reading your resume…" />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
