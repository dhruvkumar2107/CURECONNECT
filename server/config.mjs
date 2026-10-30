// Central configuration for the CureConnect AI Vision service.
// All secrets come from environment variables — never from the frontend build.

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export function loadConfig(env = process.env) {
  const isProduction = env.NODE_ENV === 'production';
  return {
    isProduction,
    port: int(env.PORT, 8787),
    // How many reverse-proxy hops to trust for the client IP (Render = 1).
    trustProxyHops: int(env.TRUST_PROXY_HOPS, 1),

    geminiApiKey: (env.GEMINI_API_KEY || '').trim(),
    geminiModel: (env.GEMINI_MODEL || 'gemini-3.8-flash').trim(),
    // Thinking level for chat and symptom summaries (LOW = fast first token; HIGH = model default).
    // Report analysis always uses the model default for accuracy. Set to "" to disable the override.
    thinkingLevel: (env.AI_LAB_THINKING_LEVEL ?? 'LOW').trim().toUpperCase(),

    // Access gate. Both must be set for anyone to get in.
    accessCode: env.AI_LAB_ACCESS_CODE || '',
    sessionSecret: env.AI_LAB_SESSION_SECRET || '',
    sessionTtlMs: int(env.AI_LAB_SESSION_HOURS, 8) * 60 * 60 * 1000,
    // Extra origins allowed to call the API (e.g. the static site that proxies to us).
    allowedOrigins: (env.AI_LAB_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean),

    // Usage limits (in-memory, reset on restart).
    chatPerHour: int(env.AI_LAB_CHAT_PER_HOUR, 60),
    reportsPerHour: int(env.AI_LAB_REPORTS_PER_HOUR, 10),
    summariesPerHour: int(env.AI_LAB_SUMMARIES_PER_HOUR, 20),
    dailyGlobalLimit: int(env.AI_LAB_DAILY_LIMIT, 500),

    maxUploadBytes: int(env.AI_LAB_MAX_UPLOAD_MB, 10) * 1024 * 1024,
    chatTimeoutMs: int(env.AI_LAB_CHAT_TIMEOUT_S, 60) * 1000,
    reportTimeoutMs: int(env.AI_LAB_REPORT_TIMEOUT_S, 120) * 1000,
  };
}

export function gateConfigured(config) {
  return config.accessCode.length >= 8 && config.sessionSecret.length >= 32;
}
