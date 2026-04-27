import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime } from 'rxjs';
import { WorkflowGraphStore } from '../services/workflow-graph.store';
import { WorkflowStepEditorComponent } from '../../workflow-create/workflow-step-editor/workflow-step-editor.component';
import { NodeView } from '../models/graph.models';
import { StepType, WorkflowStep } from '../../../models/workflow.models';

@Component({
  selector: 'app-node-inspector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, WorkflowStepEditorComponent],
  templateUrl: './node-inspector.component.html',
  styleUrl: './node-inspector.component.scss'
})
export class NodeInspectorComponent implements OnDestroy {
  selected: NodeView | null = null;
  stepForm: FormGroup | null = null;

  readonly stepTypes = [
    { value: StepType.MESSAGE, label: 'Message', icon: 'chat_bubble' },
    { value: StepType.CHOICE, label: 'Choice', icon: 'rule' },
    { value: StepType.INPUT, label: 'Input', icon: 'edit' },
    { value: StepType.CONDITION, label: 'Condition', icon: 'alt_route' },
    { value: StepType.ACTION, label: 'Action', icon: 'bolt' }
  ];

  private destroy$ = new Subject<void>();
  private formSubs = new Subject<void>();
  private currentNodeId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private store: WorkflowGraphStore,
    private cdr: ChangeDetectorRef
  ) {
    this.store.selectSelected().pipe(takeUntil(this.destroy$)).subscribe((node) => {
      this.onSelectionChange(node);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.formSubs.next();
    this.formSubs.complete();
  }

  private onSelectionChange(node: NodeView | null): void {
    if (!node || node.kind !== 'step' || !node.data) {
      this.tearDownForm();
      this.selected = node;
      this.cdr.markForCheck();
      return;
    }

    if (this.currentNodeId === node.id && this.stepForm) {
      this.selected = node;
      this.cdr.markForCheck();
      return;
    }

    this.tearDownForm();
    this.selected = node;
    this.currentNodeId = node.id;
    this.stepForm = this.buildStepForm(node.data);

    this.stepForm.valueChanges
      .pipe(takeUntil(this.formSubs), debounceTime(50))
      .subscribe((value) => {
        const flat = this.flattenStep(value);
        this.store.replaceStepData(node.id, flat);
      });

    this.cdr.markForCheck();
  }

  private tearDownForm(): void {
    this.formSubs.next();
    this.stepForm = null;
    this.currentNodeId = null;
  }

  private buildStepForm(step: WorkflowStep): FormGroup {
    const optionsArray = this.fb.array(
      (step.options ?? []).map((opt) => this.fb.group({
        text: [opt.text || ''],
        value: [opt.value || ''],
        next_step: [opt.next_step || '']
      }))
    );

    let actionValue: any = step.action ?? '';
    if (step.type === StepType.ACTION && typeof step.action === 'string') {
      actionValue = { type: step.action, params: step.params ?? {} };
    }

    return this.fb.group({
      id: [step.id, Validators.required],
      type: [step.type, Validators.required],
      name: [step.name || ''],
      content: [step.content || ''],
      condition: [step.condition || ''],
      options: optionsArray,
      variable: [step.variable || ''],
      action: [actionValue],
      next_step: [step.next_step || ''],
      metadata: [step.metadata || {}]
    });
  }

  private flattenStep(formValue: any): WorkflowStep {
    if (formValue.type === StepType.ACTION && formValue.action && typeof formValue.action === 'object') {
      const params = { ...(formValue.action.params ?? {}) };

      if (Array.isArray(params.body)) {
        const bodyObj: Record<string, any> = {};
        params.body.forEach((pair: { key: string; value: string }) => {
          if (pair.key?.trim()) bodyObj[pair.key.trim()] = pair.value;
        });
        params.body = bodyObj;
      }

      if (Array.isArray(params.headers)) {
        const headersObj: Record<string, any> = {};
        params.headers.forEach((pair: { key: string; value: string }) => {
          if (pair.key?.trim()) headersObj[pair.key.trim()] = pair.value;
        });
        params.headers = headersObj;
      }

      return {
        id: formValue.id,
        type: formValue.type,
        name: formValue.name,
        action: formValue.action.type,
        params,
        next_step: formValue.next_step,
        metadata: formValue.metadata
      };
    }

    return {
      id: formValue.id,
      type: formValue.type,
      name: formValue.name,
      content: formValue.content,
      condition: formValue.condition,
      options: formValue.options,
      variable: formValue.variable,
      action: formValue.action,
      params: formValue.params,
      next_step: formValue.next_step,
      metadata: formValue.metadata
    };
  }

  triggerType(): string {
    return this.selected?.trigger?.type ?? '';
  }
}
