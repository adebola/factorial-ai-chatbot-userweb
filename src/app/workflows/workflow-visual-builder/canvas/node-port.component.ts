import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EdgePortKind, PortRef } from '../models/graph.models';

@Component({
  selector: 'app-node-port',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './node-port.component.html',
  styleUrl: './node-port.component.scss'
})
export class NodePortComponent {
  @Input() nodeId!: string;
  @Input() side: 'in' | 'out' = 'out';
  @Input() portKind: EdgePortKind = 'default';
  @Input() optionIndex?: number;
  @Input() label?: string;
  @Input() connected = false;

  @Output() portMouseDown = new EventEmitter<{ event: MouseEvent; ref: PortRef }>();
  @Output() portMouseUp = new EventEmitter<{ event: MouseEvent; ref: PortRef }>();

  onMouseDown(event: MouseEvent): void {
    if (this.side !== 'out') return;
    event.stopPropagation();
    event.preventDefault();
    this.portMouseDown.emit({
      event,
      ref: { nodeId: this.nodeId, kind: this.portKind, optionIndex: this.optionIndex }
    });
  }

  onMouseUp(event: MouseEvent): void {
    if (this.side !== 'in') return;
    event.stopPropagation();
    this.portMouseUp.emit({
      event,
      ref: { nodeId: this.nodeId, kind: this.portKind, optionIndex: this.optionIndex }
    });
  }
}
