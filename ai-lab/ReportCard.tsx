import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, FileText, HelpCircle, Info, ScanLine, X } from 'lucide-react';
import type { Finding, RangeCheck, ReportAnalysis, ReportItem } from './types';

const formatSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const RANGE_LABEL: Record<RangeCheck, string> = {
  above: 'Above printed range',
  below: 'Below printed range',
  within: 'Within printed range',
  unknown: 'Not compared',
  not_computable: 'Not compared',
};

function FlagCell({ f }: { f: Finding }) {
  // Prefer the server's deterministic comparison; fall back to the model's reading.
  const check = f.serverRangeCheck !== 'not_computable' ? f.serverRangeCheck : f.modelRangeCheck;
  const tone = check === 'above' || check === 'below' ? 'warn' : check === 'within' ? 'ok' : 'muted';
  return (
    <div className="flag-cell">
      <span className={`chip chip-${tone}`}>{RANGE_LABEL[check]}</span>
      {f.printedFlag && f.printedFlag !== 'none' && <span className="chip chip-muted" title="Flag printed on the report">Printed: {f.printedFlag}</span>}
      {f.checksDisagree && (
        <span className="chip chip-alert" title="The AI's reading and CureConnect's own numeric comparison disagree. Check the original report.">
          Check manually
        </span>
      )}
    </div>
  );
}

export function reportToText(fileName: string, a: ReportAnalysis, standard: string[]) {
  const lines = [
    `CureConnect AI Vision — Report explanation (${fileName})`,
    'Educational information only. Not a diagnosis. Discuss with a qualified clinician.',
    '',
    `Report type: ${a.overview.reportType || 'Not identified'}`,
    `Date: ${a.overview.reportDate || 'Not visible'}`,
    '',
    'OVERVIEW (AI)',
    a.overview.summary,
    '',
    'EXTRACTED FINDINGS (as printed on the report)',
    ...a.findings.map(
      (f) =>
        `- ${f.name}: ${f.value || '[missing]'} ${f.unit} | Ref: ${f.referenceRange || 'not printed'} | ${RANGE_LABEL[f.serverRangeCheck !== 'not_computable' ? f.serverRangeCheck : f.modelRangeCheck]}${f.legibility !== 'clear' ? ` | ${f.legibility}` : ''}`,
    ),
    '',
    'AI INTERPRETATION (educational)',
    a.interpretation,
    '',
    'QUESTIONS FOR YOUR DOCTOR',
    ...a.doctorQuestions.map((q) => `- ${q}`),
    '',
    'LIMITATIONS',
    ...[...a.limitations, ...standard].map((l) => `- ${l}`),
  ];
  return lines.join('\n');
}

export function ReportCard({
  item,
  onCancel,
  onAsk,
  onDismissContext,
  inContext,
}: {
  item: ReportItem;
  onCancel: () => void;
  onAsk: (q: string) => void;
  onDismissContext: () => void;
  inContext: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (item.status === 'analysing') {
    return (
      <div className="report-card analysing" role="status" aria-live="polite">
        <div className="report-head">
          <div className="report-icon scanning"><ScanLine size={20} /></div>
          <div>
            <b>Analysing {item.fileName}</b>
            <span className="muted">{formatSize(item.fileSize)} · Sent securely to Google Gemini · usually 10–40 seconds</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
        </div>
        <div className="scan-bar"><span /></div>
        <ol className="scan-steps">
          <li>Reading the document</li>
          <li>Extracting values exactly as printed</li>
          <li>Comparing with printed reference ranges</li>
          <li>Writing a plain-language explanation</li>
        </ol>
      </div>
    );
  }

  if (item.status !== 'done' || !item.analysis) {
    return (
      <div className="report-card error" role="alert">
        <div className="report-head">
          <div className="report-icon"><FileText size={20} /></div>
          <div>
            <b>{item.fileName}</b>
            <span className="muted">{item.status === 'cancelled' ? 'Analysis cancelled.' : item.error?.message ?? 'Analysis failed.'}</span>
          </div>
        </div>
      </div>
    );
  }

  const a = item.analysis;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(reportToText(item.fileName, a, item.standardLimitations ?? []));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!a.isMedicalDocument) {
    return (
      <div className="report-card">
        <div className="report-head">
          <div className="report-icon"><Info size={20} /></div>
          <div>
            <b>This doesn't look like a medical report</b>
            <span className="muted">{a.overview.summary || 'Please upload a lab report, prescription or medical document.'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <article className="report-card" aria-label={`Analysis of ${item.fileName}`}>
      <div className="report-head">
        <div className="report-icon"><FileText size={20} /></div>
        <div>
          <b>{a.overview.reportType || 'Medical report'}</b>
          <span className="muted">
            {item.fileName}
            {a.overview.reportDate ? ` · ${a.overview.reportDate}` : ''} · Readability: {a.readability}
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={copy} aria-label="Copy report explanation">
          {copied ? <CheckCircle2 size={15} /> : <ClipboardCopy size={15} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <section>
        <h3><span className="sec">A</span> Report overview</h3>
        <p>{a.overview.summary}</p>
        {a.overview.context && <p className="muted small">{a.overview.context}</p>}
      </section>

      <section>
        <h3><span className="sec">B</span> Extracted findings <span className="tag tag-fact">Facts from your report</span></h3>
        {a.findings.length === 0 ? (
          <p className="muted">No individual values could be extracted from this document.</p>
        ) : (
          <div className="findings" role="table" aria-label="Extracted findings">
            <div className="findings-row head" role="row">
              <span role="columnheader">Test</span>
              <span role="columnheader">Result</span>
              <span role="columnheader">Reference range</span>
              <span role="columnheader">Status</span>
            </div>
            {a.findings.map((f, i) => (
              <div className={`findings-row ${f.legibility !== 'clear' ? 'uncertain' : ''}`} role="row" key={i}>
                <span role="cell" className="f-name">{f.name}</span>
                <span role="cell" className="f-value">
                  {f.value ? <b>{f.value}</b> : <em className="muted">missing</em>} <span className="muted">{f.unit}</span>
                  {f.legibility !== 'clear' && (
                    <span className="chip chip-alert" title="Hard to read on the document — verify against the original">
                      {f.legibility}
                    </span>
                  )}
                </span>
                <span role="cell" className="f-range">{f.referenceRange || <em className="muted">not printed</em>}</span>
                <span role="cell"><FlagCell f={f} /></span>
              </div>
            ))}
          </div>
        )}
        <p className="muted small">
          Values are copied from the document by AI and may contain reading errors. "Above/below" compares only with the range printed on your report and is not a diagnosis.
        </p>
      </section>

      <section>
        <h3><span className="sec">C</span> Plain-language explanation <span className="tag tag-ai">AI interpretation</span></h3>
        <p>{a.interpretation}</p>
        {a.terms.length > 0 && (
          <dl className="terms">
            {a.terms.map((t, i) => (
              <div key={i}>
                <dt>{t.term}</dt>
                <dd>{t.explanation}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {a.doctorQuestions.length > 0 && (
        <section>
          <h3><span className="sec">D</span> Questions for your doctor</h3>
          <ul className="q-list">
            {a.doctorQuestions.map((q, i) => (
              <li key={i}><HelpCircle size={14} /> {q}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="limits">
        <h3><span className="sec">E</span> Important limitations</h3>
        <ul>
          {[...a.limitations, ...(item.standardLimitations ?? [])].map((l, i) => (
            <li key={i}><AlertTriangle size={13} /> {l}</li>
          ))}
        </ul>
      </section>

      <div className="report-foot">
        {inContext ? (
          <>
            <span className="muted small">You can now ask follow-up questions about this report.</span>
            <div className="chips-row">
              {['Which results should I discuss first with my doctor?', 'Explain the out-of-range values simply'].map((q) => (
                <button key={q} className="suggestion" onClick={() => onAsk(q)}>{q}</button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={onDismissContext} title="Stop using this report as context">
                <X size={14} /> Remove from context
              </button>
            </div>
          </>
        ) : (
          <span className="muted small">This report is no longer used as context for follow-up questions.</span>
        )}
      </div>
    </article>
  );
}

export function compactReportContext(fileName: string, a: ReportAnalysis) {
  return JSON.stringify({
    fileName,
    reportType: a.overview.reportType,
    reportDate: a.overview.reportDate,
    summary: a.overview.summary,
    findings: a.findings.map((f) => ({
      name: f.name,
      value: f.value,
      unit: f.unit,
      referenceRange: f.referenceRange,
      printedFlag: f.printedFlag,
      rangeCheck: f.serverRangeCheck !== 'not_computable' ? f.serverRangeCheck : f.modelRangeCheck,
      legibility: f.legibility,
    })),
    interpretation: a.interpretation,
  }).slice(0, 29000);
}
