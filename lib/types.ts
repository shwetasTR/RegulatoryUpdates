export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Source = 'CSMS' | 'WH' | 'OFAC' | 'USTR' | 'BIS';
export type ActionType =
  | 'DATA_UPDATE'
  | 'LOGIC_CHANGE'
  | 'NEW_FEATURE'
  | 'CONTENT_UPDATE'
  | 'ALERT_RULE'
  | 'VALIDATION'
  | 'MONITORING';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';
export type Effort = 'S' | 'M' | 'L';
export type DataSource = 'tr-claude' | 'fallback' | 'mixed';
export type Status = 'success' | 'partial' | 'error';

export interface RegulatoryChange {
  // Identity
  id: string;
  source: Source;
  sourceId: string;
  title: string;
  summary: string;
  fullText: string;
  url: string;
  publishDate: string;
  effectiveDate?: string;

  // Classification
  severity: Severity;
  productModules: number[];
  actionType: ActionType;
  priority: Priority;
  effort: Effort;

  // Team Assignments
  teams: string[];
  timezones: string[];

  // Regulatory Context
  legalAuthority?: string;
  htsChapters?: string[];
  ftasAffected?: string[];
}

export interface FetchUpdatesResponse {
  status: Status;
  dataSource: DataSource;
  timestamp: string;
  changes: RegulatoryChange[];
  metadata: {
    cbpCsmsCount: number;
    whiteHouseCount: number;
    ofacCount: number;
    criticalCount: number;
  };
}

export interface ProductModule {
  id: number;
  name: string;
  team: string;
  timezones: string[];
  description: string;
  triggers: string[];
}
