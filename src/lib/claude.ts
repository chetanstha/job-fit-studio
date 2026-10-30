// Minimal Claude Messages API client for the browser: forced tool use for structured
// output, and server-sent-event streaming for long text. Calls go straight from the
// user's browser to Anthropic with the user's own API key.
import type { ChatMsg, ModelId, Usage } from "./types";

const API_URL = "https://api.anthropic.com/v1/messages";

export class ClaudeError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

function headers(apiKey: string) {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

async function toError(res: Response): Promise<ClaudeError> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message ?? "";
  } catch {
    /* ignore */
  }
  const byStatus: Record<number, string> = {
    400: "Claude rejected the request.",
    401: "Your API key wasn't accepted. Check it in Settings.",
    403: "This API key doesn't have permission for that model.",
    404: "That model isn't available to your API key. Pick another in Settings.",
    413: "The resume and job description are too long together. Trim one and try again.",
    429: "You've hit your API rate limit. Wait a minute and try again.",
    500: "Claude had an internal error. Try again.",
    529: "Claude is busy right now. Try again in a minute.",
  };
  const base = byStatus[res.status] ?? `Request failed (${res.status}).`;
  return new ClaudeError(detail && res.status !== 401 ? `${base} ${detail}` : base, res.status);
}

export interface CallOptions {
  apiKey: string;
  model: ModelId;
  system?: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

function requireKey(apiKey: string) {
  if (!apiKey) throw new ClaudeError("Add your Anthropic API key in Settings to use AI features.");
}

/** Ask Claude to fill a JSON schema by forcing a single tool call. */
export async function callTool<T>(
  opts: CallOptions & {
    prompt: string;
    tool: { name: string; description: string; input_schema: Record<string, unknown> };
  },
): Promise<{ result: T; usage: Usage }> {
  requireKey(opts.apiKey);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(opts.apiKey),
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      tools: [opts.tool],
      tool_choice: { type: "tool", name: opts.tool.name },
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) throw await toError(res);
  const body = await res.json();
  const block = (body.content ?? []).find((b: { type: string }) => b.type === "tool_use");
  if (!block) throw new ClaudeError("Claude didn't return a structured answer. Try again.");
  if (body.stop_reason === "max_tokens") throw new ClaudeError("The answer was cut off. Try a shorter job description.");
  return {
    result: block.input as T,
    usage: { inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 },
  };
}

/** Stream a text reply. `onText` receives the whole text so far on every update. */
export async function streamText(
  opts: CallOptions & { messages: ChatMsg[]; onText: (text: string) => void },
): Promise<{ text: string; usage: Usage }> {
  requireKey(opts.apiKey);
  const res = await fetch(API_URL, {
    method: "POST",
    headers: headers(opts.apiKey),
    signal: opts.signal,
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens ?? 2048,
      system: opts.system,
      stream: true,
      messages: opts.messages,
    }),
  });
  if (!res.ok || !res.body) throw await toError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  const usage: Usage = { inputTokens: 0, outputTokens: 0 };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const dataLine = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let evt: Record<string, any>;
      try {
        evt = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (evt.type === "message_start") usage.inputTokens = evt.message?.usage?.input_tokens ?? 0;
      else if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
        text += evt.delta.text;
        opts.onText(text);
      } else if (evt.type === "message_delta") usage.outputTokens = evt.usage?.output_tokens ?? usage.outputTokens;
      else if (evt.type === "error") throw new ClaudeError(evt.error?.message ?? "The stream failed. Try again.");
    }
  }
  return { text, usage };
}

/** Cheap call used by Settings to confirm a key works. */
export async function testKey(apiKey: string, model: ModelId) {
  const { text } = await streamText({
    apiKey,
    model,
    maxTokens: 10,
    messages: [{ role: "user", content: "Reply with the single word: ready" }],
    onText: () => {},
  });
  return text.trim();
}

export function friendlyError(e: unknown): string {
  if (e instanceof DOMException && e.name === "AbortError") return "Stopped.";
  if (e instanceof ClaudeError) return e.message;
  if (e instanceof TypeError) return "Couldn't reach Claude. Check your internet connection.";
  return e instanceof Error ? e.message : "Something went wrong.";
}
