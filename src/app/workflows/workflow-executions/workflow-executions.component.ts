import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import {
  ExecutionSummary,
  ExecutionListResponse,
  ExecutionFilters,
  ExecutionStatus,
  WorkflowSummary
} from '../../models/workflow.models';

@Component({
  selector: 'app-workflow-executions',
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-executions.component.html',
  styleUrl: './workflow-executions.component.scss'
})
export class WorkflowExecutionsComponent implements OnInit, OnDestroy {
  executions: ExecutionSummary[] = [];
  workflows: WorkflowSummary[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private destroy$ = new Subject<void>();

  // Filters
  selectedWorkflowId = '';
  selectedStatus = '';
  selectedUserIdentifier = '';
  dateFrom = '';
  dateTo = '';
  showFilters = false;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;

  // Status options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: ExecutionStatus.RUNNING, label: 'Running' },
    { value: ExecutionStatus.COMPLETED, label: 'Completed' },
    { value: ExecutionStatus.FAILED, label: 'Failed' },
    { value: ExecutionStatus.PAUSED, label: 'Paused' },
    { value: ExecutionStatus.CANCELLED, label: 'Cancelled' }
  ];

  // Auto-refresh
  autoRefresh = true;
  refreshInterval = 10000; // 10 seconds

  constructor(
    private workflowService: WorkflowService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadExecutions();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkflows(): void {
    this.workflowService.getWorkflows(1, 100).subscribe({
      next: (response) => {
        this.workflows = response.workflows;
      },
      error: (error) => {
        console.error('Failed to load workflows:', error);
      }
    });
  }

  loadExecutions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filters: ExecutionFilters = {};
    if (this.selectedWorkflowId) filters.workflow_id = this.selectedWorkflowId;
    if (this.selectedStatus) filters.status = this.selectedStatus as ExecutionStatus;
    if (this.selectedUserIdentifier) filters.user_identifier = this.selectedUserIdentifier;
    if (this.dateFrom) filters.date_from = this.dateFrom;
    if (this.dateTo) filters.date_to = this.dateTo;

    this.workflowService.getExecutions(this.currentPage, this.pageSize, filters).subscribe({
      next: (response: ExecutionListResponse) => {
        this.executions = response.executions;
        this.totalCount = response.total;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load executions. Please try again.';
        console.error('Load executions error:', error);
      }
    });
  }

  setupAutoRefresh(): void {
    interval(this.refreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.autoRefresh && !this.isLoading) {
          this.loadExecutions();
        }
      });
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.loadExecutions();
    }
  }

  // Filter methods
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadExecutions();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearFilters(): void {
    this.selectedWorkflowId = '';
    this.selectedStatus = '';
    this.selectedUserIdentifier = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.currentPage = 1;
    this.loadExecutions();
  }

  hasActiveFilters(): boolean {
    return this.selectedWorkflowId !== '' ||
           this.selectedStatus !== '' ||
           this.selectedUserIdentifier !== '' ||
           this.dateFrom !== '' ||
           this.dateTo !== '';
  }

  // Execution actions
  viewExecutionDetails(executionId: string): void {
    // Navigate to execution details or open modal
    console.log('View execution details:', executionId);
  }

  cancelExecution(execution: ExecutionSummary): void {
    if (!confirm(`Are you sure you want to cancel this execution?`)) {
      return;
    }

    this.workflowService.cancelExecution(execution.id).subscribe({
      next: () => {
        this.successMessage = 'Execution cancelled successfully';
        this.loadExecutions();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to cancel execution';
        console.error('Cancel execution error:', error);
      }
    });
  }

  retryExecution(execution: ExecutionSummary): void {
    if (execution.workflow_id && execution.session_id) {
      this.workflowService.startExecution({
        workflow_id: execution.workflow_id,
        session_id: execution.session_id,
        user_identifier: execution.user_identifier
      }).subscribe({
        next: (response) => {
          this.successMessage = 'Execution restarted successfully';
          this.loadExecutions();
          setTimeout(() => this.successMessage = '', 5000);
        },
        error: (error) => {
          this.errorMessage = error.error?.detail || 'Failed to retry execution';
          console.error('Retry execution error:', error);
        }
      });
    }
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadExecutions();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  getPaginationArray(): number[] {
    const totalPages = this.getTotalPages();
    const pages = [];
    const maxPages = 7;

    if (totalPages <= maxPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (this.currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // Helper methods
  getWorkflowName(workflowId: string): string {
    const workflow = this.workflows.find(w => w.id === workflowId);
    return workflow?.name || 'Unknown Workflow';
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'running':
        return 'status-running';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      case 'paused':
        return 'status-paused';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'running':
        return 'play_circle';
      case 'completed':
        return 'check_circle';
      case 'failed':
        return 'error';
      case 'paused':
        return 'pause_circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'help';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  calculateDuration(started: string, completed?: string): string {
    if (!started) return 'N/A';

    const start = new Date(started).getTime();
    const end = completed ? new Date(completed).getTime() : Date.now();
    const duration = end - start;

    return this.workflowService.formatDuration(duration);
  }

  getProgress(stepsCompleted: number, totalSteps?: number): number {
    if (!totalSteps || totalSteps === 0) return 0;
    return Math.round((stepsCompleted / totalSteps) * 100);
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  navigateBack(): void {
    this.router.navigate(['/workflows']);
  }
}