import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { AnalysisAction, PromptAnalysisResult, PromptContext } from '../../core/models/prompt-analysis.model';
import { GeminiService } from '../../core/services/gemini.service';
import { PromptAnalysisService } from '../../core/services/prompt-analysis.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrls: ['./workspace.component.scss']
})
export class WorkspaceComponent implements OnInit {
  readonly form = this.formBuilder.group({
    title: [''],
    originalPrompt: ['', [Validators.required, Validators.minLength(20)]],
    ticket: ['', [Validators.required, Validators.minLength(10)]],
    projectContext: [''],
    developerInstructions: [''],
    edgeCases: [''],
    optimizedPrompt: ['']
  });

  result: PromptAnalysisResult | null = null;
  previousScore: number | null = null;
  busy = false;
  feedback = '';
  feedbackType: 'success' | 'error' | 'info' = 'info';

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly promptAnalysis: PromptAnalysisService,
    private readonly gemini: GeminiService,
    private readonly storage: StorageService
  ) {}

  ngOnInit(): void {
    const activeAnalysis = this.storage.consumeActiveAnalysis();
    const draft = this.storage.consumeDraft();

    if (activeAnalysis) {
      this.form.patchValue(activeAnalysis.input);
      this.result = activeAnalysis.result;
      this.previousScore = activeAnalysis.previousScore || null;
      this.setFeedback('Loaded a saved analysis. Edit the context or optimized prompt, then reevaluate when ready.', 'info');
      return;
    }

    if (draft) {
      this.form.patchValue(draft);
      this.setFeedback('A duplicate was loaded as a new draft. Run a new analysis when ready.', 'info');
    }
  }

  get promptLength(): number {
    return (this.form.controls.originalPrompt.value || '').length;
  }

  get canRun(): boolean {
    return this.form.valid && !this.busy;
  }

  fillExample(): void {
    this.form.patchValue({
      title: 'Add invoice status filter',
      originalPrompt: 'Implement the invoice status filter described in the ticket. Update the UI and make sure it works.',
      ticket: 'As a finance user, I need to filter the invoices table by draft, sent, paid, and overdue status so I can find invoices requiring attention. Existing URL query parameters must continue to work.',
      projectContext: 'Angular application using Reactive Forms and existing table filter components. The invoice list receives data from a REST endpoint. Follow the established feature-module and service patterns.',
      developerInstructions: 'Reuse the current filter panel and query-parameter conventions. Do not redesign the invoice table or change the existing API contract.',
      edgeCases: 'No status selected should preserve today\'s default list. Check deep links, pagination reset, empty results, and older bookmarked URLs.'
    });
    this.setFeedback('Example context added. Replace it with your own details before sharing anything sensitive.', 'info');
  }

  clearPrompt(): void {
    this.form.controls.originalPrompt.setValue('');
  }

  async run(action: AnalysisAction): Promise<void> {
    if (this.busy) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.setFeedback('Add both the existing prompt and related ticket before running an analysis.', 'error');
      return;
    }

    if (!this.gemini.hasApiKey()) {
      this.setFeedback('Add a Gemini API key in Settings before running an analysis. The key is never saved in browser history.', 'error');
      return;
    }

    const context = this.createContext(action);
    this.busy = true;
    this.setFeedback(this.busyMessage(action), 'info');

    try {
      const savedAnalysis = await this.promptAnalysis.run(context, action, action === 'reevaluate' ? this.result?.overallScore : undefined);
      this.result = savedAnalysis.result;
      this.previousScore = savedAnalysis.previousScore || null;
      this.form.controls.optimizedPrompt.setValue(savedAnalysis.result.optimizedPrompt);
      this.setFeedback(`Prompt ${this.actionPastTense(action)} and saved to local history.`, 'success');
    } catch (error) {
      console.error('[PromptPilot] Gemini prompt request failed.', this.gemini.getSafeErrorDiagnostic(error));
      this.setFeedback(this.toUserError(error), 'error');
    } finally {
      this.busy = false;
    }
  }

  resetForm(): void {
    if (!window.confirm('Reset this workspace? Unsaved input will be removed. Saved history will not be changed.')) {
      return;
    }

    this.form.reset({
      title: '', originalPrompt: '', ticket: '', projectContext: '', developerInstructions: '', edgeCases: '', optimizedPrompt: ''
    });
    this.result = null;
    this.previousScore = null;
    this.setFeedback('Workspace reset.', 'info');
  }

  async copyOptimizedPrompt(): Promise<void> {
    if (!this.result?.optimizedPrompt) {
      return;
    }

    await this.copyText(this.result.optimizedPrompt);
    this.setFeedback('Optimized prompt copied to your clipboard.', 'success');
  }

  async copyReport(): Promise<void> {
    if (!this.result) {
      return;
    }

    await this.copyText(JSON.stringify(this.result, null, 2));
    this.setFeedback('Analysis report copied to your clipboard.', 'success');
  }

  downloadPrompt(): void {
    if (this.result) {
      this.download('promptpilot-optimized-prompt.txt', this.result.optimizedPrompt, 'text/plain;charset=utf-8');
      this.setFeedback('Optimized prompt downloaded.', 'success');
    }
  }

  exportAnalysis(): void {
    if (this.result) {
      this.download('promptpilot-analysis.json', JSON.stringify(this.result, null, 2), 'application/json');
      this.setFeedback('Analysis JSON exported.', 'success');
    }
  }

  hasItems(items: unknown[] | undefined): boolean {
    return Boolean(items && items.length);
  }

  scoreClass(score: number): string {
    if (score >= 75) {
      return 'score-good';
    }
    if (score >= 50) {
      return 'score-warn';
    }
    return 'score-risk';
  }

  private createContext(action: AnalysisAction): PromptContext {
    const values = this.form.getRawValue();
    const originalPrompt = action === 'reevaluate' && values.optimizedPrompt?.trim()
      ? values.optimizedPrompt
      : values.originalPrompt;

    return {
      title: values.title || '',
      originalPrompt: originalPrompt || '',
      ticket: values.ticket || '',
      projectContext: values.projectContext || '',
      developerInstructions: values.developerInstructions || '',
      edgeCases: values.edgeCases || '',
      optimizedPrompt: values.optimizedPrompt || ''
    };
  }

  private busyMessage(action: AnalysisAction): string {
    return action === 'optimize' ? 'Gemini is drafting a complete optimized prompt…' :
      action === 'reevaluate' ? 'Gemini is comparing the revised prompt against the ticket…' :
      'Gemini is checking coverage, ambiguity, and risks…';
  }

  private actionPastTense(action: AnalysisAction): string {
    return action === 'analyze' ? 'analyzed' : action === 'optimize' ? 'optimized' : 'reevaluated';
  }

  private setFeedback(message: string, type: 'success' | 'error' | 'info'): void {
    this.feedback = message;
    this.feedbackType = type;
  }

  private toUserError(error: unknown): string {
    const message = error instanceof Error ? error.message : 'The request could not be completed.';
    if (/401|403|api key|authentication/i.test(message)) {
      return 'Gemini rejected the API key. Confirm the key and that it has access to the selected model.';
    }
    if (/429|quota|rate/i.test(message)) {
      return 'Gemini quota or rate limit reached. Wait a moment, review your account quota, then try again.';
    }
    if (/network|fetch|offline/i.test(message)) {
      return 'Network request failed. Check your connection and try again.';
    }
    return message;
  }

  private async copyText(value: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }

  private download(fileName: string, contents: string, type: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([contents], { type }));
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
