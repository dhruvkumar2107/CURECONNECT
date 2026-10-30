import React, { useState } from 'react';
import { AlertOctagon, CheckCircle2, ClipboardCopy, Download, Stethoscope, X } from 'lucide-react';
import type { CareLevel, EmergencyGuidance, SymptomSummary } from './types';

const CARE: Record<CareLevel, { label: string; tone: string }> = {
  emergency: { label: 'Seek emergency care now', tone: 'danger' },
  urgent: { label: 'Get assessed today', tone: 'warn' },
  soon: { label: 'See a doctor in the next few days', tone: 'info' },
  routine: { label: 'Discuss at a routine appointment', tone: 'ok' },
  unclear: { label: 'Not enough information — ask a clinician', tone: 'muted' },
};

export function summaryToText(s: SymptomSummary, generatedAt: string) {
  const section = (title: string, items: string[]) => [title, ...(items.length ? items.map((i) => `- ${i}`) : ['- (none)']), ''];
  return [
    'CureConnect AI Vision — Doctor visit preparation summary',
    `Generated: ${new Date(generatedAt).toLocaleString()}`,
    'Educational information only. This is not a diagnosis and does not replace a medical examination.',
    '',
    '=== WHAT I REPORTED (my own words, organised) ===',
    '',
    ...section('Symptoms', s.reportedSymptoms.map((r) => (r.details ? `${r.symptom}: ${r.details}` : r.symptom))),
    'Duration and progression',
    s.reportedDurationAndProgression || '(not discussed)',
    '',
    ...section('Relevant context I shared', s.reportedContext),
    '=== AI-GENERATED (general information, not a diagnosis) ===',
    '',
    ...section('Not yet discussed / worth clarifying', s.unansweredQuestions),
    ...section('General educational information', s.educationalInformation),
    ...section('Questions to ask my clinician', s.questionsForClinician),
    'Suggested next step',
    `${CARE[s.careLevel]?.label ?? ''}. ${s.careRecommendation}`,
    '',
    'In an emergency in India, call 112 (or 108 for an ambulance).',
  ].join('\n');
}

export function SummaryPanel({
  summary,
  generatedAt,
  emergency,
  onClose,
}: {
  summary: SymptomSummary;
  generatedAt: string;
  emergency: EmergencyGuidance | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const care = CARE[summary.careLevel] ?? CARE.unclear;
  const text = summaryToText(summary, generatedAt);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `cureconnect-doctor-summary-${generatedAt.slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const List = ({ items, empty }: { items: string[]; empty: string }) =>
    items.length ? <ul>{items.map((i, k) => <li key={k}>{i}</li>)}</ul> : <p className="muted small">{empty}</p>;

  return (
    <article className="summary-card" aria-label="Doctor visit preparation summary">
      <header className="summary-head">
        <div className="report-icon"><Stethoscope size={20} /></div>
        <div>
          <b>Doctor visit summary</b>
          <span className="muted">Generated {new Date(generatedAt).toLocaleString()}</span>
        </div>
        <div className="summary-actions">
          <button className="btn btn-ghost btn-sm" onClick={copy}>
            {copied ? <CheckCircle2 size={15} /> : <ClipboardCopy size={15} />} {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={download}><Download size={15} /> Download</button>
          <button className="icon-btn" onClick={onClose} aria-label="Close summary"><X size={16} /></button>
        </div>
      </header>

      {(emergency || summary.careLevel === 'emergency') && (
        <div className="emergency" role="alert">
          <AlertOctagon size={18} />
          <div>
            <b>{emergency?.title ?? 'Possible emergency'}</b>
            <p>{emergency?.message ?? 'Call 112 or go to the nearest emergency department now.'}</p>
          </div>
        </div>
      )}

      <div className={`care care-${care.tone}`}>
        <b>{care.label}</b>
        <p>{summary.careRecommendation}</p>
      </div>

      <div className="summary-grid">
        <section>
          <h3>What you reported <span className="tag tag-fact">Your information</span></h3>
          {summary.reportedSymptoms.length ? (
            <ul>
              {summary.reportedSymptoms.map((r, k) => (
                <li key={k}><b>{r.symptom}</b>{r.details ? ` — ${r.details}` : ''}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">No specific symptoms were described.</p>
          )}
          <h4>Duration and progression</h4>
          <p>{summary.reportedDurationAndProgression || <span className="muted small">Not discussed.</span>}</p>
          <h4>Context you shared</h4>
          <List items={summary.reportedContext} empty="None shared." />
        </section>
        <section>
          <h3>For your appointment <span className="tag tag-ai">AI-generated</span></h3>
          <h4>Questions to ask your clinician</h4>
          <List items={summary.questionsForClinician} empty="—" />
          <h4>Not yet discussed</h4>
          <List items={summary.unansweredQuestions} empty="Nothing major missing." />
          <h4>General information</h4>
          <List items={summary.educationalInformation} empty="—" />
        </section>
      </div>
      <p className="muted small">This summary organises what you told the assistant. It is not a diagnosis and does not replace a medical examination.</p>
    </article>
  );
}
