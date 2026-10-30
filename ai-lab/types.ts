export type Role = 'user' | 'model';
export type Mode = 'general' | 'symptom';
export type Language = 'auto' | 'en' | 'hi';

export interface EmergencyGuidance {
  title: string;
  message: string;
  selfHarmMessage?: string;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface TextItem {
  kind: 'text';
  id: string;
  role: Role;
  text: string;
  status: 'streaming' | 'done' | 'stopped' | 'error';
  followUps?: string[];
  emergency?: EmergencyGuidance | null;
  error?: ApiErrorBody;
}

export type RangeCheck = 'above' | 'below' | 'within' | 'unknown' | 'not_computable';

export interface Finding {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  printedFlag: string;
  legibility: 'clear' | 'uncertain' | 'illegible';
  modelRangeCheck: RangeCheck;
  serverRangeCheck: RangeCheck;
  checksDisagree: boolean;
}

export type DocumentType = 'lab_report' | 'prescription' | 'other_medical' | 'not_medical';

export interface Medicine {
  writtenAs: string;
  medicineName: string;
  alternatives: string[];
  strength: string;
  form: string;
  directionsAsWritten: string;
  frequency: string;
  timing: string;
  duration: string;
  confidence: 'high' | 'medium' | 'low';
  commonUse: string;
  /** Standard Rx shorthand decoded by the server, not the model. */
  decoded: { code: string; meaning: string }[];
}

export interface PrescriptionDetails {
  prescriber: string;
  complaintsOrDiagnosis: string;
  advice: string[];
  followUp: string;
}

export interface ReportAnalysis {
  isMedicalDocument: boolean;
  documentType: DocumentType;
  medicines: Medicine[];
  prescription: PrescriptionDetails;
  readability: 'clear' | 'partial' | 'poor';
  overview: { reportType: string; reportDate: string; context: string; summary: string };
  findings: Finding[];
  terms: { term: string; explanation: string }[];
  interpretation: string;
  doctorQuestions: string[];
  limitations: string[];
}

export interface ReportItem {
  kind: 'report';
  id: string;
  fileName: string;
  fileSize: number;
  status: 'analysing' | 'done' | 'error' | 'cancelled';
  analysis?: ReportAnalysis;
  standardLimitations?: string[];
  error?: ApiErrorBody;
}

export type ThreadItem = TextItem | ReportItem;

export type CareLevel = 'emergency' | 'urgent' | 'soon' | 'routine' | 'unclear';

export interface SymptomSummary {
  reportedSymptoms: { symptom: string; details: string }[];
  reportedDurationAndProgression: string;
  reportedContext: string[];
  unansweredQuestions: string[];
  educationalInformation: string[];
  questionsForClinician: string[];
  careLevel: CareLevel;
  careRecommendation: string;
}

export interface ServiceStatus {
  state: 'online' | 'not_configured' | 'invalid_api_key' | 'model_unavailable' | 'quota_exceeded' | 'unreachable' | string;
  model: string;
}
