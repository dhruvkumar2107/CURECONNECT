import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCopy, FileText, HelpCircle, Info, Pill, ScanLine, X } from 'lucide-react';
import type { Finding, Medicine, RangeCheck, ReportAnalysis, ReportItem } from './types';

const formatSize = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

const RANGE_LABEL: Record<RangeCheck, string> = {
  above: 'Above printed range',
  below: 'Below printed range',
  within: 'Within printed range',
  unknown: 'Not compared',
  not_computable: 'Not compared',
};

const CONFIDENCE_LABEL: Record<Medicine['confidence'], string> = {
  high: 'Clearly legible',
  medium: 'Partly inferred',
  low: 'Unclear — confirm with pharmacist',
};

const isPrescription = (a: ReportAnalysis) => a.documentType === 'prescription';

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

function MedicineCard({ m, index }: { m: Medicine; index: number }) {
  const tone = m.confidence === 'high' ? 'ok' : m.confidence === 'medium' ? 'warn' : 'alert';
  return (
    <li className={`med-card med-${m.confidence}`}>
      <div className="med-head">
        <span className="med-num">{index + 1}</span>
        <div className="med-title">
          <b>{m.medicineName || 'Could not read this medicine name'}</b>
          {(m.strength || m.form) && <span className="muted">{[m.form, m.strength].filter(Boolean).join(' · ')}</span>}
        </div>
        <span className={`chip chip-${tone}`}>{CONFIDENCE_LABEL[m.confidence]}</span>
      </div>

      {m.writtenAs && (
        <p className="med-written">
          <span className="muted">Written as:</span> <code>{m.writtenAs}</code>
        </p>
      )}
      {m.alternatives.length > 0 && (
        <p className="med-alt">
          <AlertTriangle size={13} /> Could also be: <b>{m.alternatives.join(', ')}</b>. Ask your pharmacist which one it is.
        </p>
      )}

      <dl className="med-grid">
        {m.directionsAsWritten && (
          <div><dt>Directions (as written)</dt><dd><code>{m.directionsAsWritten}</code></dd></div>
        )}
        {m.frequency && <div><dt>How often</dt><dd>{m.frequency}</dd></div>}
        {m.timing && <div><dt>When</dt><dd>{m.timing}</dd></div>}
        {m.duration && <div><dt>For how long</dt><dd>{m.duration}</dd></div>}
      </dl>

      {m.decoded.length > 0 && (
        <div className="med-decoded" title="Standard prescription abbreviations, decoded by CureConnect (not the AI)">
          {m.decoded.map((d, i) => (
            <span key={i} className="chip chip-muted"><b>{d.code}</b>&nbsp;= {d.meaning}</span>
          ))}
        </div>
      )}
      {m.commonUse && (
        <p className="med-use"><span className="tag tag-ai">Commonly used for</span> {m.commonUse}</p>
      )}
    </li>
  );
}

export function reportToText(fileName: string, a: ReportAnalysis, standard: string[]) {
  const rx = isPrescription(a);
  const lines = [
    `CureConnect AI Vision — ${rx ? 'Prescription reading' : 'Report explanation'} (${fileName})`,
    'Educational information only. Not a diagnosis. Discuss with a qualified clinician.',
    '',
    `Document: ${a.overview.reportType || (rx ? 'Prescription' : 'Not identified')}`,
    `Date: ${a.overview.reportDate || 'Not visible'}`,
    ...(rx && a.prescription.prescriber ? [`Prescriber: ${a.prescription.prescriber}`] : []),
    '',
    'OVERVIEW (AI)',
    a.overview.summary,
  ];
  if (a.medicines.length > 0) {
    lines.push('', 'MEDICINES (read from handwriting by AI — confirm with your pharmacist)');
    a.medicines.forEach((m, i) => {
      lines.push(
        `${i + 1}. ${m.medicineName || '[unreadable]'}${m.strength ? ` ${m.strength}` : ''}${m.form ? ` (${m.form})` : ''} — ${CONFIDENCE_LABEL[m.confidence]}`,
      );
      if (m.writtenAs) lines.push(`   Written as: ${m.writtenAs}`);
      if (m.alternatives.length) lines.push(`   Could also be: ${m.alternatives.join(', ')}`);
      if (m.directionsAsWritten) lines.push(`   Directions as written: ${m.directionsAsWritten}`);
      const plain = [m.frequency, m.timing, m.duration].filter(Boolean).join('; ');
      if (plain) lines.push(`   Meaning: ${plain}`);
      if (m.decoded.length) lines.push(`   Abbreviations: ${m.decoded.map((d) => `${d.code} = ${d.meaning}`).join('; ')}`);
    });
  }
  if (rx) {
    if (a.prescription.complaintsOrDiagnosis) lines.push('', `Complaints / diagnosis (as written): ${a.prescription.complaintsOrDiagnosis}`);
    if (a.prescription.advice.length) lines.push('', 'OTHER ADVICE (as written)', ...a.prescription.advice.map((x) => `- ${x}`));
    if (a.prescription.followUp) lines.push('', `Follow-up: ${a.prescription.followUp}`);
  }
  if (a.findings.length > 0) {
    lines.push(
      '',
      rx ? 'VITALS / VALUES NOTED' : 'EXTRACTED FINDINGS (as printed on the report)',
      ...a.findings.map(
        (f) =>
          `- ${f.name}: ${f.value || '[missing]'} ${f.unit} | Ref: ${f.referenceRange || 'not printed'} | ${RANGE_LABEL[f.serverRangeCheck !== 'not_computable' ? f.serverRangeCheck : f.modelRangeCheck]}${f.legibility !== 'clear' ? ` | ${f.legibility}` : ''}`,
      ),
    );
  }
  lines.push(
    '',
    'AI INTERPRETATION (educational)',
    a.interpretation,
    '',
    'QUESTIONS FOR YOUR DOCTOR',
    ...a.doctorQuestions.map((q) => `- ${q}`),
    '',
    'LIMITATIONS',
    ...[...a.limitations, ...standard].map((l) => `- ${l}`),
  );
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
          <li>Reading the document, including handwriting</li>
          <li>Identifying a lab report or prescription</li>
          <li>Extracting values and medicines exactly as written</li>
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
  const rx = isPrescription(a);
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

  // Section letters depend on which sections are shown.
  let n = 0;
  const sec = () => String.fromCharCode(65 + n++);
  const rxDetails = a.prescription;
  const hasRxDetails = rx && (rxDetails.complaintsOrDiagnosis || rxDetails.advice.length > 0 || rxDetails.followUp);
  const followUpChips = rx
    ? ['When and how should I take each medicine?', 'Which medicines should I confirm with my pharmacist?']
    : ['Which results should I discuss first with my doctor?', 'Explain the out-of-range values simply'];

  return (
    <article className="report-card" aria-label={`Analysis of ${item.fileName}`}>
      <div className="report-head">
        <div className="report-icon">{rx ? <Pill size={20} /> : <FileText size={20} />}</div>
        <div>
          <b>{a.overview.reportType || (rx ? 'Prescription' : 'Medical report')}</b>
          <span className="muted">
            {item.fileName}
            {a.overview.reportDate ? ` · ${a.overview.reportDate}` : ''} · Readability: {a.readability}
          </span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={copy} aria-label="Copy explanation">
          {copied ? <CheckCircle2 size={15} /> : <ClipboardCopy size={15} />} {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <section>
        <h3><span className="sec">{sec()}</span> {rx ? 'Prescription overview' : 'Report overview'}</h3>
        <p>{a.overview.summary}</p>
        {rx && rxDetails.prescriber && <p className="muted small">Prescriber: {rxDetails.prescriber}</p>}
        {a.overview.context && <p className="muted small">{a.overview.context}</p>}
      </section>

      {(rx || a.medicines.length > 0) && (
        <section>
          <h3>
            <span className="sec">{sec()}</span> Medicines <span className="tag tag-fact">Read from the prescription</span>
          </h3>
          {a.medicines.length === 0 ? (
            <p className="muted">No medicines could be read from this document. Try a sharper, well-lit photo taken straight on.</p>
          ) : (
            <ol className="med-list">
              {a.medicines.map((m, i) => <MedicineCard key={i} m={m} index={i} />)}
            </ol>
          )}
          <p className="rx-warning">
            <AlertTriangle size={14} /> Handwriting was read by AI, and many medicine names look alike. <b>Confirm every medicine with your pharmacist or doctor before buying or taking it.</b>
          </p>
        </section>
      )}

      {hasRxDetails && (
        <section>
          <h3><span className="sec">{sec()}</span> Other notes on the prescription</h3>
          <dl className="terms">
            {rxDetails.complaintsOrDiagnosis && (
              <div><dt>Complaints / diagnosis (as written)</dt><dd>{rxDetails.complaintsOrDiagnosis}</dd></div>
            )}
            {rxDetails.advice.length > 0 && (
              <div><dt>Advice</dt><dd>{rxDetails.advice.join(' · ')}</dd></div>
            )}
            {rxDetails.followUp && <div><dt>Follow-up</dt><dd>{rxDetails.followUp}</dd></div>}
          </dl>
        </section>
      )}

      {(!rx || a.findings.length > 0) && (
        <section>
          <h3>
            <span className="sec">{sec()}</span> {rx ? 'Vitals and values noted' : 'Extracted findings'}{' '}
            <span className="tag tag-fact">{rx ? 'As written' : 'Facts from your report'}</span>
          </h3>
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
      )}

      <section>
        <h3><span className="sec">{sec()}</span> Plain-language explanation <span className="tag tag-ai">AI interpretation</span></h3>
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
          <h3><span className="sec">{sec()}</span> Questions for your doctor</h3>
          <ul className="q-list">
            {a.doctorQuestions.map((q, i) => (
              <li key={i}><HelpCircle size={14} /> {q}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="limits">
        <h3><span className="sec">{sec()}</span> Important limitations</h3>
        <ul>
          {[...a.limitations, ...(item.standardLimitations ?? [])].map((l, i) => (
            <li key={i}><AlertTriangle size={13} /> {l}</li>
          ))}
        </ul>
      </section>

      <div className="report-foot">
        {inContext ? (
          <>
            <span className="muted small">You can now ask follow-up questions about this {rx ? 'prescription' : 'report'}.</span>
            <div className="chips-row">
              {followUpChips.map((q) => (
                <button key={q} className="suggestion" onClick={() => onAsk(q)}>{q}</button>
              ))}
              <button className="btn btn-ghost btn-sm" onClick={onDismissContext} title="Stop using this document as context">
                <X size={14} /> Remove from context
              </button>
            </div>
          </>
        ) : (
          <span className="muted small">This {rx ? 'prescription' : 'report'} is no longer used as context for follow-up questions.</span>
        )}
      </div>
    </article>
  );
}

export function compactReportContext(fileName: string, a: ReportAnalysis) {
  return JSON.stringify({
    fileName,
    documentType: a.documentType,
    reportType: a.overview.reportType,
    reportDate: a.overview.reportDate,
    summary: a.overview.summary,
    medicines: a.medicines.map((m) => ({
      name: m.medicineName || '[unreadable]',
      writtenAs: m.writtenAs,
      alternatives: m.alternatives,
      strength: m.strength,
      form: m.form,
      directionsAsWritten: m.directionsAsWritten,
      frequency: m.frequency,
      timing: m.timing,
      duration: m.duration,
      confidence: m.confidence,
      decoded: m.decoded,
    })),
    prescription: a.documentType === 'prescription' ? a.prescription : undefined,
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
