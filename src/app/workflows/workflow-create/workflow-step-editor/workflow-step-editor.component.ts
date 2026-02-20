import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormArray, FormBuilder, AbstractControl } from '@angular/forms';
import { StepType, FALLBACK_TO_AI_SENTINEL } from '../../../models/workflow.models';

@Component({
  selector: 'app-workflow-step-editor',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './workflow-step-editor.component.html',
  styleUrl: './workflow-step-editor.component.scss'
})
export class WorkflowStepEditorComponent implements OnInit {
  @Input() stepForm!: AbstractControl;
  @Input() stepTypes: any[] = [];
  @Input() availableSteps: AbstractControl[] = [];

  StepType = StepType;

  actionTypes = [
    { value: 'log', label: 'Log', description: 'Log information for debugging' },
    { value: 'send_email', label: 'Send Email', description: 'Send an email notification' },
    { value: 'api_call', label: 'API Call', description: 'Make an outbound POST request to an external API' }
  ];

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.onStepTypeChange();
  }

  get formGroup(): FormGroup {
    return this.stepForm as FormGroup;
  }

  get stepType(): string {
    return this.formGroup.get('type')?.value || '';
  }

  get optionsArray(): FormArray {
    let options = this.formGroup.get('options') as FormArray;
    if (!options) {
      options = this.fb.array([]);
      this.formGroup.setControl('options', options);
    }
    return options;
  }

  onStepTypeChange(): void {
    const stepType = this.stepType;

    // Initialize step-specific fields based on type
    switch (stepType) {
      case StepType.CHOICE:
        this.ensureOptionsArray();
        break;
      case StepType.ACTION:
        this.ensureActionFields();
        break;
    }
  }

  // Choice Step Methods
  ensureOptionsArray(): void {
    const options = this.optionsArray;
    if (options.length === 0) {
      this.addOption();
    }
  }

  addOption(): void {
    const option = this.fb.group({
      text: [''],
      value: [''],
      next_step: ['']
    });
    this.optionsArray.push(option);
  }

  removeOption(index: number): void {
    this.optionsArray.removeAt(index);
  }

  // Action Step Methods
  ensureActionFields(): void {
    const existingAction = this.formGroup.get('action');
    let existingData: any = null;

    // Preserve existing data if action control exists (e.g., loaded from backend)
    if (existingAction) {
      existingData = existingAction.value;
    }

    // If action is not a FormGroup, recreate it with proper structure
    if (!existingAction || !(existingAction instanceof FormGroup)) {
      // Remove the simple control if it exists
      if (existingAction) {
        this.formGroup.removeControl('action');
      }

      // Create FormGroup structure, preserving loaded action type
      this.formGroup.addControl('action', this.fb.group({
        type: [existingData?.type || 'log'],
        params: this.fb.group({})
      }));

      // Initialize params controls based on action type
      this.onActionTypeChange();

      // Restore loaded params data after controls are created
      if (existingData?.params) {
        const paramsGroup = this.actionParamsGroup;
        Object.keys(existingData.params).forEach(key => {
          const control = paramsGroup.get(key);
          if (control) {
            control.setValue(existingData.params[key]);
          }
        });
      }
    }
  }

  get actionGroup(): FormGroup {
    return this.formGroup.get('action') as FormGroup;
  }

  get actionParamsGroup(): FormGroup {
    return this.actionGroup.get('params') as FormGroup;
  }

  onActionTypeChange(): void {
    const actionType = this.actionGroup.get('type')?.value;
    const paramsGroup = this.actionParamsGroup;

    // Clear existing params
    Object.keys(paramsGroup.controls).forEach(key => {
      paramsGroup.removeControl(key);
    });

    // Add action-specific params
    switch (actionType) {
      case 'log':
        paramsGroup.addControl('message', this.fb.control(''));
        paramsGroup.addControl('level', this.fb.control('info'));
        break;
      case 'send_email':
        paramsGroup.addControl('to', this.fb.control(''));
        paramsGroup.addControl('subject', this.fb.control(''));
        paramsGroup.addControl('content', this.fb.control(''));
        break;
      case 'api_call':
        paramsGroup.addControl('url', this.fb.control(''));
        paramsGroup.addControl('body', this.fb.control('{}'));
        paramsGroup.addControl('headers', this.fb.control('{}'));
        break;
    }
  }

  // Delay Step Methods
  // TODO: Restore this when DELAY step type is re-enabled
  ensureDelayFields(): void {
    const existingDelay = this.formGroup.get('delay');

    // If delay exists as a simple control or doesn't exist as FormGroup, replace it
    if (!existingDelay || !(existingDelay instanceof FormGroup)) {
      // Remove the simple control if it exists
      if (existingDelay) {
        this.formGroup.removeControl('delay');
      }

      // Add the FormGroup structure
      this.formGroup.addControl('delay', this.fb.group({
        duration: [30],
        unit: ['seconds']
      }));
    }
  }

  get delayGroup(): FormGroup {
    return this.formGroup.get('delay') as FormGroup;
  }

  // Utility Methods
  getAvailableStepOptions(): any[] {
    const currentStepId = this.formGroup.get('id')?.value;

    const steps = this.availableSteps.map((step, index) => ({
      value: step.get('id')?.value,
      label: step.get('name')?.value || `Step ${index + 1}`,
      stepIndex: index
    }))
    .filter(option => {
      // Filter out empty values
      if (!option.value) return false;

      // Filter out the current step to avoid infinite loops
      if (option.value === currentStepId) return false;

      // Filter out the first step (Welcome Message/greeting - index 0)
      if (option.stepIndex === 0) return false;

      return true;
    });

    // Add the sentinel option at the end
    steps.push({
      value: FALLBACK_TO_AI_SENTINEL,
      label: '\u21A9 End & Return to AI',
      stepIndex: -1
    });

    return steps;
  }

  getActionParamKeys(): string[] {
    return Object.keys(this.actionParamsGroup.controls);
  }

  isFieldRequired(stepType: string, fieldName: string): boolean {
    const requiredFields: Record<string, string[]> = {
      [StepType.MESSAGE]: ['content'],
      [StepType.CHOICE]: ['content', 'variable', 'options'],
      [StepType.INPUT]: ['content', 'variable'],
      [StepType.CONDITION]: ['condition', 'next_step'],
      [StepType.ACTION]: ['action']
    };

    return requiredFields[stepType]?.includes(fieldName) || false;
  }

  hasValidation(fieldPath: string): boolean {
    const control = this.formGroup.get(fieldPath);
    return !!(control?.invalid && control?.touched);
  }

  getValidationMessage(fieldPath: string): string {
    const control = this.formGroup.get(fieldPath);
    if (control?.errors) {
      if (control.errors['required']) return 'This field is required';
      if (control.errors['minlength']) return 'Value is too short';
      if (control.errors['pattern']) return 'Invalid format';
    }
    return '';
  }

  getStepTypeIcon(): string {
    const stepTypeConfig = this.stepTypes.find(t => t.value === this.stepType);
    return stepTypeConfig?.icon || 'help';
  }

  getStepTypeLabel(): string {
    const stepTypeConfig = this.stepTypes.find(t => t.value === this.stepType);
    return stepTypeConfig?.label || 'Unknown';
  }
}