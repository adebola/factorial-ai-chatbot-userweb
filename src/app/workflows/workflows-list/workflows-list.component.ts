import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import {
  WorkflowSummary,
  WorkflowListResponse,
  WorkflowFilters,
  WorkflowStatus,
  TriggerType
} from '../../models/workflow.models';

@Component({
  selector: 'app-workflows-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './workflows-list.component.html',
  styleUrl: './workflows-list.component.scss'
})
export class WorkflowsListComponent implements OnInit {
  workflows: WorkflowSummary[] = [];
  selectedWorkflows: Set<string> = new Set();
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUser: any = null;

  // Expose Math to template
  Math = Math;

  // Filtering and search
  searchTerm = '';
  selectedStatus = '';
  selectedTriggerType = '';
  isActiveFilter: boolean | null = null;
  showFilters = false;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;

  // Available filter options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: WorkflowStatus.ACTIVE, label: 'Active' },
    { value: WorkflowStatus.DRAFT, label: 'Draft' },
    { value: WorkflowStatus.INACTIVE, label: 'Inactive' },
    { value: WorkflowStatus.ARCHIVED, label: 'Archived' }
  ];

  triggerTypeOptions = [
    { value: '', label: 'All Trigger Types' },
    { value: TriggerType.MESSAGE, label: 'Message' },
    { value: TriggerType.INTENT, label: 'Intent' },
    { value: TriggerType.KEYWORD, label: 'Keyword' },
    { value: TriggerType.MANUAL, label: 'Manual' }
  ];

  activeFilterOptions = [
    { value: null, label: 'All' },
    { value: true, label: 'Active Only' },
    { value: false, label: 'Inactive Only' }
  ];

  constructor(
    private workflowService: WorkflowService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadWorkflows();
  }

  loadWorkflows(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filters: WorkflowFilters = {};
    if (this.searchTerm) filters.search = this.searchTerm;
    if (this.selectedStatus) filters.status = this.selectedStatus as WorkflowStatus;
    if (this.selectedTriggerType) filters.trigger_type = this.selectedTriggerType as TriggerType;
    if (this.isActiveFilter !== null) filters.is_active = this.isActiveFilter;

    this.workflowService.getWorkflows(this.currentPage, this.pageSize, filters).subscribe({
      next: (response: WorkflowListResponse) => {
        console.log('Workflows API Response:', response);
        console.log('First workflow is_active value:', response.workflows[0]?.is_active, 'Type:', typeof response.workflows[0]?.is_active);
        this.workflows = response.workflows;
        this.totalCount = response.total;
        this.isLoading = false;
        this.selectedWorkflows.clear();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.setReturnUrl(this.router.url);
          this.authService.logout();
        } else {
          this.errorMessage = 'Failed to load workflows. Please try again.';
          console.error('Load workflows error:', error);
        }
      }
    });
  }

  toggleWorkflowSelection(workflowId: string): void {
    if (this.selectedWorkflows.has(workflowId)) {
      this.selectedWorkflows.delete(workflowId);
    } else {
      this.selectedWorkflows.add(workflowId);
    }
  }

  toggleSelectAll(): void {
    if (this.selectedWorkflows.size === this.workflows.length) {
      this.selectedWorkflows.clear();
    } else {
      this.selectedWorkflows.clear();
      this.workflows.forEach(workflow => this.selectedWorkflows.add(workflow.id));
    }
  }

  // Filtering methods
  onSearchChange(): void {
    this.currentPage = 1;
    this.loadWorkflows();
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.loadWorkflows();
  }

  onTriggerTypeChange(): void {
    this.currentPage = 1;
    this.loadWorkflows();
  }

  onActiveFilterChange(): void {
    this.currentPage = 1;
    this.loadWorkflows();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedTriggerType = '';
    this.isActiveFilter = null;
    this.currentPage = 1;
    this.loadWorkflows();
  }

  hasActiveFilters(): boolean {
    return this.searchTerm !== '' ||
           this.selectedStatus !== '' ||
           this.selectedTriggerType !== '' ||
           this.isActiveFilter !== null;
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedStatus) count++;
    if (this.selectedTriggerType) count++;
    if (this.isActiveFilter !== null) count++;
    return count;
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadWorkflows();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  getPaginationArray(): number[] {
    const totalPages = this.getTotalPages();
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Workflow actions
  createWorkflow(): void {
    this.router.navigate(['/workflows/create']);
  }

  viewWorkflow(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId]);
  }

  editWorkflow(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId, 'edit']);
  }

  duplicateWorkflow(workflow: WorkflowSummary): void {
    const newName = `${workflow.name} (Copy)`;
    this.workflowService.duplicateWorkflow(workflow.id, newName).subscribe({
      next: (response) => {
        this.successMessage = `Workflow duplicated as "${newName}"`;
        this.loadWorkflows();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to duplicate workflow';
        console.error('Duplicate workflow error:', error);
      }
    });
  }

  toggleWorkflowActive(workflow: WorkflowSummary, event: Event): void {
    event.stopPropagation();

    const action = workflow.is_active ? 'deactivate' : 'activate';
    const observable = workflow.is_active
      ? this.workflowService.deactivateWorkflow(workflow.id)
      : this.workflowService.activateWorkflow(workflow.id);

    observable.subscribe({
      next: () => {
        workflow.is_active = !workflow.is_active;
        this.successMessage = `Workflow ${action}d successfully`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || `Failed to ${action} workflow`;
        console.error(`${action} workflow error:`, error);
      }
    });
  }

  deleteWorkflow(workflow: WorkflowSummary): void {
    if (!confirm(`Are you sure you want to delete the workflow "${workflow.name}"?`)) {
      return;
    }

    this.workflowService.deleteWorkflow(workflow.id).subscribe({
      next: () => {
        this.successMessage = `Workflow "${workflow.name}" deleted successfully`;
        this.loadWorkflows();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to delete workflow';
        console.error('Delete workflow error:', error);
      }
    });
  }

  deleteSelectedWorkflows(): void {
    if (this.selectedWorkflows.size === 0) {
      this.errorMessage = 'Please select workflows to delete';
      return;
    }

    if (!confirm(`Are you sure you want to delete ${this.selectedWorkflows.size} workflow(s)?`)) {
      return;
    }

    const workflowIds = Array.from(this.selectedWorkflows);
    let deletedCount = 0;

    const deletePromises = workflowIds.map(id =>
      this.workflowService.deleteWorkflow(id).toPromise()
        .then(() => deletedCount++)
        .catch(error => console.error('Failed to delete workflow:', error))
    );

    Promise.all(deletePromises).then(() => {
      this.successMessage = `${deletedCount} workflow(s) deleted successfully`;
      this.loadWorkflows();
      setTimeout(() => this.successMessage = '', 5000);
    });
  }

  // Navigation methods
  navigateToTemplates(): void {
    this.router.navigate(['/workflows/templates']);
  }

  navigateToExecutions(): void {
    this.router.navigate(['/workflows/executions']);
  }

  navigateToAnalytics(): void {
    this.router.navigate(['/workflows/analytics']);
  }

  // Utility methods
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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

  getTriggerTypeIcon(triggerType: string): string {
    switch (triggerType.toLowerCase()) {
      case 'message':
        return 'chat';
      case 'intent':
        return 'psychology';
      case 'keyword':
        return 'key';
      case 'manual':
        return 'touch_app';
      default:
        return 'help';
    }
  }

  getStatusColor(status: string): string {
    return this.workflowService.getStatusColor(status);
  }
}
