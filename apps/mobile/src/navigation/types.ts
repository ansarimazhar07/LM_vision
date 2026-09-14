export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  SmartScan: undefined;
  CameraCapture: undefined;
  ImageReview: undefined;
  Calibration: undefined;
  AIProcessing: undefined;
  InspectionResult: undefined;
  Declarations: undefined;
  Findings: undefined;
  FindingDetail: { findingId: string };
  Evidence: undefined;
  InspectorDecision: undefined;
  InspectorReview: undefined;
  EvidenceViewer: { initialEvidenceId?: string; imageId?: string; inspectionId?: string } | undefined;
  ReviewSummary: undefined;
  Ecommerce: undefined;
  EcommerceComparison: undefined;
  PackageComparison: undefined;
  Report: { inspectionId?: string } | undefined;
  InspectionDetail: { inspectionId: string };
  ReportPreview: { inspectionId: string };
  RuleLibrary: undefined;
  LegalRuleDetail: { ruleId: string };
};

export const FUTURE_INSPECTION_ROUTES = [
  'SmartScan',
  'CameraCapture',
  'ImageReview',
  'Calibration',
  'AIProcessing',
  'Findings',
  'Evidence',
  'InspectorDecision',
  'Ecommerce',
  'Report',
] as const;

export type MainTabParamList = {
  Home: undefined;
  NewInspection: undefined;
  Rules: undefined;
  History: undefined;
  Profile: undefined;
};
