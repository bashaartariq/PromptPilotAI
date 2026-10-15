import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Clipboard, Copy, Download, FileText,
  History, LayoutDashboard, Lightbulb, Loader2, Plus, Save, Settings, ShieldAlert,
  Sparkles, Trash2, WandSparkles
} from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HistoryComponent } from './pages/history/history.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { WorkspaceComponent } from './pages/workspace/workspace.component';

@NgModule({
  declarations: [
    AppComponent,
    DashboardComponent,
    WorkspaceComponent,
    HistoryComponent,
    SettingsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    LucideAngularModule.pick({
      AlertTriangle, CheckCircle2, ChevronRight, Clipboard, Copy, Download, FileText,
      History, LayoutDashboard, Lightbulb, Loader2, Plus, Save, Settings, ShieldAlert,
      Sparkles, Trash2, WandSparkles
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
