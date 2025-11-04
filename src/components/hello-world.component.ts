import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'HelloWorldComponent',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-8 text-center">
      <h1 class="text-4xl font-bold text-blue-600 mb-4">Hello World!</h1>
      <p class="text-lg text-gray-600">To jest prosty komponent Angular w Astro</p>
    </div>
  `,
})
export class HelloWorldComponent {
}
