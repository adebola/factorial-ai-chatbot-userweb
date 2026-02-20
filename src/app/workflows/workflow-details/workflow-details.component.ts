import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import {
  WorkflowResponse,
  WorkflowStep,
  StepType,
  WorkflowStatus
} from '../../models/workflow.models';

@Component({
  selector: 'app-workflow-details',
  imports: [CommonModule],
  templateUrl: './workflow-details.component.html',
  styleUrl: './workflow-details.component.scss'
})
export class WorkflowDetailsComponent implements OnInit {
  workflow: WorkflowResponse | null = null;
  workflowId: string = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUser: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private workflowService: WorkflowService,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.workflowId = params['id'];
      if (this.workflowId) {
        this.loadWorkflow();
      }
    });
  }

  loadWorkflow(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.workflowService.getWorkflow(this.workflowId).subscribe({
      next: (workflow: WorkflowResponse) => {
        this.workflow = workflow;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.setReturnUrl(this.router.url);
          this.authService.logout();
        } else if (error.status === 404) {
          this.errorMessage = 'Workflow not found';
        } else if (error.status === 501 || error.status === 0) {
          // Backend service not implemented yet or not available
          console.warn('Workflow service not available:', error);
          this.errorMessage = 'Workflow service is not available yet.';
        } else {
          this.errorMessage = 'Failed to load workflow. Please try again.';
        }
        console.error('Load workflow error:', error);
      }
    });
  }

  // Navigation methods
  goBack(): void {
    this.router.navigate(['/workflows']);
  }

  editWorkflow(): void {
    this.router.navigate(['/workflows', this.workflowId, 'edit']);
  }

  duplicateWorkflow(): void {
    if (!this.workflow) return;

    const newName = `${this.workflow.name} (Copy)`;
    this.workflowService.duplicateWorkflow(this.workflowId, newName).subscribe({
      next: (response) => {
        this.successMessage = `Workflow duplicated as "${newName}"`;
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to duplicate workflow';
        console.error('Duplicate workflow error:', error);
      }
    });
  }

  toggleWorkflowActive(): void {
    if (!this.workflow) return;

    const action = this.workflow.is_active ? 'deactivate' : 'activate';
    const observable = this.workflow.is_active
      ? this.workflowService.deactivateWorkflow(this.workflowId)
      : this.workflowService.activateWorkflow(this.workflowId);

    observable.subscribe({
      next: () => {
        this.workflow!.is_active = !this.workflow!.is_active;
        this.successMessage = `Workflow ${action}d successfully`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || `Failed to ${action} workflow`;
        console.error(`${action} workflow error:`, error);
      }
    });
  }

  deleteWorkflow(): void {
    if (!this.workflow) return;

    if (!confirm(`Are you sure you want to delete the workflow "${this.workflow.name}"?`)) {
      return;
    }

    this.workflowService.deleteWorkflow(this.workflowId).subscribe({
      next: () => {
        this.router.navigate(['/workflows']);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to delete workflow';
        console.error('Delete workflow error:', error);
      }
    });
  }

  // Utility methods
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'active':
        return 'status-success';
      case 'draft':
        return 'status-draft';
      case 'inactive':
        return 'status-warning';
      case 'archived':
        return 'status-error';
      default:
        return 'status-pending';
    }
  }

  getStatusColor(status: string): string {
    return this.workflowService.getStatusColor(status);
  }

  getStepTypeIcon(stepType: string): string {
    return this.workflowService.getStepTypeIcon(stepType);
  }

  getTriggerTypeIcon(triggerType: string): string {
    switch (triggerType.toLowerCase()) {
      case 'message':
        return 'chat';
      case 'intent':
        return 'psychology';
      case 'keyword':
        return 'key';
      default:
        return 'help';
    }
  }

  viewExecutions(): void {
    this.router.navigate(['/workflows/executions'], {
      queryParams: { workflow_id: this.workflowId }
    });
  }

  viewAnalytics(): void {
    this.router.navigate(['/workflows/analytics'], {
      queryParams: { workflow_id: this.workflowId }
    });
  }

  testWorkflow(): void {
    // Navigate to test interface (to be implemented)
    console.log('Test workflow functionality to be implemented');
  }

  exportWorkflow(): void {
    if (!this.workflow) return;

    this.workflowService.exportWorkflow(this.workflowId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.workflow!.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.successMessage = 'Workflow exported successfully';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to export workflow';
        console.error('Export workflow error:', error);
      }
    });
  }

  trackByStepId(index: number, step: WorkflowStep): string {
    return step.id;
  }

  getVariablesArray(variables: Record<string, any>): Array<{key: string, value: any}> {
    return Object.entries(variables).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    }));
  }

  getSettingsArray(settings: Record<string, any>): Array<{key: string, value: any}> {
    return Object.entries(settings).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value) : value
    }));
  }
}