import { Injectable } from '@angular/core';
import { AnalysisAction, PromptAnalysisResult, PromptContext, SavedAnalysis } from '../models/prompt-analysis.model';
import { GeminiService } from './gemini.service';
import { StorageService } from './storage.service';

@Injectable({ providedIn: 'root' })
export class PromptAnalysisService {
  constructor(private readonly gemini: GeminiService, private readonly storage: StorageService) {}

  async run(context: PromptContext, action: AnalysisAction, previousScore?: number): Promise<SavedAnalysis> {
    const normalizedContext = this.normalizeContext(context);
    const result = await this.gemini.analyze(normalizedContext, action);
    const now = new Date().toISOString();
    const savedAnalysis: SavedAnalysis = {
      id: this.createId(),
      title: normalizedContext.title || this.createTitle(normalizedContext.ticket),
      createdAt: now,
      updatedAt: now,
      action,
      status: 'complete',
      input: { ...normalizedContext, optimizedPrompt: result.optimizedPrompt },
      result,
      previousScore
    };

    this.storage.save(savedAnalysis);
    return savedAnalysis;
  }

  private normalizeContext(context: PromptContext): PromptContext {
    return {
      title: context.title.trim(),
      originalPrompt: context.originalPrompt.trim(),
      ticket: context.ticket.trim(),
      projectContext: context.projectContext.trim(),
      developerInstructions: context.developerInstructions.trim(),
      edgeCases: context.edgeCases.trim(),
      optimizedPrompt: context.optimizedPrompt?.trim()
    };
  }

  private createTitle(ticket: string): string {
    const firstLine = ticket.split('\n').find((line) => line.trim()) || 'Untitled prompt analysis';
    return firstLine.trim().slice(0, 72);
  }

  private createId(): string {
    return `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
