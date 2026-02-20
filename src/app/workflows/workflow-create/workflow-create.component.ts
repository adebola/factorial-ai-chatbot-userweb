import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { WorkflowStepEditorComponent } from './workflow-step-editor/workflow-step-editor.component';
import {
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowResponse,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTrigger,
  TriggerType,
  StepType,
  WorkflowStatus
} from '../../models/workflow.models';

@Component({
  selector: 'app-workflow-create',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, WorkflowStepEditorComponent],
  templateUrl: './workflow-create.component.html',
  styleUrl: './workflow-create.component.scss'
})
export class WorkflowCreateComponent implements OnInit {
  workflowForm: FormGroup;
  isLoading = false;
  isSaving = false;
  isEditing = false;
  workflowId: string | null = null;
  currentWorkflow: WorkflowResponse | null = null;
  errorMessage = '';
  successMessage = '';
  showJsonEditor = false;
  jsonText = '';

  // Form sections expanded/collapsed
  sectionsExpanded = {
    basic: true,
    trigger: true,
    steps: true,
    variables: true,
    settings: false
  };

  // Enums for templates
  triggerTypes = [
    { value: TriggerType.MESSAGE, label: 'Message Keywords', description: 'Triggered by specific words or phrases' },
    { value: TriggerType.INTENT, label: 'Intent Detection', description: 'Triggered by detected user intents' },
    { value: TriggerType.KEYWORD, label: 'Keyword Match', description: 'Triggered by exact keyword matches' }
  ];

  stepTypes = [
    { value: StepType.MESSAGE, label: 'Message', description: 'Send a message to the user', icon: 'chat' },
    { value: StepType.CHOICE, label: 'Choice', description: 'Present options for user to select', icon: 'list' },
    { value: StepType.INPUT, label: 'Input', description: 'Collect text input from user', icon: 'input' },
    { value: StepType.CONDITION, label: 'Condition', description: 'Branch flow based on logic', icon: 'call_split' },
    { value: StepType.ACTION, label: 'Action', description: 'Perform system action', icon: 'play_arrow' }
    // TODO: Restore these step types in future release
    // { value: StepType.SUB_WORKFLOW, label: 'Sub-workflow', description: 'Execute another workflow', icon: 'account_tree' },
    // { value: StepType.DELAY, label: 'Delay', description: 'Wait for specified time', icon: 'schedule' }
  ];

  statusOptions = [
    { value: WorkflowStatus.DRAFT, label: 'Draft' },
    { value: WorkflowStatus.ACTIVE, label: 'Active' },
    { value: WorkflowStatus.INACTIVE, label: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService
  ) {
    this.workflowForm = this.createForm();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.workflowId = params['id'];
        this.isEditing = true;
        this.loadWorkflow();
      } else {
        this.initializeNewWorkflow();
      }
    });
  }

  createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      status: [WorkflowStatus.DRAFT, Validators.required],
      triggerType: [TriggerType.MESSAGE, Validators.required],
      triggerConfig: this.fb.group({
        conditions: this.fb.array([]),
        keywords: this.fb.array([]),
        intent_patterns: this.fb.array([]),
        metadata: [{}]
      }),
      steps: this.fb.array([]),
      variables: this.fb.array([]),
      settings: this.fb.group({
        timeout: [3600],
        retryAttempts: [3],
        enableLogging: [true]
      })
    });
  }

  get stepsFormArray(): FormArray {
    return this.workflowForm.get('steps') as FormArray;
  }

  get variablesFormArray(): FormArray {
    return this.workflowForm.get('variables') as FormArray;
  }

  get triggerConditions(): FormArray {
    return this.workflowForm.get('triggerConfig.conditions') as FormArray;
  }

  get triggerKeywords(): FormArray {
    return this.workflowForm.get('triggerConfig.keywords') as FormArray;
  }

  loadWorkflow(): void {
    if (!this.workflowId) return;

    this.isLoading = true;
    this.workflowService.getWorkflow(this.workflowId).subscribe({
      next: (workflow) => {
        this.currentWorkflow = workflow;
        this.populateForm(workflow);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load workflow';
        this.isLoading = false;
        console.error('Load workflow error:', error);
      }
    });
  }

  populateForm(workflow: WorkflowResponse): void {
    this.workflowForm.patchValue({
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      triggerType: workflow.trigger_type
    });

    // Populate steps
    this.clearFormArray(this.stepsFormArray);
    workflow.definition.steps.forEach(step => {
      this.addStep(step);
    });

    // Populate variables
    this.clearFormArray(this.variablesFormArray);
    if (workflow.definition.variables) {
      Object.entries(workflow.definition.variables).forEach(([key, value]) => {
        this.addVariable(key, value);
      });
    }

    // Populate trigger config
    if (workflow.definition.trigger) {
      const trigger = workflow.definition.trigger;
      if (trigger.conditions) {
        this.clearFormArray(this.triggerConditions);
        trigger.conditions.forEach(condition => {
          this.addTriggerCondition(condition);
        });
      }
      if (trigger.keywords) {
        this.clearFormArray(this.triggerKeywords);
        trigger.keywords.forEach(keyword => {
          this.addTriggerKeyword(keyword);
        });
      }
    }
  }

  initializeNewWorkflow(): void {
    // Add a default greeting step
    this.addStep({
      id: 'greeting',
      type: StepType.MESSAGE,
      name: 'Welcome Message',
      content: 'Hello! How can I help you today?',
      next_step: ''
    });
  }

  clearFormArray(formArray: FormArray): void {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  // Step Management
  addStep(stepData?: Partial<WorkflowStep>): void {
    // Build options array properly
    const optionsArray = this.fb.array(
      stepData?.options?.map((opt: any) => this.fb.group({
        text: [opt.text || ''],
        value: [opt.value || ''],
        next_step: [opt.next_step || '']
      })) || []
    );

    // For ACTION steps from backend, transform flat structure to nested for form
    let actionValue: any = stepData?.action || '';
    if (stepData?.type === StepType.ACTION && typeof stepData.action === 'string') {
      // Backend has flat structure: { action: "send_email", params: {...} }
      // Convert to nested for form: { action: { type: "send_email", params: {...} } }
      actionValue = {
        type: stepData.action,
        params: stepData.params || {}
      };
    }

    const step = this.fb.group({
      id: [stepData?.id || this.generateStepId(), Validators.required],
      type: [stepData?.type || StepType.MESSAGE, Validators.required],
      name: [stepData?.name || ''],
      content: [stepData?.content || ''],
      condition: [stepData?.condition || ''],
      options: optionsArray,
      variable: [stepData?.variable || ''],
      action: [actionValue],  // Contains nested structure { type, params } for ACTION steps
      // Removed duplicate params field - action.params contains the actual params for ACTION steps
      next_step: [stepData?.next_step || ''],
      metadata: [stepData?.metadata || {}]
    });

    this.stepsFormArray.push(step);
  }

  removeStep(index: number): void {
    this.stepsFormArray.removeAt(index);
  }

  moveStepUp(index: number): void {
    if (index > 0) {
      const step = this.stepsFormArray.at(index);
      this.stepsFormArray.removeAt(index);
      this.stepsFormArray.insert(index - 1, step);
    }
  }

  moveStepDown(index: number): void {
    if (index < this.stepsFormArray.length - 1) {
      const step = this.stepsFormArray.at(index);
      this.stepsFormArray.removeAt(index);
      this.stepsFormArray.insert(index + 1, step);
    }
  }

  generateStepId(): string {
    return 'step_' + Math.random().toString(36).substr(2, 9);
  }

  // Variable Management
  addVariable(key = '', value: any = ''): void {
    const variable = this.fb.group({
      key: [key, Validators.required],
      value: [value],
      type: ['string']
    });
    this.variablesFormArray.push(variable);
  }

  removeVariable(index: number): void {
    this.variablesFormArray.removeAt(index);
  }

  // Trigger Management
  addTriggerCondition(condition = ''): void {
    this.triggerConditions.push(this.fb.control(condition, Validators.required));
  }

  removeTriggerCondition(index: number): void {
    this.triggerConditions.removeAt(index);
  }

  addTriggerKeyword(keyword = ''): void {
    this.triggerKeywords.push(this.fb.control(keyword, Validators.required));
  }

  removeTriggerKeyword(index: number): void {
    this.triggerKeywords.removeAt(index);
  }

  // Section Management
  toggleSection(section: string): void {
    this.sectionsExpanded = {
      ...this.sectionsExpanded,
      [section]: !this.sectionsExpanded[section as keyof typeof this.sectionsExpanded]
    };
  }

  // JSON Editor
  toggleJsonEditor(): void {
    if (this.showJsonEditor) {
      // Switching from JSON to form view - validate and apply JSON
      try {
        const workflowData = JSON.parse(this.jsonText);
        this.populateFormFromJson(workflowData);
        this.showJsonEditor = false;
      } catch (error) {
        this.errorMessage = 'Invalid JSON format. Please check your syntax.';
      }
    } else {
      // Switching from form to JSON view
      this.jsonText = JSON.stringify(this.buildWorkflowJson(), null, 2);
      this.showJsonEditor = true;
    }
  }

  populateFormFromJson(data: any): void {
    // Basic implementation - could be expanded
    if (data.name) this.workflowForm.patchValue({ name: data.name });
    if (data.description) this.workflowForm.patchValue({ description: data.description });
    // Add more JSON parsing logic as needed
  }

  buildWorkflowJson(): any {
    const formValue = this.workflowForm.value;

    // Build steps array
    const steps = formValue.steps.map((step: any) => {
      // For ACTION steps, flatten the nested structure
      if (step.type === StepType.ACTION && step.action && typeof step.action === 'object') {
        return {
          id: step.id,
          type: step.type,
          name: step.name,
          action: step.action.type,  // Extract action type from nested object
          params: step.action.params, // Extract params from nested object
          next_step: step.next_step,
          metadata: step.metadata
        };
      }

      // For other steps, use normal mapping
      return {
        id: step.id,
        type: step.type,
        name: step.name,
        content: step.content,
        condition: step.condition,
        options: step.options,
        variable: step.variable,
        action: step.action,
        params: step.params,
        next_step: step.next_step,
        metadata: step.metadata
      };
    });

    // Build variables object
    const variables: Record<string, any> = {};
    formValue.variables.forEach((variable: any) => {
      if (variable.key) {
        variables[variable.key] = variable.value;
      }
    });

    // Build trigger
    const trigger: WorkflowTrigger = {
      type: formValue.triggerType,
      conditions: formValue.triggerConfig.conditions,
      keywords: formValue.triggerConfig.keywords,
      intent_patterns: formValue.triggerConfig.intent_patterns,
      metadata: formValue.triggerConfig.metadata
    };

    const definition: WorkflowDefinition = {
      name: formValue.name,
      description: formValue.description,
      trigger,
      steps,
      variables,
      settings: formValue.settings
    };

    return {
      name: formValue.name,
      description: formValue.description,
      definition,
      trigger_type: formValue.triggerType,
      trigger_config: formValue.triggerConfig,
      status: formValue.status
    };
  }

  // Save Methods
  saveWorkflow(publish = false): void {
    if (this.workflowForm.invalid) {
      this.markFormGroupTouched(this.workflowForm);
      this.errorMessage = 'Please fill in all required fields';
      return;
    }

    this.isSaving = true;
    const workflowData = this.buildWorkflowJson();

    if (publish) {
      workflowData.status = WorkflowStatus.ACTIVE;
    }

    if (this.isEditing && this.workflowId) {
      this.updateWorkflow(workflowData);
    } else {
      this.createWorkflow(workflowData);
    }
  }

  createWorkflow(workflowData: WorkflowCreateRequest): void {
    this.workflowService.createWorkflow(workflowData).subscribe({
      next: (response) => {
        this.successMessage = 'Workflow created successfully!';
        this.isSaving = false;
        setTimeout(() => {
          this.router.navigate(['/workflows', response.id]);
        }, 2000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to create workflow';
        this.isSaving = false;
        console.error('Create workflow error:', error);
      }
    });
  }

  updateWorkflow(workflowData: WorkflowUpdateRequest): void {
    if (!this.workflowId) return;

    this.workflowService.updateWorkflow(this.workflowId, workflowData).subscribe({
      next: (response) => {
        this.successMessage = 'Workflow updated successfully!';
        this.isSaving = false;
        this.currentWorkflow = response;
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to update workflow';
        this.isSaving = false;
        console.error('Update workflow error:', error);
      }
    });
  }

  // Utility Methods
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  cancel(): void {
    if (this.workflowForm.dirty) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        this.navigateBack();
      }
    } else {
      this.navigateBack();
    }
  }

  navigateBack(): void {
    if (this.isEditing && this.workflowId) {
      this.router.navigate(['/workflows', this.workflowId]);
    } else {
      this.router.navigate(['/workflows']);
    }
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}