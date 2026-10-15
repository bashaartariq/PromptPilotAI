import { Injectable } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { environment } from '../../../environments/environment';
import { AnalysisAction, PromptAnalysisResult, PromptContext } from '../models/prompt-analysis.model';

const ANALYSIS_SCHEMA = {
  type: 'object',
  required: [
    'summary', 'overallScore', 'strengths', 'issues', 'missingRequirements', 'ambiguities',
    'edgeCases', 'breakingRisks', 'projectPatternGuidance', 'clarifyingQuestions',
    'optimizedPrompt', 'verificationChecklist'
  ],
  properties: {
    summary: { type: 'string' },
    overallScore: { type: 'number', minimum: 0, maximum: 100 },
    strengths: { type: 'array', items: { type: 'string' } },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'explanation', 'suggestion'],
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          explanation: { type: 'string' },
          suggestion: { type: 'string' }
        }
      }
    },
    missingRequirements: { type: 'array', items: { type: 'string' } },
    ambiguities: { type: 'array', items: { type: 'string' } },
    edgeCases: { type: 'array', items: { type: 'string' } },
    breakingRisks: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'reason'],
        properties: { title: { type: 'string' }, reason: { type: 'string' } }
      }
    },
    projectPatternGuidance: { type: 'array', items: { type: 'string' } },
    clarifyingQuestions: { type: 'array', items: { type: 'string' } },
    optimizedPrompt: { type: 'string' },
    verificationChecklist: { type: 'array', items: { type: 'string' } }
  }
};

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private sessionApiKey = '';
  readonly model = environment.gemini.model;

  setSessionApiKey(apiKey: string): void {
    this.sessionApiKey = apiKey.trim();
  }

  clearSessionApiKey(): void {
    this.sessionApiKey = '';
  }

  hasApiKey(): boolean {
    return Boolean(this.getApiKey());
  }

  getSafeErrorDiagnostic(error: unknown): { name: string; status: number | null; message: string } {
    if (!(error instanceof Error)) {
      return { name: 'UnknownError', status: null, message: 'The request failed without a readable error object.' };
    }

    const apiError = error as Error & { status?: unknown };
    return {
      name: error.name || 'Error',
      status: typeof apiError.status === 'number' ? apiError.status : null,
      message: this.redactPotentialSecrets(error.message)
    };
  }

  async testConnection(): Promise<void> {
    const ai = this.createClient();
    await ai.models.generateContent({
      model: this.model,
      contents: 'Reply with the single word: connected.',
      config: { maxOutputTokens: 10 }
    });
  }

  async analyze(context: PromptContext, action: AnalysisAction): Promise<PromptAnalysisResult> {
    const ai = this.createClient();
    const response = await ai.models.generateContent({
      model: this.model,
      contents: this.buildRequest(context, action),
      config: {
        responseMimeType: 'application/json',
        responseJsonSchema: ANALYSIS_SCHEMA
      }
    });

    return this.parseResult(response.text);
  }

  private createClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Add a Gemini API key in Settings before running an analysis.');
    }

    return new GoogleGenAI({ apiKey });
  }

  private getApiKey(): string {
    return this.sessionApiKey || environment.gemini.apiKey.trim();
  }

  private redactPotentialSecrets(message: string): string {
    return message
      .replace(/([?&](?:key|apiKey)=)[^&\s]+/gi, '$1[REDACTED]')
      .replace(/AIza[\w-]+|AQ\.[\w-]+/g, '[REDACTED_API_KEY]');
  }

  private buildRequest(context: PromptContext, action: AnalysisAction): string {
    const purpose = action === 'analyze'
      ? 'Analyze the original coding prompt and also produce an improved standalone version.'
      : action === 'optimize'
        ? 'Prioritize producing a precise, complete standalone optimized coding-agent prompt, while also reporting its gaps.'
        : 'Reevaluate the supplied revised prompt against the ticket and context. Explain remaining gaps and produce a refined standalone version.';

    return `You are PromptPilot AI, a careful prompt-review assistant for software delivery. ${purpose}

Use only the supplied information. Treat architecture facts as confirmed only when explicitly supplied. Label anything else as a potential risk or clarification need; do not invent files, APIs, components, tests, or implementation details.

Score is an AI-generated heuristic (0-100), not proof of correctness. The optimizedPrompt must be ready to paste into a coding agent. It must tell the agent to inspect existing implementation, follow and reuse established patterns, avoid unrelated refactors, implement rather than merely explain, consider regressions/compatibility, run relevant available checks, and truthfully report changed files, assumptions, limitations, and test results.

Return JSON exactly matching the requested schema. Use empty arrays when an area has no supported findings. Keep statements specific to the supplied text.

--- CURRENT PROMPT ---
${context.originalPrompt}

--- RELATED TICKET / REQUIREMENT ---
${context.ticket}

--- PROJECT CONTEXT (may be empty) ---
${context.projectContext || '(not supplied)'}

--- DEVELOPER PERSPECTIVE / INSTRUCTIONS (may be empty) ---
${context.developerInstructions || '(not supplied)'}

--- EDGE CASES / BREAKING AREAS (may be empty) ---
${context.edgeCases || '(not supplied)'}`;
  }

  private parseResult(responseText: string | undefined): PromptAnalysisResult {
    if (!responseText) {
      throw new Error('Gemini returned an empty response. Try again or verify your model access.');
    }

    const rawJson = responseText.replace(/^```json\s*/i, '').replace(/\s*```$/, '').trim();
    let parsed: unknown;

    try {
      parsed = JSON.parse(rawJson);
    } catch {
      throw new Error('Gemini returned an unreadable structured result. No analysis was saved. Please try again.');
    }

    if (!this.isAnalysisResult(parsed)) {
      throw new Error('Gemini returned an incomplete analysis. No analysis was saved. Please try again.');
    }

    return parsed;
  }

  private isAnalysisResult(value: unknown): value is PromptAnalysisResult {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const result = value as Partial<PromptAnalysisResult>;
    const textArrays = [
      result.strengths, result.missingRequirements, result.ambiguities, result.edgeCases,
      result.projectPatternGuidance, result.clarifyingQuestions, result.verificationChecklist
    ];
    const hasTextArrays = textArrays.every((items) => Array.isArray(items) && items.every((item) => typeof item === 'string'));
    const validIssues = Array.isArray(result.issues) && result.issues.every((issue) =>
      typeof issue?.title === 'string' && ['critical', 'high', 'medium', 'low'].includes(issue.severity) &&
      typeof issue.explanation === 'string' && typeof issue.suggestion === 'string');
    const validRisks = Array.isArray(result.breakingRisks) && result.breakingRisks.every((risk) =>
      typeof risk?.title === 'string' && typeof risk.reason === 'string');

    return typeof result.summary === 'string' && typeof result.overallScore === 'number' &&
      result.overallScore >= 0 && result.overallScore <= 100 && typeof result.optimizedPrompt === 'string' &&
      hasTextArrays && validIssues && validRisks;
  }
}
