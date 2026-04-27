import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NodePortComponent } from './node-port.component';
import { NodeView, PortRef, NODE_HEIGHT, NODE_WIDTH } from '../models/graph.models';
import { StepType } from '../../../models/workflow.models';

interface ValidationBadge {
  severity: 'error' | 'warning' | 'ok';
  message?: string;
}

@Component({
  selector: 'app-workflow-node',
  standalone: true,
  imports: [CommonModule, NodePortComponent],
  templateUrl: './workflow-node.component.html',
  styleUrl: './workflow-node.component.scss'
})
export class WorkflowNodeComponent {
  @Input({ required: true }) node!: NodeView;
  @Input() selected = false;
  @Input() validation: ValidationBadge = { severity: 'ok' };
  @Input() outgoingDefault = false;
  @Input() outgoingOptionIndices: number[] = [];

  @Output() nodeMouseDown = new EventEmitter<MouseEvent>();
  @Output() nodeClick = new EventEmitter<void>();
  @Output() portMouseDown = new EventEmitter<{ event: MouseEvent; ref: PortRef }>();
  @Output() portMouseUp = new EventEmitter<{ event: MouseEvent; ref: PortRef }>();

  readonly width = NODE_WIDTH;
  readonly height = NODE_HEIGHT;

  StepType = StepType;

  get title(): string {
    if (this.node.kind === 'start') return 'Trigger';
    if (this.node.kind === 'end') return 'End / Fallback to AI';
    return this.node.data?.name || this.node.id;
  }

  get subtitle(): string {
    if (this.node.kind === 'start') {
      return this.node.trigger?.type ? `Trigger: ${this.node.trigger.type}` : 'Workflow Start';
    }
    if (this.node.kind === 'end') {
      return 'Returns to AI fallback';
    }
    return this.node.type ? this.stepTypeLabel(this.node.type) : '';
  }

  get icon(): string {
    if (this.node.kind === 'start') return 'play_circle';
    if (this.node.kind === 'end') return 'stop_circle';
    switch (this.node.type) {
      case StepType.MESSAGE: return 'chat_bubble';
      case StepType.CHOICE: return 'rule';
      case StepType.INPUT: return 'edit';
      case StepType.CONDITION: return 'alt_route';
      case StepType.ACTION: return 'bolt';
      default: return 'circle';
    }
  }

  get accent(): string {
    if (this.node.kind === 'start') return 'start';
    if (this.node.kind === 'end') return 'end';
    return this.node.type ?? 'step';
  }

  get options() {
    return this.node.data?.options ?? [];
  }

  get hasInputPort(): boolean {
    return this.node.kind !== 'start';
  }

  get hasDefaultOutPort(): boolean {
    if (this.node.kind === 'end') return false;
    if (this.node.kind === 'start') return true;
    return this.node.type !== StepType.CHOICE;
  }

  optionConnected(index: number): boolean {
    return this.outgoingOptionIndices.includes(index);
  }

  private stepTypeLabel(type: StepType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  onMouseDown(event: MouseEvent): void {
    this.nodeMouseDown.emit(event);
  }

  onClick(event: MouseEvent): void {
    event.stopPropagation();
    this.nodeClick.emit();
  }

  forwardPortMouseDown(payload: { event: MouseEvent; ref: PortRef }): void {
    this.portMouseDown.emit(payload);
  }

  forwardPortMouseUp(payload: { event: MouseEvent; ref: PortRef }): void {
    this.portMouseUp.emit(payload);
  }
}
