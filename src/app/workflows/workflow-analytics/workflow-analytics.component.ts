import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import {
  WorkflowAnalyticsResponse,
  WorkflowMetrics,
  WorkflowSummary
} from '../../models/workflow.models';

interface MetricCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
}

interface ChartData {
  date: string;
  executions: number;
  completions: number;
  failures: number;
}

@Component({
  selector: 'app-workflow-analytics',
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-analytics.component.html',
  styleUrl: './workflow-analytics.component.scss'
})
export class WorkflowAnalyticsComponent implements OnInit {
  metrics: WorkflowMetrics | null = null;
  workflows: WorkflowSummary[] = [];
  analyticsData: WorkflowAnalyticsResponse[] = [];
  chartData: ChartData[] = [];
  isLoading = false;
  errorMessage = '';

  // Filters
  selectedWorkflowId = '';
  dateFrom = '';
  dateTo = '';
  dateRange = '30'; // days

  // Metric cards
  metricCards: MetricCard[] = [];

  constructor(
    private workflowService: WorkflowService,
    private authService: AuthService,
    private router: Router
  ) {
    this.setDefaultDateRange();
  }

  ngOnInit(): void {
    this.loadWorkflows();
    this.loadMetrics();
    this.loadAnalytics();
  }

  setDefaultDateRange(): void {
    const today = new Date();
    const pastDate = new Date();
    pastDate.setDate(today.getDate() - parseInt(this.dateRange));

    this.dateTo = today.toISOString().split('T')[0];
    this.dateFrom = pastDate.toISOString().split('T')[0];
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

  loadMetrics(): void {
    this.workflowService.getWorkflowMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
        this.updateMetricCards();
      },
      error: (error) => {
        console.error('Failed to load metrics:', error);
      }
    });
  }

  loadAnalytics(): void {
    this.isLoading = true;
    this.errorMessage = '';

    if (this.selectedWorkflowId) {
      // Load analytics for specific workflow
      this.workflowService.getWorkflowAnalytics(
        this.selectedWorkflowId,
        this.dateFrom,
        this.dateTo
      ).subscribe({
        next: (data) => {
          this.analyticsData = data;
          this.processChartData();
          this.isLoading = false;

          // Show info message only if no executions for this workflow
          if (data.length === 0) {
            const workflowName = this.getWorkflowName(this.selectedWorkflowId);
            this.errorMessage = `No execution data available for "${workflowName}". Execute the workflow to see analytics.`;
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = 'Failed to load analytics. Please try again.';
          console.error('Analytics error:', error);
        }
      });
    } else {
      // Load general metrics
      this.isLoading = false;
      this.analyticsData = [];
      this.chartData = [];
    }
  }

  updateMetricCards(): void {
    if (!this.metrics) return;

    this.metricCards = [
      {
        title: 'Total Workflows',
        value: this.metrics.total_workflows,
        icon: 'account_tree',
        color: '#3b82f6'
      },
      {
        title: 'Active Workflows',
        value: this.metrics.active_workflows,
        icon: 'play_circle',
        color: '#10b981'
      },
      {
        title: 'Total Executions',
        value: this.formatNumber(this.metrics.total_executions),
        icon: 'timeline',
        color: '#f59e0b'
      },
      {
        title: 'Completion Rate',
        value: `${(this.metrics.avg_completion_rate * 100).toFixed(1)}%`,
        icon: 'check_circle',
        color: '#8b5cf6'
      }
    ];
  }

  processChartData(): void {
    // Process analytics data into chart format
    this.chartData = this.analyticsData.map(item => ({
      date: this.formatChartDate(item.date),
      executions: item.total_executions,
      completions: item.completed_executions,
      failures: item.failed_executions
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  onDateRangeChange(): void {
    this.setDefaultDateRange();
    this.loadAnalytics();
  }

  onWorkflowChange(): void {
    this.loadAnalytics();
  }

  onCustomDateChange(): void {
    if (this.dateFrom && this.dateTo) {
      this.dateRange = 'custom';
      this.loadAnalytics();
    }
  }

  exportAnalytics(): void {
    const data = this.selectedWorkflowId ? this.analyticsData : this.metrics;
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  getWorkflowName(workflowId: string): string {
    const workflow = this.workflows.find(w => w.id === workflowId);
    return workflow?.name || 'Unknown Workflow';
  }

  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  formatChartDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  getMaxValue(): number {
    if (this.chartData.length === 0) return 0;
    return Math.max(...this.chartData.map(d => d.executions));
  }

  getBarHeight(value: number): number {
    const maxValue = this.getMaxValue();
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  }

  getTotalExecutions(): number {
    return this.chartData.reduce((sum, item) => sum + item.executions, 0);
  }

  getTotalCompletions(): number {
    return this.chartData.reduce((sum, item) => sum + item.completions, 0);
  }

  getTotalFailures(): number {
    return this.chartData.reduce((sum, item) => sum + item.failures, 0);
  }

  getAverageCompletionRate(): number {
    if (this.chartData.length === 0) return 0;

    const totalExecutions = this.getTotalExecutions();
    const totalCompletions = this.getTotalCompletions();

    return totalExecutions > 0 ? (totalCompletions / totalExecutions) * 100 : 0;
  }

  navigateToWorkflow(workflowId: string): void {
    this.router.navigate(['/workflows', workflowId]);
  }

  clearMessages(): void {
    this.errorMessage = '';
  }

  navigateBack(): void {
    this.router.navigate(['/workflows']);
  }
}