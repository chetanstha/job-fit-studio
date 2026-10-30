import { useState } from "react";
import { Link } from "react-router-dom";
import { useAI } from "../lib/useAI";
import { INTERVIEW_KICKOFF, interviewSystem } from "../lib/prompts";
import type { ChatMsg, Job, Resume } from "../lib/types";
import { ConfirmButton, RichText, useAutoScroll } from "./ui";

export function InterviewChat({ job, resume, onChange }: { job: Job; resume: Resume | null; onChange: (msgs: ChatMsg[]) => void }) {
  const ai = useAI();
  const history = job.interview ?? [];
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState("");
  const shown = live ? [...history, { role: "assistant" as const, content: live }] : history;
  const scrollRef = useAutoScroll<HTMLDivElement>(shown.length + live.length);

  async function send(content: string, base: ChatMsg[]) {
    if (!resume) return;
    const msgs: ChatMsg[] = [...base, { role: "user", content }];
    onChange(msgs);
    setDraft("");
    setLive("");
    const out = await ai.stream({ system: interviewSystem(job, resume), messages: msgs, maxTokens: 1200, onText: setLive });
    setLive("");
    if (out?.text) onChange([...msgs, { role: "assistant", content: out.text }]);
    else onChange(base.length ? base : []); // roll back an unanswered turn
  }

  // The kickoff message is an instruction, not something the person typed, so hide it.
  const visible = shown.filter((m, i) => !(i === 0 && m.role === "user" && m.content === INTERVIEW_KICKOFF));

  if (!resume) return <p className="small">This job has no resume attached. Pick one on the Fit analysis tab.</p>;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2>Interview practice</h2>
          <p className="small muted" style={{ marginTop: 4, maxWidth: "62ch" }}>
            Claude plays the hiring manager for this role, asks one question at a time from the posting and your resume, and scores each answer. Type <b>end</b> for an overall summary.
          </p>
        </div>
        {history.length > 0 && !ai.running && (
          <ConfirmButton confirmLabel="Start over" onConfirm={() => onChange([])} className="btn sm">
            Start over
          </ConfirmButton>
        )}
      </div>

      {!ai.hasKey && (
        <p className="small">
          Add your Anthropic API key in <Link to="/settings">Settings</Link> to practice.
        </p>
      )}

      {history.length === 0 && !ai.running ? (
        <div className="empty" style={{ padding: "28px 16px" }}>
          <p>Practice out loud first, then type your answer as you'd say it.</p>
          <button className="btn primary" disabled={!ai.hasKey} onClick={() => send(INTERVIEW_KICKOFF, [])}>
            Start interview
          </button>
        </div>
      ) : (
        <>
          <div className="chat" ref={scrollRef} aria-live="polite">
            {visible.map((m, i) =>
              m.role === "assistant" ? <RichText key={i} text={m.content} className="msg assistant" /> : <div key={i} className="msg user">{m.content}</div>,
            )}
            {ai.running && !live && <div className="msg assistant muted">Thinking…</div>}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim() && !ai.running) send(draft.trim(), history);
            }}
          >
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="answer" className="sr-only">
                Your answer
              </label>
              <textarea
                id="answer"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type your answer… (Ctrl+Enter to send)"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (draft.trim() && !ai.running) send(draft.trim(), history);
                  }
                }}
              />
            </div>
            {ai.running ? (
              <button type="button" className="btn" onClick={ai.stop}>
                Stop
              </button>
            ) : (
              <button type="submit" className="btn primary" disabled={!draft.trim()}>
                Send
              </button>
            )}
          </form>
          {ai.error && <p className="error" role="alert">{ai.error}</p>}
        </>
      )}
    </div>
  );
}
