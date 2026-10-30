// Post-processing for report analyses. Adds a deterministic range check computed by
// this server (not the model) so the UI can show when the two disagree.

const NUM = String.raw`[-+]?\d+(?:[.,]\d+)?`;

const parseNum = (s) => Number.parseFloat(String(s).replace(',', '.'));

/** Parses "4.0 - 11.0", "4.0–11.0", "< 200", "<=5", "> 40", "up to 5". Returns {low, high} or null. */
export function parseRange(range) {
  if (typeof range !== 'string') return null;
  const r = range.trim().replace(/[–—]/g, '-').replace(/\s+to\s+/i, ' - ');
  // Optional trailing unit text, which must start with a non-digit (e.g. "g/dL", "x10^3/uL").
  const UNIT = String.raw`(?:\s*[^\d\s.,-].*)?`;
  let m = r.match(new RegExp(`^(${NUM})\\s*-\\s*(${NUM})${UNIT}$`));
  if (m) {
    const low = parseNum(m[1]);
    const high = parseNum(m[2]);
    return low <= high ? { low, high } : null;
  }
  m = r.match(new RegExp(`^(?:<=|<|≤|up to|upto|less than)\\s*(${NUM})${UNIT}$`, 'i'));
  if (m) return { low: -Infinity, high: parseNum(m[1]) };
  m = r.match(new RegExp(`^(?:>=|>|≥|more than|greater than)\\s*(${NUM})${UNIT}$`, 'i'));
  if (m) return { low: parseNum(m[1]), high: Infinity };
  return null;
}

/** Plain numeric values only ("13.5", "13,5"). Anything else (e.g. "Positive", "<0.1") → null. */
export function parseValue(value) {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(new RegExp(`^(${NUM})$`));
  return m ? parseNum(m[1]) : null;
}

export function computeRangeCheck(value, range) {
  const v = parseValue(value);
  const r = parseRange(range);
  if (v === null || r === null) return 'not_computable';
  if (v < r.low) return 'below';
  if (v > r.high) return 'above';
  return 'within';
}

const str = (v, max = 2000) => (typeof v === 'string' ? v.slice(0, max) : '');
const strList = (v, n = 12, max = 600) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, n).map((x) => x.slice(0, max)) : []);

/** Validates/normalises the model's JSON against what the UI expects. Unknown fields are dropped. */
export function normaliseReport(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const findings = (Array.isArray(raw.findings) ? raw.findings : []).slice(0, 150).map((f) => {
    const value = str(f?.value, 120);
    const referenceRange = str(f?.referenceRange, 120);
    const legibility = ['clear', 'uncertain', 'illegible'].includes(f?.legibility) ? f.legibility : 'uncertain';
    const modelCheck = ['above', 'below', 'within', 'unknown'].includes(f?.outOfRange) ? f.outOfRange : 'unknown';
    const serverCheck = legibility === 'illegible' ? 'not_computable' : computeRangeCheck(value, referenceRange);
    return {
      name: str(f?.name, 160),
      value,
      unit: str(f?.unit, 60),
      referenceRange,
      printedFlag: str(f?.printedFlag, 30) || 'none',
      legibility,
      modelRangeCheck: modelCheck,
      serverRangeCheck: serverCheck,
      checksDisagree:
        serverCheck !== 'not_computable' && modelCheck !== 'unknown' && serverCheck !== modelCheck,
    };
  });
  return {
    isMedicalDocument: raw.isMedicalDocument !== false,
    readability: ['clear', 'partial', 'poor'].includes(raw.readability) ? raw.readability : 'partial',
    overview: {
      reportType: str(raw.overview?.reportType, 200),
      reportDate: str(raw.overview?.reportDate, 100),
      context: str(raw.overview?.context, 400),
      summary: str(raw.overview?.summary, 2000),
    },
    findings,
    terms: (Array.isArray(raw.terms) ? raw.terms : []).slice(0, 20).map((t) => ({
      term: str(t?.term, 120),
      explanation: str(t?.explanation, 800),
    })),
    interpretation: str(raw.interpretation, 4000),
    doctorQuestions: strList(raw.doctorQuestions, 8),
    limitations: strList(raw.limitations, 8),
  };
}

export const STANDARD_LIMITATIONS = [
  'Reference ranges differ between laboratories, ages and sexes; use the range printed on your report.',
  'A single report usually cannot establish a diagnosis. Results need interpretation alongside your history and examination.',
  'Values were read by AI from the document and may contain reading errors. Always check against the original report.',
];
