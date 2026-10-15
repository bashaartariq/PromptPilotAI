export type AnalysisAction = 'analyze' | 'optimize' | 'reevaluate';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface PromptContext {
  title: string;
  originalPrompt: string;
  ticket: string;
  projectContext: string;
  developerInstructions: string;
  edgeCases: string;
  optimizedPrompt?: string;
}

export interface AnalysisIssue {
  title: string;
  severity: IssueSeverity;
  explanation: string;
  suggestion: string;
}

export interface BreakingRisk {
  title: string;
  reason: string;
}

export interface PromptAnalysisResult {
  summary: string;
  overallScore: number;
  strengths: string[];
  issues: AnalysisIssue[];
  missingRequirements: string[];
  ambiguities: string[];
  edgeCases: string[];
  breakingRisks: BreakingRisk[];
  projectPatternGuidance: string[];
  clarifyingQuestions: string[];
  optimizedPrompt: string;
  verificationChecklist: string[];
}

export interface SavedAnalysis {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  action: AnalysisAction;
  status: 'complete';
  input: PromptContext;
  result: PromptAnalysisResult;
  previousScore?: number;
}

export interface DashboardStats {
  totalAnalyzed: number;
  totalOptimized: number;
  savedCount: number;
}
