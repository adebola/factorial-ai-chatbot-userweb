import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StepType } from '../../../models/workflow.models';

interface PaletteItem {
  type: StepType;
  label: string;
  icon: string;
  description: string;
  accent: string;
}

@Component({
  selector: 'app-node-palette',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './node-palette.component.html',
  styleUrl: './node-palette.component.scss'
})
export class NodePaletteComponent {
  readonly items: PaletteItem[] = [
    { type: StepType.MESSAGE, label: 'Message', icon: 'chat_bubble', description: 'Send a message to the user', accent: 'message' },
    { type: StepType.CHOICE, label: 'Choice', icon: 'rule', description: 'Branch on user choice', accent: 'choice' },
    { type: StepType.INPUT, label: 'Input', icon: 'edit', description: 'Capture user input', accent: 'input' },
    { type: StepType.CONDITION, label: 'Condition', icon: 'alt_route', description: 'Branch on a condition', accent: 'condition' },
    { type: StepType.ACTION, label: 'Action', icon: 'bolt', description: 'Run a system action', accent: 'action' }
  ];

  onDragStart(event: DragEvent, item: PaletteItem): void {
    if (!event.dataTransfer) return;
    event.dataTransfer.setData('application/x-workflow-step-type', item.type);
    event.dataTransfer.effectAllowed = 'copy';
  }
}
