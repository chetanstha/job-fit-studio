import { useRef, useState } from "react";
import { useStore } from "../lib/store";
import { friendlyError, testKey } from "../lib/claude";
import type { ModelId, Settings } from "../lib/types";
import { ConfirmButton, useToast } from "../components/ui";

const MODELS: { id: ModelId; name: string; note: string }[] = [
  { id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5", note: "Recommended. Strong writing and analysis at a moderate cost." },
  { id: "claude-opus-5-5", name: "Claude Opus 5.5", note: "Most capable. Best for nuanced feedback; slower and costs more." },
  { id: "claude-haiku-5-5", name: "Claude Haiku 5.5", note: "Fastest and cheapest. Good for quick checks." },
];

export default function SettingsPage() {
  const { data, updateSettings, exportData, importData, resetAll } = useStore();
  const toast = useToast();
  const [key, setKey] = useState(data.settings.apiKey);
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<{ state: "idle" | "running" | "ok" | "fail"; msg?: string }>({ state: "idle" });
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function saveKey() {
    updateSettings({ apiKey: key.trim() });
    toast(key.trim() ? "API key saved" : "API key removed");
    setTest({ state: "idle" });
  }

  async function runTest() {
    setTest({ state: "running" });
    try {
      await testKey(key.trim(), data.settings.model);
      updateSettings({ apiKey: key.trim() });
      setTest({ state: "ok", msg: `Connected. ${MODELS.find((m) => m.id === data.settings.model)?.name} answered.` });
    } catch (e) {
      setTest({ state: "fail", msg: friendlyError(e) });
    }
  }

  function download() {
    const blob = new Blob([exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `job-fit-studio-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function onImport(file?: File) {
    if (!file) return;
    try {
      importData(await file.text());
      setImportMsg(`Imported ${file.name}.`);
      toast("Data imported");
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Couldn't import that file.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p className="muted">Your API key, AI model, appearance and data.</p>
        </div>
      </div>

      <div className="stack">
        <section className="panel stack">
          <div>
            <h2>Anthropic API key</h2>
            <p className="small muted" style={{ marginTop: 4, maxWidth: "70ch" }}>
              AI features call Claude directly from your browser with your own key, so you pay Anthropic only for what you use. Create a key in the{" "}
              <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">
                Anthropic Console
              </a>
              . The key is stored only in this browser and never included in exports.
            </p>
          </div>
          <div className="row" style={{ alignItems: "stretch" }}>
            <label htmlFor="key" className="sr-only">
              API key
            </label>
            <input
              id="key"
              type={show ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              style={{ flex: "1 1 260px", fontFamily: "var(--mono)" }}
            />
            <button className="btn" onClick={() => setShow((s) => !s)}>
              {show ? "Hide" : "Show"}
            </button>
            <button className="btn primary" onClick={saveKey} disabled={key.trim() === data.settings.apiKey}>
              Save key
            </button>
            <button className="btn" onClick={runTest} disabled={!key.trim() || test.state === "running"}>
              {test.state === "running" ? "Testing…" : "Test connection"}
            </button>
          </div>
          {test.msg && <p className={test.state === "fail" ? "error" : "small"} style={test.state === "ok" ? { color: "var(--good)" } : undefined}>{test.msg}</p>}
          <p className="small muted">
            Use this only on your own device. Anyone with access to this browser profile could read a stored key. Set a monthly spend limit in the Console for peace of mind.
          </p>
        </section>

        <section className="panel stack">
          <h2>AI model</h2>
          <div className="stack" style={{ gap: 8 }} role="radiogroup" aria-label="AI model">
            {MODELS.map((m) => (
              <label key={m.id} className="row" style={{ alignItems: "flex-start", gap: 10, cursor: "pointer", flexWrap: "nowrap" }}>
                <input type="radio" name="model" checked={data.settings.model === m.id} onChange={() => updateSettings({ model: m.id })} style={{ marginTop: 4 }} />
                <span>
                  <b>{m.name}</b> <span className="small muted mono">{m.id}</span>
                  <span className="small muted" style={{ display: "block" }}>
                    {m.note}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <h2>Appearance</h2>
          <div className="row" role="group" aria-label="Theme">
            {(["system", "light", "dark"] as Settings["theme"][]).map((t) => (
              <button key={t} className={`btn sm ${data.settings.theme === t ? "primary" : ""}`} aria-pressed={data.settings.theme === t} onClick={() => updateSettings({ theme: t })}>
                {t === "system" ? "Match system" : t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </section>

        <section className="panel stack">
          <div>
            <h2>Your data</h2>
            <p className="small muted" style={{ marginTop: 4 }}>
              {data.resumes.length} resume{data.resumes.length === 1 ? "" : "s"} and {data.jobs.length} job{data.jobs.length === 1 ? "" : "s"}, saved in this browser. Export a backup to move them to another computer.
            </p>
          </div>
          <div className="row">
            <button className="btn" onClick={download}>
              Export backup (.json)
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Import backup
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => onImport(e.target.files?.[0])} />
            <ConfirmButton confirmLabel="Delete everything" onConfirm={() => { resetAll(); toast("All resumes and jobs deleted"); }}>
              Delete all data
            </ConfirmButton>
          </div>
          {importMsg && <p className="small">{importMsg}</p>}
        </section>
      </div>
    </>
  );
}
