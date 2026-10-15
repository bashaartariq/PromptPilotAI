import { Component, OnInit } from '@angular/core';
import { DashboardStats, SavedAnalysis } from '../../core/models/prompt-analysis.model';
import { StorageService } from '../../core/services/storage.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats = { totalAnalyzed: 0, totalOptimized: 0, savedCount: 0 };
  recent: SavedAnalysis[] = [];

  constructor(private readonly storage: StorageService) {}

  ngOnInit(): void {
    const history = this.storage.getHistory();
    this.stats = this.storage.getStats();
    this.recent = history.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)).slice(0, 4);
  }

  open(analysis: SavedAnalysis): void {
    this.storage.setActiveAnalysis(analysis);
  }
}
