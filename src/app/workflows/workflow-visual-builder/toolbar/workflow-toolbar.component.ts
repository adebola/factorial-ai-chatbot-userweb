import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-workflow-toolbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './workflow-toolbar.component.html',
  styleUrl: './workflow-toolbar.component.scss'
})
export class WorkflowToolbarComponent {
  @Input() workflowName = '';
  @Input() workflowId: string | null = null;
  @Input() dirty = false;
  @Input() saving = false;
  @Input() statusMessage = '';
  @Input() statusKind: 'info' | 'success' | 'error' = 'info';

  @Output() saveRequested = new EventEmitter<void>();
  @Output() fitRequested = new EventEmitter<void>();
  @Output() autoLayoutRequested = new EventEmitter<void>();
}
