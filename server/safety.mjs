// Deterministic red-flag detection. This runs BEFORE Gemini so emergency guidance is
// shown immediately and does not depend on the model. It is deliberately broad:
// a false positive shows an extra banner; a false negative could delay care.

const PATTERNS = [
  // Cardiac / breathing
  /chest\s*(pain|tightness|pressure)/i,
  /(can'?t|cannot|unable to|struggling to|difficulty|trouble)\s*(breathe|breathing)/i,
  /short(ness)?\s*of\s*breath/i,
  /not\s*breathing|stopped\s*breathing|choking/i,
  /heart\s*attack|cardiac\s*arrest/i,
  // Neurological
  /stroke|face\s*(is\s*)?droop|slurred\s*speech|sudden(ly)?\s*(numb|weak|paraly)/i,
  /seizure|convuls|fitting/i,
  /unconscious|passed\s*out|unresponsive|fainted\s*and\s*(won'?t|not)/i,
  /worst\s*headache|thunderclap/i,
  // Bleeding / trauma
  /(heavy|severe|uncontrolled|won'?t\s*stop)\s*bleed/i,
  /vomit(ing)?\s*blood|coughing\s*(up\s*)?blood|blood\s*in\s*vomit/i,
  /head\s*injury|hit\s*(my|his|her|their)\s*head/i,
  // Poisoning / allergy
  /overdose|poison|swallowed\s*(bleach|chemical|pills)/i,
  /anaphyla|throat\s*(is\s*)?(closing|swelling)|swollen\s*(tongue|throat|lips)/i,
  // Mental health crisis
  /suicid|kill\s*(my)?self|end\s*(my|their)\s*life|self[-\s]?harm|want\s*to\s*die/i,
  // Pregnancy / infants
  /pregnan\w*.{0,40}(bleed|severe\s*pain)/i,
  /(baby|infant|newborn).{0,40}(not\s*breathing|blue|limp|fever)/i,
  // Hindi (Devanagari) and common romanised Hindi
  /सीने\s*में\s*दर्द|छाती\s*में\s*दर्द/,
  /सांस\s*(नहीं|लेने\s*में\s*(तकलीफ|दिक्कत))|साँस\s*(नहीं|लेने)/,
  /बेहोश|दौरा\s*पड़|लकवा/,
  /आत्महत्या|खुद\s*को\s*(मार|नुकसान)|मरना\s*चाहत/,
  /ज़हर|जहर|बहुत\s*खून/,
  /seene\s*(me|mein)\s*dard|saans\s*(nahi|lene\s*me)|behosh|atmahatya/i,
];

const SELF_HARM = /suicid|kill\s*(my)?self|end\s*(my|their)\s*life|self[-\s]?harm|want\s*to\s*die|आत्महत्या|खुद\s*को\s*(मार|नुकसान)|मरना\s*चाहत|atmahatya/i;

export function detectEmergency(text) {
  if (typeof text !== 'string' || !text) return { emergency: false, selfHarm: false };
  const emergency = PATTERNS.some((re) => re.test(text));
  return { emergency, selfHarm: emergency && SELF_HARM.test(text) };
}

export const EMERGENCY_GUIDANCE = {
  title: 'This could be a medical emergency',
  message:
    'If you or someone near you has severe or sudden symptoms, call 112 (India emergency number) or 108 for an ambulance now, or go to the nearest emergency department. Do not wait for an online answer.',
  selfHarmMessage:
    'If you are thinking about harming yourself, you deserve support right now. In India, call Tele-MANAS on 14416 or 1-800-891-4416 (24×7, free), or 112 if you are in immediate danger.',
};
