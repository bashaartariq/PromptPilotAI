import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { History, LayoutDashboard, Settings, ShieldAlert, Sparkles, WandSparkles } from 'lucide-angular';
import { LucideAngularModule } from 'lucide-angular';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        LucideAngularModule.pick({ History, LayoutDashboard, Settings, ShieldAlert, Sparkles, WandSparkles })
      ],
      declarations: [AppComponent]
    }).compileComponents();
  });

  it('creates the application shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders PromptPilot branding and the workspace navigation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('PromptPilot');
    expect(compiled.textContent).toContain('New analysis');
  });
});
