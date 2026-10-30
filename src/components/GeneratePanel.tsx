import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAI } from "../lib/useAI";
import { CopyButton, Thinking, useToast } from "./ui";
import { wordCount } from "../lib/util";

/**
 * Streams a long piece of writing (cover letter, tailored resume, follow-up email),
 * shows it live as it arrives, then lets the person edit and keep it.
 */
export function GeneratePanel({
  title,
  intro,
  saved,
  onSave,
  build,
  controls,
  generateLabel = "Generate",
  maxTokens = 2048,
  disabledReason,
}: {
  title: string;
  intro: ReactNode;
  saved?: string;
  onSave: (text: string) => void;
  build: () => { system?: string; prompt: string };
  controls?: ReactNode;
  generateLabel?: string;
  maxTokens?: number;
  disabledReason?: string;
}) {
  const ai = useAI();
  const toast = useToast();
  const [text, setText] = useState(saved ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!ai.running && !dirty) setText(saved ?? "");
  }, [saved, ai.running, dirty]);

  async function generate() {
    const { system, prompt } = build();
    setText("");
    setDirty(false);
    const out = await ai.stream({ system, maxTokens, messages: [{ role: "user", content: prompt }], onText: setText });
    if (out?.text) onSave(out.text.trim());
  }

  const blocked = disabledReason || (!ai.hasKey ? "key" : "");

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h2>{title}</h2>
          <p className="small muted" style={{ marginTop: 4, maxWidth: "62ch" }}>
            {intro}
          </p>
        </div>
      </div>
      {controls}
      <div className="row">
        {ai.running ? (
          <button className="btn" onClick={ai.stop}>
            Stop
          </button>
        ) : (
          <button className="btn primary" onClick={generate} disabled={Boolean(blocked)}>
            {saved ? "Regenerate" : generateLabel}
          </button>
        )}
        {text && !ai.running && <CopyButton text={text} />}
        {dirty && !ai.running && (
          <button
            className="btn"
            onClick={() => {
              onSave(text);
              setDirty(false);
              toast("Changes saved");
            }}
          >
            Save edits
          </button>
        )}
        {text && <span className="small muted mono">{wordCount(text)} words</span>}
      </div>
      {blocked === "key" && (
        <p className="small">
          Add your Anthropic API key in <Link to="/settings">Settings</Link> to generate this.
        </p>
      )}
      {disabledReason && <p className="small muted">{disabledReason}</p>}
      {ai.error && <p className="error" role="alert">{ai.error}</p>}
      {ai.running && !text && <Thinking label="Writing…" />}
      {(text || saved) && (
        <textarea
          className="doc"
          aria-label={title}
          value={text}
          readOnly={ai.running}
          onChange={(e) => {
            setText(e.target.value);
            setDirty(true);
          }}
        />
      )}
      {ai.usage && !ai.running && (
        <p className="small muted mono">
          {ai.usage.inputTokens.toLocaleString()} input · {ai.usage.outputTokens.toLocaleString()} output tokens
        </p>
      )}
    </div>
  );
}
