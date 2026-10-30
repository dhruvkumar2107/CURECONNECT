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

// ── Prescription directions ────────────────────────────────────────────────
// Standard Rx shorthand decoded by this server (not the model), so the meaning shown for
// "BD", "1-0-1", "5/7" etc. is always the textbook one regardless of what the model wrote.

const ABBREVIATIONS = [
  [/\b(?:OD|QD)\b/i, 'Once a day (on eye-drop prescriptions "OD" can mean "right eye" — check)'],
  [/\b(?:BD|BID)\b/i, 'Twice a day'],
  [/\b(?:TDS|TID)\b/i, 'Three times a day'],
  [/\b(?:QID|QDS)\b/i, 'Four times a day'],
  [/\bQOD\b|\balt(?:ernate)?\.?\s*days?\b/i, 'Every other day'],
  [/\bHS\b/i, 'At bedtime'],
  [/\b(?:SOS|PRN)\b/i, 'Only when needed'],
  [/\bSTAT\b/i, 'Immediately, one dose'],
  [/\bAC\b|\bB\/F\b|before (?:food|meals?)/i, 'Before food'],
  [/\bPC\b|\bA\/F\b|after (?:food|meals?)/i, 'After food'],
  [/\bBBF\b|before breakfast/i, 'Before breakfast'],
  [/\bempty stomach\b|\bE\/S\b/i, 'On an empty stomach'],
];

const DOSE = String.raw`(\d|½|1\/2)`;
const SLOTS_3 = ['morning', 'afternoon', 'night'];
const SLOTS_4 = ['morning', 'afternoon', 'evening', 'night'];
const UNITS = { d: 'day', day: 'day', days: 'day', w: 'week', wk: 'week', wks: 'week', week: 'week', weeks: 'week', m: 'month', mo: 'month', month: 'month', months: 'month' };

/** Decodes common prescription shorthand. Returns [{ code, meaning }] (max 8). */
export function decodeDirections(text) {
  if (typeof text !== 'string' || !text.trim()) return [];
  const out = [];
  const add = (code, meaning) => {
    if (!out.some((o) => o.meaning === meaning)) out.push({ code: code.trim(), meaning });
  };

  // 1-0-1 / 1-1-1-1 / ½-0-½ (single-digit parts only, so dates like 12-05-2026 never match).
  const slots = text.match(new RegExp(String.raw`(?<![\d/.])${DOSE}\s*-\s*${DOSE}\s*-\s*${DOSE}(?:\s*-\s*${DOSE})?(?![\d/.])`));
  if (slots) {
    const parts = slots.slice(1).filter(Boolean).map((p) => (p === '1/2' ? '½' : p));
    const names = parts.length === 4 ? SLOTS_4 : SLOTS_3;
    add(slots[0], parts.map((p, i) => `${p} ${names[i]}`).join(' · '));
  }

  for (const [re, meaning] of ABBREVIATIONS) {
    const m = text.match(re);
    if (m) add(m[0], meaning);
  }

  // Duration: "x 5 days", "×5d", "for 2 weeks", and the "5/7" (days) / "2/52" (weeks) notation.
  const dur = text.match(/(?:[x×*]|\bfor)\s*(\d{1,3})\s*(d|days?|wks?|w|weeks?|mo|m|months?)\b/i);
  if (dur) {
    const n = Number(dur[1]);
    const unit = UNITS[dur[2].toLowerCase()];
    add(dur[0], `For ${n} ${unit}${n === 1 ? '' : 's'}`);
  } else {
    const frac = text.match(/(?<![\d/])(\d{1,2})\s*\/\s*(7|52)(?![\d/])/);
    if (frac) {
      const n = Number(frac[1]);
      const unit = frac[2] === '7' ? 'day' : 'week';
      add(frac[0], `For ${n} ${unit}${n === 1 ? '' : 's'}`);
    }
  }
  return out.slice(0, 8);
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
  const isMedicalDocument = raw.isMedicalDocument !== false;
  const medicines = (Array.isArray(raw.medicines) ? raw.medicines : []).slice(0, 40).map((m) => {
    const medicineName = str(m?.medicineName, 160);
    const directionsAsWritten = str(m?.directionsAsWritten, 200);
    let confidence = ['high', 'medium', 'low'].includes(m?.confidence) ? m.confidence : 'low';
    if (!medicineName) confidence = 'low';
    return {
      writtenAs: str(m?.writtenAs, 200),
      medicineName,
      alternatives: strList(m?.alternatives, 3, 120).filter((a) => a && a !== medicineName),
      strength: str(m?.strength, 60),
      form: str(m?.form, 40),
      directionsAsWritten,
      frequency: str(m?.frequency, 200),
      timing: str(m?.timing, 160),
      duration: str(m?.duration, 100),
      confidence,
      commonUse: str(m?.commonUse, 400),
      decoded: decodeDirections(directionsAsWritten),
    };
  });
  let documentType = ['lab_report', 'prescription', 'other_medical', 'not_medical'].includes(raw.documentType)
    ? raw.documentType
    : 'other_medical';
  if (!isMedicalDocument) documentType = 'not_medical';
  else if (medicines.length > 0 && documentType !== 'prescription') documentType = 'prescription';
  return {
    isMedicalDocument,
    documentType,
    medicines,
    prescription: {
      prescriber: str(raw.prescription?.prescriber, 200),
      complaintsOrDiagnosis: str(raw.prescription?.complaintsOrDiagnosis, 600),
      advice: strList(raw.prescription?.advice, 10, 300),
      followUp: str(raw.prescription?.followUp, 300),
    },
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

export const PRESCRIPTION_LIMITATIONS = [
  'Handwriting was read by AI and many medicine names look alike. Before buying or taking any medicine, confirm the name, strength and directions with the prescribing doctor or your pharmacist.',
  'Directions are shown as written by the prescriber. Do not change how you take a medicine based on this explanation.',
  '"Commonly used for" is general information and may not be the reason it was prescribed to you.',
];

export const standardLimitationsFor = (analysis) =>
  analysis?.documentType === 'prescription' ? PRESCRIPTION_LIMITATIONS : STANDARD_LIMITATIONS;
