// Client for the AI Lab backend. The browser never talks to Gemini directly and never
// holds the API key; every request goes through the authenticated /api/ai-lab routes.

import type { ApiErrorBody, EmergencyGuidance, Language, Mode, ReportAnalysis, Role, ServiceStatus, SymptomSummary } from './types';

const BASE = '/api/ai-lab';
const HEADERS = { 'x-ai-lab': '1' };

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

function sessionExpired(status: number) {
  // The server-side gate takes over: reloading shows the access-code page.
  if (status === 401) window.setTimeout(() => window.location.reload(), 1800);
}

async function parseError(res: Response): Promise<ApiError> {
  sessionExpired(res.status);
  try {
    const body = (await res.json()) as { error?: ApiErrorBody };
    if (body?.error) return new ApiError(body.error.code, body.error.message, res.status);
  } catch {
    /* non-JSON response (e.g. proxy error page) */
  }
  if (res.status === 413) return new ApiError('file_too_large', 'That file is too large.', 413);
  return new ApiError('http_error', `The server responded with an error (${res.status}). Please try again.`, res.status);
}

const networkError = (err: unknown) => {
  if (err instanceof DOMException && err.name === 'AbortError') return new ApiError('cancelled', 'Cancelled.');
  if (err instanceof ApiError) return err;
  return new ApiError('offline', 'Could not reach CureConnect. Check your connection and try again.');
};

export async function getStatus(): Promise<ServiceStatus> {
  try {
    const res = await fetch(`${BASE}/status`, { headers: HEADERS, credentials: 'same-origin' });
    if (!res.ok) throw await parseError(res);
    const body = (await res.json()) as { ai: ServiceStatus };
    return body.ai;
  } catch (err) {
    throw networkError(err);
  }
}

export async function logout() {
  await fetch(`${BASE}/logout`, { method: 'POST', headers: HEADERS, credentials: 'same-origin' }).catch(() => undefined);
}

export interface ChatHandlers {
  onMeta?: (meta: { emergency: EmergencyGuidance | null }) => void;
  onDelta: (text: string) => void;
}

/** Streams a chat answer. Resolves with follow-up suggestions; rejects with ApiError. */
export async function streamChat(
  payload: { messages: { role: Role; text: string }[]; mode: Mode; language: Language; reportContext?: string },
  handlers: ChatHandlers,
  signal: AbortSignal,
): Promise<{ followUps: string[] }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { ...HEADERS, 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    throw networkError(err);
  }
  if (!res.ok || !res.body) throw await parseError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let done: { followUps: string[] } | null = null;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.type === 'meta') handlers.onMeta?.(event);
    else if (event.type === 'delta') handlers.onDelta(event.text);
    else if (event.type === 'done') done = { followUps: event.followUps ?? [] };
    else if (event.type === 'error') throw new ApiError(event.error.code, event.error.message);
  };

  try {
    for (;;) {
      const { value, done: finished } = await reader.read();
      if (finished) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf('\n')) >= 0) {
        handleLine(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
    }
    handleLine(buffer);
  } catch (err) {
    throw networkError(err);
  }
  if (!done) throw new ApiError('incomplete', 'The answer was interrupted. You can retry.');
  return done;
}

export async function analyzeReport(
  file: File,
  language: Language,
  signal: AbortSignal,
): Promise<{ analysis: ReportAnalysis; standardLimitations: string[] }> {
  try {
    const res = await fetch(`${BASE}/analyze-report?language=${language}`, {
      method: 'POST',
      headers: { ...HEADERS, 'content-type': file.type || 'application/octet-stream' },
      credentials: 'same-origin',
      body: file,
      signal,
    });
    if (!res.ok) throw await parseError(res);
    return await res.json();
  } catch (err) {
    throw networkError(err);
  }
}

export async function createSymptomSummary(
  messages: { role: Role; text: string }[],
  language: Language,
  signal: AbortSignal,
): Promise<{ summary: SymptomSummary; emergency: EmergencyGuidance | null; generatedAt: string }> {
  try {
    const res = await fetch(`${BASE}/symptom-summary`, {
      method: 'POST',
      headers: { ...HEADERS, 'content-type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ messages, language }),
      signal,
    });
    if (!res.ok) throw await parseError(res);
    return await res.json();
  } catch (err) {
    throw networkError(err);
  }
}
