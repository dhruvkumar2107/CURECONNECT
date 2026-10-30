// Gemini communication. The only AI provider used by this service.
// Uses the stateless generateContent API: full history is sent each turn and nothing is
// stored provider-side by us (files are sent inline, never via the Files API).

import { GoogleGenAI, ApiError } from '@google/genai';

export class AiError extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

/** Maps SDK / network errors to safe, user-facing errors. Never includes provider bodies. */
export function toAiError(err, signal) {
  if (err instanceof AiError) return err;
  if (signal?.aborted || err?.name === 'AbortError' || err?.name === 'TimeoutError') {
    const reason = signal?.reason;
    if (reason?.name === 'TimeoutError' || err?.name === 'TimeoutError') {
      return new AiError('timeout', 'The AI service took too long to respond. Please try again.', 504);
    }
    return new AiError('cancelled', 'The request was cancelled.', 499);
  }
  if (err instanceof ApiError || typeof err?.status === 'number') {
    const s = err.status;
    if (s === 400 && /api key/i.test(err.message || '')) {
      return new AiError('invalid_api_key', 'The Gemini API key is invalid. The site owner needs to update it.', 503);
    }
    if (s === 401 || s === 403) {
      return new AiError('invalid_api_key', 'The Gemini API key was rejected. The site owner needs to check it.', 503);
    }
    if (s === 404) return new AiError('model_unavailable', 'The configured Gemini model is not available.', 503);
    if (s === 429) return new AiError('quota_exceeded', 'The AI usage quota has been reached. Please try again later.', 429);
    if (s === 400) return new AiError('provider_rejected', 'The AI service could not process this request.', 400);
    if (s >= 500) return new AiError('provider_unavailable', 'The AI service is temporarily unavailable. Please try again shortly.', 503);
  }
  return new AiError('network_error', 'Could not reach the AI service. Please try again.', 503);
}

function blockedError(response) {
  const block = response?.promptFeedback?.blockReason;
  const finish = response?.candidates?.[0]?.finishReason;
  if (block || ['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII'].includes(finish)) {
    return new AiError('blocked', 'The AI service declined to answer this request. Please rephrase it.', 422);
  }
  return null;
}

export function createGeminiService({ apiKey, model, thinkingLevel }) {
  // Gemini 3 models think before answering by default, which delays the first token by many
  // seconds. A lower level keeps chat responsive. Empty = model default.
  const thinkingConfig = thinkingLevel ? { thinkingLevel } : undefined;
  const client = apiKey ? new GoogleGenAI({ apiKey }) : null;
  let statusCache = { at: 0, value: null };

  const requireClient = () => {
    if (!client) {
      throw new AiError('not_configured', 'The AI service is not configured yet (missing GEMINI_API_KEY).', 503);
    }
    return client;
  };

  return {
    model,
    configured: Boolean(client),

    /** Streams text chunks. Yields strings; returns { finishReason }. */
    async *streamText({ systemInstruction, contents, maxOutputTokens = 4096, signal }) {
      const ai = requireClient();
      let finishReason;
      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents,
          config: { systemInstruction, maxOutputTokens, temperature: 0.4, thinkingConfig, abortSignal: signal },
        });
        for await (const chunk of stream) {
          const blocked = blockedError(chunk);
          if (blocked) throw blocked;
          finishReason = chunk.candidates?.[0]?.finishReason ?? finishReason;
          const text = chunk.text;
          if (text) yield text;
        }
      } catch (err) {
        throw toAiError(err, signal);
      }
      return { finishReason };
    },

    /** Generates JSON constrained by a schema and returns the parsed object. */
    async generateJson({ systemInstruction, contents, schema, maxOutputTokens = 8192, fast = false, mediaResolution, signal }) {
      const ai = requireClient();
      let response;
      try {
        response = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            maxOutputTokens,
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseJsonSchema: schema,
            ...(fast && thinkingConfig ? { thinkingConfig } : {}),
            ...(mediaResolution ? { mediaResolution } : {}),
            abortSignal: signal,
          },
        });
      } catch (err) {
        throw toAiError(err, signal);
      }
      const blocked = blockedError(response);
      if (blocked) throw blocked;
      if (response.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        throw new AiError('output_truncated', 'The analysis was too long to complete. Try a shorter document or fewer pages.', 502);
      }
      try {
        return JSON.parse(response.text ?? '');
      } catch {
        throw new AiError('invalid_provider_response', 'The AI service returned an unreadable response. Please try again.', 502);
      }
    },

    /** Lightweight credential/model check (models.get — no tokens consumed). Cached 5 min. */
    async status() {
      if (!client) return { state: 'not_configured', model };
      if (statusCache.value && Date.now() - statusCache.at < 5 * 60 * 1000) return statusCache.value;
      let value;
      try {
        await client.models.get({ model, config: { abortSignal: AbortSignal.timeout(8000) } });
        value = { state: 'online', model };
      } catch (err) {
        const e = toAiError(err);
        value = { state: e.code === 'network_error' || e.code === 'timeout' ? 'unreachable' : e.code, model };
      }
      statusCache = { at: Date.now(), value };
      return value;
    },
  };
}
