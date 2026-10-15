import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisAction, SavedAnalysis } from '../../core/models/prompt-analysis.model';
import { StorageService } from '../../core/services/storage.service';

type SortOrder = 'newest' | 'oldest';
type ActionFilter = 'all' | AnalysisAction;

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  entries: SavedAnalysis[] = [];
  search = '';
  actionFilter: ActionFilter = 'all';
  sortOrder: SortOrder = 'newest';
  feedback = '';

  constructor(private readonly storage: StorageService, private readonly router: Router) {}

  ngOnInit(): void {
    this.loadEntries();
  }

  get filteredEntries(): SavedAnalysis[] {
    const searchTerm = this.search.trim().toLocaleLowerCase();
    const matchingEntries = this.entries.filter((entry) => this.matches(entry, searchTerm));
    return matchingEntries.sort((first, second) => this.sortEntries(first, second));
  }

  open(entry: SavedAnalysis): void {
    this.storage.setActiveAnalysis(entry);
    this.router.navigate(['/workspace']);
  }

  duplicate(entry: SavedAnalysis): void {
    this.storage.setDraft({ ...entry.input, title: `${entry.title} (copy)`, optimizedPrompt: entry.result.optimizedPrompt });
    this.router.navigate(['/workspace']);
  }

  rename(entry: SavedAnalysis): void {
    const newTitle = window.prompt('Rename this analysis', entry.title);
    if (!newTitle?.trim()) {
      return;
    }

    if (this.storage.rename(entry.id, newTitle)) {
      this.loadEntries();
      this.feedback = 'Analysis renamed.';
    }
  }

  remove(entry: SavedAnalysis): void {
    if (!window.confirm(`Delete “${entry.title}” from this browser's history? This cannot be undone.`)) {
      return;
    }

    this.storage.delete(entry.id);
    this.loadEntries();
    this.feedback = 'Analysis deleted.';
  }

  actionLabel(action: AnalysisAction): string {
    return action === 'analyze' ? 'Analyzed' : action === 'optimize' ? 'Optimized' : 'Reevaluated';
  }

  private loadEntries(): void {
    this.entries = this.storage.getHistory();
  }

  private matches(entry: SavedAnalysis, searchTerm: string): boolean {
    const matchesSearch = !searchTerm || `${entry.title} ${entry.input.originalPrompt} ${entry.input.ticket}`.toLocaleLowerCase().includes(searchTerm);
    const matchesAction = this.actionFilter === 'all' || entry.action === this.actionFilter;
    return matchesSearch && matchesAction;
  }

  private sortEntries(first: SavedAnalysis, second: SavedAnalysis): number {
    const comparison = first.updatedAt.localeCompare(second.updatedAt);
    return this.sortOrder === 'newest' ? -comparison : comparison;
  }
}
