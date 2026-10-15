import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { GeminiService } from '../../core/services/gemini.service';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent {
  readonly form = this.formBuilder.group({ apiKey: ['', [Validators.minLength(10)]] });
  statusMessage = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  testing = false;

  constructor(
    private readonly formBuilder: FormBuilder,
    public readonly gemini: GeminiService,
    private readonly storage: StorageService
  ) {}

  saveSessionKey(): void {
    const key = this.form.controls.apiKey.value?.trim() || '';
    if (!key || this.form.invalid) {
      this.setStatus('Enter a valid Gemini API key first.', 'error');
      return;
    }

    this.gemini.setSessionApiKey(key);
    this.form.controls.apiKey.reset('');
    this.setStatus('Session key configured. It is kept in memory only and will be lost on refresh.', 'success');
  }

  async testConnection(): Promise<void> {
    if (!this.gemini.hasApiKey()) {
      this.setStatus('Enter and apply an API key before testing the connection.', 'error');
      return;
    }

    this.testing = true;
    this.setStatus(`Testing access to ${this.gemini.model}…`, 'info');
    try {
      await this.gemini.testConnection();
      this.setStatus(`Connected to ${this.gemini.model}.`, 'success');
    } catch (error) {
      console.error('[PromptPilot] Gemini connection test failed.', this.gemini.getSafeErrorDiagnostic(error));
      const message = error instanceof Error ? error.message : 'Connection test failed.';
      this.setStatus(this.connectionError(message), 'error');
    } finally {
      this.testing = false;
    }
  }

  clearSessionKey(): void {
    this.gemini.clearSessionApiKey();
    this.form.controls.apiKey.reset('');
    this.setStatus('Session key cleared.', 'info');
  }

  clearHistory(): void {
    if (!window.confirm('Delete all saved analyses from this browser? This cannot be undone.')) {
      return;
    }

    this.storage.clearHistory();
    this.setStatus('Local prompt history cleared. API key state was not changed.', 'success');
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusType = type;
  }

  private connectionError(message: string): string {
    if (/401|403|api key|authentication/i.test(message)) {
      return 'Gemini rejected the API key or it does not have access to the selected model.';
    }
    if (/429|quota|rate/i.test(message)) {
      return 'Gemini quota or rate limit reached. Please try again later.';
    }
    return 'Could not connect to Gemini. Check your network, key, and model access, then try again.';
  }
}
