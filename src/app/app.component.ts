import { Component } from '@angular/core';
import { GeminiService } from './core/services/gemini.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public readonly gemini: GeminiService) {}
}
