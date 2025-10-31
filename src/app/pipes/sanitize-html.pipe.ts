import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'sanitizeHtml',
  standalone: true
})
export class SanitizeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(html: string): SafeHtml {
    // Sanitize the HTML to prevent XSS attacks
    return this.sanitizer.sanitize(1, html) || '';  // 1 = SecurityContext.HTML
  }
}
