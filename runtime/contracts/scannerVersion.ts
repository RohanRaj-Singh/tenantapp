export interface ScannerAnswerOption {
  id: string;
  order: number;
  label: string;
  score: number;
}

export interface ScannerQuestion {
  id: string;
  order: number;
  questionText: string;
  weight: number;
  kind: "primary" | "follow-up";
  answers: ScannerAnswerOption[];
  helpText?: string;
}

export interface ScannerSubdomain {
  id: string;
  order: number;
  label: string;
  description: string;
  weight: number;
  questions: ScannerQuestion[];
}

export interface ScannerCategory {
  id: string;
  order: number;
  label: string;
  description: string;
  weight: number;
  subdomains: ScannerSubdomain[];
}

export interface ScannerFollowUpTrigger {
  id: string;
  triggerQuestionId: string;
  triggerAnswerScores: number[];
  followUpQuestionIds: string[];
}

export interface ScannerVersionMetadata {
  id: string;
  version: string;
  tenantId: string;
  publishedAt: string;
  createdBy: string;
  changeLog: string;
}

export interface RuntimeScannerVersion {
  id: string;
  version: string;
  publishedAt: string;
  isActive: boolean;
  categories: ScannerCategory[];
  followUpTriggers: ScannerFollowUpTrigger[];
}

export interface ScannerVersion {
  scannerVersion: ScannerVersionMetadata;
  categories: ScannerCategory[];
  followUpTriggers: ScannerFollowUpTrigger[];
}
