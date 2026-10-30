import { useCallback, useEffect, useRef, useState } from "react";
import { callTool, friendlyError, streamText } from "./claude";
import { useStore } from "./store";
import type { ChatMsg, Usage } from "./types";

/** Shared state for one AI request: running flag, error text, abort and usage. */
export function useAI() {
  const { data } = useStore();
  const { apiKey, model } = data.settings;
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<Usage | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(() => () => ctrl.current?.abort(), []);

  const stop = useCallback(() => ctrl.current?.abort(), []);

  const run = useCallback(
    async <T,>(fn: (signal: AbortSignal) => Promise<{ usage: Usage } & T>): Promise<({ usage: Usage } & T) | null> => {
      ctrl.current?.abort();
      const c = new AbortController();
      ctrl.current = c;
      setRunning(true);
      setError("");
      try {
        const out = await fn(c.signal);
        setUsage(out.usage);
        return out;
      } catch (e) {
        if (!(e instanceof DOMException && e.name === "AbortError")) setError(friendlyError(e));
        return null;
      } finally {
        if (ctrl.current === c) setRunning(false);
      }
    },
    [],
  );

  const tool = useCallback(
    <T,>(args: { system?: string; prompt: string; tool: Parameters<typeof callTool>[0]["tool"]; maxTokens?: number }) =>
      run<{ result: T }>((signal) => callTool<T>({ apiKey, model, signal, ...args })),
    [apiKey, model, run],
  );

  const stream = useCallback(
    (args: { system?: string; messages: ChatMsg[]; onText: (t: string) => void; maxTokens?: number }) =>
      run<{ text: string }>((signal) => streamText({ apiKey, model, signal, ...args })),
    [apiKey, model, run],
  );

  return { running, error, setError, usage, stop, tool, stream, hasKey: Boolean(apiKey), model };
}
