import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: '[app-workflow-edge]',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './workflow-edge.component.html',
  styleUrl: './workflow-edge.component.scss'
})
export class WorkflowEdgeComponent {
  @Input({ required: true }) edgeId!: string;
  @Input({ required: true }) x1!: number;
  @Input({ required: true }) y1!: number;
  @Input({ required: true }) x2!: number;
  @Input({ required: true }) y2!: number;
  @Input() draft = false;
  @Input() highlighted = false;
  @Input() severity: 'ok' | 'warning' | 'error' = 'ok';

  @Output() edgeClick = new EventEmitter<MouseEvent>();

  get path(): string {
    const dx = Math.max(60, Math.abs(this.x2 - this.x1) * 0.5);
    const c1x = this.x1 + dx;
    const c1y = this.y1;
    const c2x = this.x2 - dx;
    const c2y = this.y2;
    return `M ${this.x1} ${this.y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${this.x2} ${this.y2}`;
  }

  onClick(event: MouseEvent): void {
    if (this.draft) return;
    event.stopPropagation();
    this.edgeClick.emit(event);
  }
}
