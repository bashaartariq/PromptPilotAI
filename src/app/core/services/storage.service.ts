import { Injectable } from '@angular/core';
import { DashboardStats, PromptContext, SavedAnalysis } from '../models/prompt-analysis.model';

const HISTORY_KEY = 'promptpilot.history.v1';
const ACTIVE_ANALYSIS_KEY = 'promptpilot.active-analysis.v1';
const DRAFT_KEY = 'promptpilot.draft.v1';

@Injectable({ providedIn: 'root' })
export class StorageService {
  getHistory(): SavedAnalysis[] {
    const parsed = this.readJson<unknown>(HISTORY_KEY, []);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is SavedAnalysis => this.isSavedAnalysis(entry));
  }

  save(analysis: SavedAnalysis): void {
    const history = this.getHistory();
    const existingIndex = history.findIndex((item) => item.id === analysis.id);

    if (existingIndex >= 0) {
      history[existingIndex] = analysis;
    } else {
      history.unshift(analysis);
    }

    this.writeJson(HISTORY_KEY, history);
  }

  rename(id: string, title: string): boolean {
    const history = this.getHistory();
    const entry = history.find((item) => item.id === id);

    if (!entry) {
      return false;
    }

    entry.title = title.trim();
    entry.updatedAt = new Date().toISOString();
    this.writeJson(HISTORY_KEY, history);
    return true;
  }

  delete(id: string): void {
    const updatedHistory = this.getHistory().filter((item) => item.id !== id);
    this.writeJson(HISTORY_KEY, updatedHistory);
  }

  clearHistory(): void {
    this.remove(HISTORY_KEY);
    this.remove(ACTIVE_ANALYSIS_KEY);
    this.remove(DRAFT_KEY);
  }

  getStats(): DashboardStats {
    const history = this.getHistory();
    return {
      totalAnalyzed: history.length,
      totalOptimized: history.filter((item) => Boolean(item.result.optimizedPrompt)).length,
      savedCount: history.length
    };
  }

  setActiveAnalysis(analysis: SavedAnalysis): void {
    this.writeJson(ACTIVE_ANALYSIS_KEY, analysis);
  }

  consumeActiveAnalysis(): SavedAnalysis | null {
    const item = this.readJson<unknown>(ACTIVE_ANALYSIS_KEY, null);
    this.remove(ACTIVE_ANALYSIS_KEY);
    return this.isSavedAnalysis(item) ? item : null;
  }

  setDraft(context: PromptContext): void {
    this.writeJson(DRAFT_KEY, context);
  }

  consumeDraft(): PromptContext | null {
    const item = this.readJson<unknown>(DRAFT_KEY, null);
    this.remove(DRAFT_KEY);
    return this.isPromptContext(item) ? item : null;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable or full. The current screen remains usable.
    }
  }

  private remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore unavailable browser storage.
    }
  }

  private isSavedAnalysis(value: unknown): value is SavedAnalysis {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const entry = value as Partial<SavedAnalysis>;
    return typeof entry.id === 'string' && typeof entry.title === 'string' &&
      typeof entry.createdAt === 'string' && typeof entry.updatedAt === 'string' &&
      entry.status === 'complete' && this.isPromptContext(entry.input) && this.isResult(entry.result);
  }

  private isPromptContext(value: unknown): value is PromptContext {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const context = value as Partial<PromptContext>;
    return typeof context.title === 'string' && typeof context.originalPrompt === 'string' &&
      typeof context.ticket === 'string' && typeof context.projectContext === 'string' &&
      typeof context.developerInstructions === 'string' && typeof context.edgeCases === 'string';
  }

  private isResult(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const result = value as Partial<SavedAnalysis['result']>;
    return typeof result.summary === 'string' && typeof result.overallScore === 'number' &&
      Array.isArray(result.issues) && typeof result.optimizedPrompt === 'string';
  }
}
