import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertOctagon,
  ArrowUp,
  Check,
  ClipboardCopy,
  FileScan,
  Languages,
  LogOut,
  Mic,
  MicOff,
  Paperclip,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Stethoscope,
  Trash2,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import { ApiError, analyzeReport, createSymptomSummary, getStatus, logout, streamChat } from './api';
import { Markdown, stripMarkdown } from './Markdown';
import { ReportCard, compactReportContext } from './ReportCard';
import { SummaryPanel } from './SummaryPanel';
import type { EmergencyGuidance, Language, Mode, ReportItem, ServiceStatus, SymptomSummary, TextItem, ThreadItem } from './types';
import { useSpeechInput, useSpeechOutput } from './useVoice';

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
const ACCEPTED_EXT = /\.(pdf|png|jpe?g|webp)$/i;
const MAX_INPUT = 6000;

const uid = () => Math.random().toString(36).slice(2, 10);

const STATUS_LABEL: Record<string, string> = {
  online: 'Gemini online',
  not_configured: 'AI not configured',
  invalid_api_key: 'API key invalid',
  model_unavailable: 'Model unavailable',
  quota_exceeded: 'Quota reached',
  unreachable: 'AI unreachable',
};

const QUICK_PROMPTS: { label: string; action: 'upload' | 'send'; mode?: Mode }[] = [
  { label: 'Help me understand this medical report.', action: 'upload' },
  { label: "Read my doctor's handwritten prescription.", action: 'upload' },
  { label: 'What information should I prepare before visiting a doctor?', action: 'send' },
  { label: 'Explain a medical term in simple language.', action: 'send' },
  { label: 'Help me organize the symptoms I have been experiencing.', action: 'send', mode: 'symptom' },
];

export function AiLabApp() {
  const [items, setItems] = useState<ThreadItem[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('general');
  const [language, setLanguage] = useState<Language>('auto');
  const [busy, setBusy] = useState<null | 'chat' | 'report' | 'summary'>(null);
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [reportContext, setReportContext] = useState<{ id: string; fileName: string; text: string } | null>(null);
  const [summary, setSummary] = useState<{ summary: SymptomSummary; generatedAt: string; emergency: EmergencyGuidance | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [consented, setConsented] = useState(() => sessionStorage.getItem('ailab.consent') === '1');
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem('ailab.voice') !== 'off');

  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const voiceBaseRef = useRef('');

  const speechOut = useSpeechOutput();
  const speechIn = useSpeechInput((text, isFinal) => {
    const base = voiceBaseRef.current;
    setInput(`${base}${base && !base.endsWith(' ') ? ' ' : ''}${text}`.slice(0, MAX_INPUT));
    if (isFinal) inputRef.current?.focus();
  });

  // ── Service status ──────────────────────────────────────────────────────
  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await getStatus());
      setStatusError(null);
    } catch (err) {
      setStatusError(err instanceof ApiError ? err.message : 'Status unavailable');
    }
  }, []);
  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [items, summary]);

  useEffect(() => {
    localStorage.setItem('ailab.voice', voiceEnabled ? 'on' : 'off');
    if (!voiceEnabled) {
      speechOut.stop();
      speechIn.stop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceEnabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateItem = useCallback(<T extends ThreadItem>(id: string, patch: Partial<T>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? ({ ...it, ...patch } as ThreadItem) : it)));
  }, []);

  const textHistory = (list: ThreadItem[]) =>
    list
      .filter((i): i is TextItem => i.kind === 'text')
      .filter((i) => i.role === 'user' || ((i.status === 'done' || i.status === 'stopped') && i.text.trim()))
      .map((i) => ({ role: i.role, text: i.text }));

  // ── Chat ────────────────────────────────────────────────────────────────
  const runChat = async (thread: ThreadItem[], chatMode: Mode) => {
    const history = textHistory(thread);
    const modelId = uid();
    const modelItem: TextItem = { kind: 'text', id: modelId, role: 'model', text: '', status: 'streaming' };
    setItems([...thread, modelItem]);
    setBusy('chat');
    speechOut.stop();
    const controller = new AbortController();
    abortRef.current = controller;
    let text = '';
    try {
      const { followUps } = await streamChat(
        { messages: history, mode: chatMode, language, reportContext: reportContext?.text },
        {
          onMeta: (meta) => updateItem<TextItem>(modelId, { emergency: meta.emergency }),
          onDelta: (d) => {
            text += d;
            updateItem<TextItem>(modelId, { text });
          },
        },
        controller.signal,
      );
      updateItem<TextItem>(modelId, { text, status: 'done', followUps });
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('unknown', 'Something went wrong.');
      if (e.code === 'cancelled') updateItem<TextItem>(modelId, { status: 'stopped' });
      else {
        updateItem<TextItem>(modelId, { status: 'error', error: { code: e.code, message: e.message } });
        if (['not_configured', 'invalid_api_key', 'quota_exceeded', 'model_unavailable'].includes(e.code)) void refreshStatus();
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(null);
    }
  };

  const send = (raw?: string, forceMode?: Mode) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    if (text.length > MAX_INPUT) {
      setNotice(`Messages must be under ${MAX_INPUT} characters.`);
      return;
    }
    speechIn.stop();
    const chatMode = forceMode ?? mode;
    if (forceMode) setMode(forceMode);
    const userItem: TextItem = { kind: 'text', id: uid(), role: 'user', text, status: 'done' };
    setInput('');
    setNotice(null);
    void runChat([...items, userItem], chatMode);
  };

  const stop = () => abortRef.current?.abort();

  const retry = () => {
    if (busy) return;
    const lastModel = [...items].reverse().find((i) => i.kind === 'text' && i.role === 'model');
    if (!lastModel) return;
    const idx = items.indexOf(lastModel);
    const thread = items.slice(0, idx);
    if (!thread.some((i) => i.kind === 'text' && i.role === 'user')) return;
    void runChat(thread, mode);
  };

  const clearAll = () => {
    abortRef.current?.abort();
    speechOut.stop();
    speechIn.stop();
    setItems([]);
    setReportContext(null);
    setSummary(null);
    setInput('');
    setNotice(null);
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(stripMarkdown(text));
      setCopiedId(id);
      window.setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1600);
    } catch {
      setNotice('Copy is not available in this browser.');
    }
  };

  // ── Report upload ───────────────────────────────────────────────────────
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (busy) {
      setNotice('Please wait for the current request to finish.');
      return;
    }
    if (!(ACCEPTED.includes(file.type) || (!file.type && ACCEPTED_EXT.test(file.name)))) {
      setNotice('Only PDF, JPG, PNG and WebP files are supported.');
      return;
    }
    if (file.size === 0) {
      setNotice('That file is empty.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setNotice('Files must be 10 MB or smaller.');
      return;
    }
    setNotice(null);
    const id = uid();
    const item: ReportItem = { kind: 'report', id, fileName: file.name.slice(0, 120), fileSize: file.size, status: 'analysing' };
    setItems((prev) => [...prev, item]);
    setBusy('report');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await analyzeReport(file, language, controller.signal);
      updateItem<ReportItem>(id, { status: 'done', analysis: res.analysis, standardLimitations: res.standardLimitations });
      if (res.analysis.isMedicalDocument) {
        setReportContext({ id, fileName: item.fileName, text: compactReportContext(item.fileName, res.analysis) });
      }
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('unknown', 'Analysis failed.');
      updateItem<ReportItem>(id, e.code === 'cancelled' ? { status: 'cancelled' } : { status: 'error', error: { code: e.code, message: e.message } });
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const openFilePicker = () => {
    if (busy) return;
    fileRef.current?.click();
  };

  // ── Symptom summary ─────────────────────────────────────────────────────
  const canSummarise = items.some((i) => i.kind === 'text' && i.role === 'user');
  const makeSummary = async () => {
    if (busy || !canSummarise) return;
    setBusy('summary');
    setNotice(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await createSymptomSummary(textHistory(items), language, controller.signal);
      setSummary(res);
    } catch (err) {
      const e = err instanceof ApiError ? err : new ApiError('unknown', 'Could not create the summary.');
      if (e.code !== 'cancelled') setNotice(e.message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(null);
    }
  };

  // ── Voice ───────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!voiceEnabled) {
      setNotice('Voice is turned off. Use the speaker toggle in the top bar to enable it.');
      return;
    }
    if (speechIn.listening) {
      speechIn.stop();
      return;
    }
    speechOut.stop();
    voiceBaseRef.current = input;
    speechIn.start(language);
  };

  const startVoiceFeature = () => {
    setVoiceEnabled(true);
    if (!speechIn.supported) {
      setNotice('Voice input is not supported in this browser. Try Chrome or Edge — or type, and use "Listen" to hear answers.');
      inputRef.current?.focus();
      return;
    }
    voiceBaseRef.current = input;
    speechIn.start(language);
  };

  const lastModelId = useMemo(() => [...items].reverse().find((i) => i.kind === 'text' && i.role === 'model')?.id, [items]);
  const empty = items.length === 0;
  const aiReady = !status || status.state === 'online';

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFile(e.dataTransfer.files?.[0]);
  };

  const signOut = async () => {
    clearAll();
    await logout();
    window.location.reload();
  };

  return (
    <div
      className={`shell ${dragging ? 'dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false);
      }}
      onDrop={onDrop}
    >
      <div className="ambient" aria-hidden="true" />

      {!consented && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div className="modal">
            <div className="report-icon"><ShieldCheck size={22} /></div>
            <h2 id="consent-title">Before you start</h2>
            <ul>
              <li><b>Educational information only.</b> CureConnect AI Vision does not diagnose, prescribe, or replace a qualified clinician.</li>
              <li><b>Your data goes to Google.</b> Messages and any files you upload are sent to Google's Gemini API to generate answers.</li>
              <li><b>Nothing is saved by CureConnect.</b> Conversations stay in this browser tab and disappear when you close or clear it. Files are processed in memory and not stored.</li>
              <li><b>Emergencies:</b> call <b>112</b> (or 108 for an ambulance). Do not wait for an online answer.</li>
            </ul>
            <button
              className="btn btn-primary"
              autoFocus
              onClick={() => {
                sessionStorage.setItem('ailab.consent', '1');
                setConsented(true);
              }}
            >
              I understand — continue
            </button>
          </div>
        </div>
      )}

      <header className="topbar">
        <div className="brand">
          <div className="logo" aria-hidden="true"><Activity size={18} /></div>
          <div>
            <b>CureConnect <span className="accent">AI Vision</span></b>
            <span className="eyebrow">Health information copilot</span>
          </div>
        </div>
        <div className="topbar-actions">
          <button
            className={`status-pill status-${status?.state ?? (statusError ? 'unreachable' : 'loading')}`}
            onClick={() => void refreshStatus()}
            title={status ? `Model: ${status.model}. Click to re-check.` : statusError ?? 'Checking…'}
          >
            <span className="dot" />
            {status ? STATUS_LABEL[status.state] ?? status.state : statusError ? 'Status unavailable' : 'Checking…'}
          </button>
          <label className="select-wrap" title="Response language">
            <Languages size={15} aria-hidden="true" />
            <span className="sr-only">Response language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              <option value="auto">Auto</option>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
            </select>
          </label>
          <button
            className={`icon-btn ${voiceEnabled ? 'on' : ''}`}
            onClick={() => setVoiceEnabled((v) => !v)}
            aria-pressed={voiceEnabled}
            aria-label={voiceEnabled ? 'Turn voice features off' : 'Turn voice features on'}
            title={voiceEnabled ? 'Voice on' : 'Voice off'}
          >
            {voiceEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
          <button className="icon-btn" onClick={() => void signOut()} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </header>

      <main className="main" id="main">
        {status && status.state !== 'online' && (
          <div className="banner banner-warn" role="status">
            <AlertOctagon size={16} />
            <span>
              {status.state === 'not_configured'
                ? 'The AI service is not configured yet. The site owner needs to set GEMINI_API_KEY on the server.'
                : status.state === 'invalid_api_key'
                  ? 'The Gemini API key was rejected. The site owner needs to update it.'
                  : status.state === 'quota_exceeded'
                    ? 'The Gemini usage quota has been reached. Please try again later.'
                    : `The AI service is currently unavailable (${STATUS_LABEL[status.state] ?? status.state}).`}
            </span>
          </div>
        )}

        {empty && (
          <section className="hero">
            <span className="hero-badge"><Sparkles size={13} /> Powered by Google Gemini</span>
            <h1>
              Understand Your Health.<br />
              <span className="gradient">Ask Better Questions.</span>
            </h1>
            <p className="lede">
              Your AI health companion for understanding medical information, preparing for doctor consultations, and making sense of your health questions.
            </p>
            <p className="disclaimer">
              <ShieldCheck size={15} /> Educational information only — not a diagnosis and not a substitute for professional medical advice. In an emergency, call <b>112</b>.
            </p>

            <div className="features">
              <button className="feature" onClick={openFilePicker} disabled={!!busy}>
                <div className="feature-icon"><FileScan size={22} /></div>
                <b>Medical Report Intelligence</b>
                <span>Upload a lab report or a doctor's prescription, even a handwritten one (PDF or photo). Get values and medicines as written, plain-language explanations and questions for your doctor.</span>
                <em>Upload a report or prescription →</em>
              </button>
              <button
                className="feature"
                onClick={() => {
                  setMode('symptom');
                  inputRef.current?.focus();
                }}
              >
                <div className="feature-icon"><Stethoscope size={22} /></div>
                <b>Interactive Symptom Copilot</b>
                <span>Describe what you're feeling. The copilot asks useful follow-ups and builds a summary to take to your appointment.</span>
                <em>Start symptom check →</em>
              </button>
              <button className="feature" onClick={startVoiceFeature}>
                <div className="feature-icon"><Waves size={22} /></div>
                <b>Voice Health Assistant</b>
                <span>Speak your question in English or Hindi, review the text, then send. Answers can be read aloud.</span>
                <em>{speechIn.supported ? 'Start speaking →' : 'Read-aloud available →'}</em>
              </button>
            </div>

            <div className="quick">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  className="suggestion"
                  disabled={!!busy}
                  onClick={() => (q.action === 'upload' ? openFilePicker() : send(q.label, q.mode))}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </section>
        )}

        {!empty && (
          <div className="thread" aria-live="polite">
            {items.map((item) => {
              if (item.kind === 'report') {
                return (
                  <ReportCard
                    key={item.id}
                    item={item}
                    onCancel={stop}
                    onAsk={(q) => send(q)}
                    inContext={reportContext?.id === item.id}
                    onDismissContext={() => setReportContext(null)}
                  />
                );
              }
              if (item.role === 'user') {
                return (
                  <div key={item.id} className="msg msg-user">
                    <div className="bubble">{item.text}</div>
                  </div>
                );
              }
              const isLast = item.id === lastModelId;
              return (
                <div key={item.id} className="msg msg-model">
                  <div className="avatar" aria-hidden="true"><Activity size={15} /></div>
                  <div className="bubble">
                    {item.emergency && (
                      <div className="emergency" role="alert">
                        <AlertOctagon size={18} />
                        <div>
                          <b>{item.emergency.title}</b>
                          <p>{item.emergency.message}</p>
                          {item.emergency.selfHarmMessage && <p>{item.emergency.selfHarmMessage}</p>}
                          <a className="btn btn-danger btn-sm" href="tel:112">Call 112</a>
                        </div>
                      </div>
                    )}
                    {item.text ? (
                      <Markdown text={item.text} />
                    ) : item.status === 'streaming' ? (
                      <div className="typing" aria-label="Assistant is typing"><span /><span /><span /></div>
                    ) : null}
                    {item.status === 'streaming' && item.text && <span className="caret" aria-hidden="true" />}
                    {item.status === 'stopped' && <p className="muted small">Response stopped.</p>}
                    {item.status === 'error' && (
                      <p className="error-text" role="alert">{item.error?.message ?? 'Something went wrong.'}</p>
                    )}
                    {item.status !== 'streaming' && (
                      <div className="msg-actions">
                        {item.text && (
                          <button className="mini" onClick={() => void copyText(item.id, item.text)}>
                            {copiedId === item.id ? <Check size={13} /> : <ClipboardCopy size={13} />} {copiedId === item.id ? 'Copied' : 'Copy'}
                          </button>
                        )}
                        {item.text && voiceEnabled && speechOut.supported && (
                          speechOut.speakingId === item.id ? (
                            <button className="mini active" onClick={speechOut.stop}><Square size={12} /> Stop</button>
                          ) : (
                            <button className="mini" onClick={() => speechOut.speak(item.id, stripMarkdown(item.text), language)}>
                              <Volume2 size={13} /> Listen
                            </button>
                          )
                        )}
                        {isLast && (
                          <button className="mini" onClick={retry} disabled={!!busy}><RotateCcw size={13} /> Retry</button>
                        )}
                      </div>
                    )}
                    {isLast && item.status === 'done' && item.followUps && item.followUps.length > 0 && (
                      <div className="chips-row">
                        {item.followUps.map((f) => (
                          <button key={f} className="suggestion" disabled={!!busy} onClick={() => send(f)}>{f}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {busy === 'summary' && (
              <div className="summary-card loading" role="status"><span className="spinner" /> Creating your doctor summary…</div>
            )}
            {summary && (
              <SummaryPanel summary={summary.summary} generatedAt={summary.generatedAt} emergency={summary.emergency} onClose={() => setSummary(null)} />
            )}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <footer className="composer-wrap">
        <div className="composer-meta">
          <div className="modes" role="radiogroup" aria-label="Assistant mode">
            <button role="radio" aria-checked={mode === 'general'} className={mode === 'general' ? 'active' : ''} onClick={() => setMode('general')}>
              <Sparkles size={14} /> Ask anything
            </button>
            <button role="radio" aria-checked={mode === 'symptom'} className={mode === 'symptom' ? 'active' : ''} onClick={() => setMode('symptom')}>
              <Stethoscope size={14} /> Symptom Copilot
            </button>
          </div>
          <div className="meta-right">
            {reportContext && (
              <span className="context-chip" title="Follow-up questions use this document's analysis">
                <FileScan size={13} /> {reportContext.fileName}
                <button onClick={() => setReportContext(null)} aria-label="Remove report from context"><X size={12} /></button>
              </span>
            )}
            {mode === 'symptom' && (
              <button className="btn btn-outline btn-sm" onClick={() => void makeSummary()} disabled={!!busy || !canSummarise}>
                <Stethoscope size={14} /> Create doctor summary
              </button>
            )}
            {!empty && (
              <button className="btn btn-ghost btn-sm" onClick={clearAll} title="Clear conversation">
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>
        </div>

        {(notice || speechIn.error) && (
          <div className="notice" role="alert">
            <span>{notice ?? speechIn.error}</span>
            <button className="icon-btn sm" onClick={() => { setNotice(null); speechIn.clearError(); }} aria-label="Dismiss"><X size={14} /></button>
          </div>
        )}

        <div className={`composer ${speechIn.listening ? 'listening' : ''}`}>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <button className="icon-btn" onClick={openFilePicker} disabled={!!busy} aria-label="Upload a medical report or prescription (PDF, JPG, PNG)" title="Upload report or prescription">
            <Paperclip size={18} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_INPUT))}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={
              speechIn.listening
                ? 'Listening… speak now'
                : mode === 'symptom'
                  ? 'Describe your symptoms — e.g. "headache for 3 days, worse in the mornings"'
                  : 'Ask a health question, or upload a report or prescription…'
            }
            aria-label="Message"
          />
          {voiceEnabled && (
            <button
              className={`icon-btn mic ${speechIn.listening ? 'live' : ''}`}
              onClick={toggleMic}
              disabled={!speechIn.supported || busy === 'chat'}
              aria-pressed={speechIn.listening}
              aria-label={!speechIn.supported ? 'Voice input not supported in this browser' : speechIn.listening ? 'Stop listening' : 'Speak your message'}
              title={!speechIn.supported ? 'Voice input not supported in this browser' : speechIn.listening ? 'Stop listening' : 'Speak'}
            >
              {speechIn.listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          {busy === 'chat' ? (
            <button className="send stop" onClick={stop} aria-label="Stop generating"><Square size={16} /></button>
          ) : (
            <button className="send" onClick={() => send()} disabled={!input.trim() || !!busy || !aiReady} aria-label="Send message">
              <ArrowUp size={18} />
            </button>
          )}
        </div>
        <p className="fineprint">
          Educational information only, not medical advice. Messages and files are processed by Google Gemini; CureConnect does not store them.
          {speechIn.supported && voiceEnabled && ' Voice input uses your browser’s speech service.'}
        </p>
      </footer>

      {dragging && (
        <div className="dropzone" aria-hidden="true">
          <FileScan size={36} />
          <b>Drop your report or prescription to analyse it</b>
          <span>PDF, JPG, PNG or WebP · up to 10 MB</span>
        </div>
      )}
    </div>
  );
}
