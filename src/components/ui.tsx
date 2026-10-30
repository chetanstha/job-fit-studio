import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { band } from "../lib/util";
import type { ScoreBreakdown } from "../lib/types";

/* ---------- Toasts ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  const push = useCallback((msg: string) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 2400);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-wrap" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="toast">
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Copy ---------- */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const toast = useToast();
  return (
    <button
      type="button"
      className="btn sm"
      disabled={!text}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast("Couldn't copy automatically. Select the text and copy it.");
        }
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}

/* ---------- Two-step confirm (no browser dialogs) ---------- */
export function ConfirmButton({
  children,
  confirmLabel = "Delete",
  onConfirm,
  className = "btn sm danger",
}: {
  children: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking)
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {children}
      </button>
    );
  return (
    <span className="row">
      <button type="button" className="btn sm danger solid" onClick={() => { setAsking(false); onConfirm(); }}>
        {confirmLabel}
      </button>
      <button type="button" className="btn sm" onClick={() => setAsking(false)}>
        Cancel
      </button>
    </span>
  );
}

/* ---------- Score ring ---------- */
export function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const stroke = size > 80 ? 10 : 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const { tone } = band(score);
  const color = tone === "good" ? "var(--good)" : tone === "mid" ? "var(--warn)" : "var(--bad)";
  return (
    <div className="ring" style={{ width: size, height: size }} aria-label={`Fit score ${score} out of 100`} role="img">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--sunk)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="num" style={{ fontSize: size * 0.3 }}>
        <div>
          {score}
          {size > 80 && <small>/ 100</small>}
        </div>
      </div>
    </div>
  );
}

export function ScorePill({ score }: { score?: number }) {
  if (score == null) return <span className="pill neutral">Not analyzed</span>;
  const { tone } = band(score);
  return <span className={`pill ${tone} mono`}>{score}</span>;
}

export function ScoreBars({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <div className="bars">
      {Object.entries(breakdown).map(([k, v]) => {
        const { tone } = band(v);
        return (
          <div className="bar-row" key={k}>
            <span style={{ textTransform: "capitalize" }}>{k}</span>
            <div className="bar-track">
              <div className={`bar-fill fill-${tone}`} style={{ width: `${v}%` }} />
            </div>
            <span className="mono" style={{ textAlign: "right" }}>
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Thinking({ label }: { label: string }) {
  return (
    <div className="row muted" style={{ padding: "24px 0" }}>
      <span className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      {label}
    </div>
  );
}

/** Scroll an element to its bottom whenever `dep` changes. */
export function useAutoScroll<T extends HTMLElement>(dep: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [dep]);
  return ref;
}

/** Render the small subset of markdown Claude uses here (**bold**, # headings) safely, without HTML injection. */
export function RichText({ text, className = "doc" }: { text: string; className?: string }) {
  const lines = text.split("\n");
  return (
    <div className={className}>
      {lines.map((line, i) => {
        const heading = /^#{1,4}\s+(.*)$/.exec(line);
        const content = heading ? heading[1] : line;
        const parts = content.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
          p.startsWith("**") && p.endsWith("**") && p.length > 4 ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>,
        );
        return (
          <span key={i}>
            {heading ? <strong>{parts}</strong> : parts}
            {i < lines.length - 1 ? "\n" : null}
          </span>
        );
      })}
    </div>
  );
}
