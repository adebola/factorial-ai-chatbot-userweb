import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QualityService } from '../../services/quality.service';
import {
  SchedulerStatus,
  JobExecutionLog,
  JobType,
  JobStatus,
  JobLogFilter
} from '../../models/quality.models';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-scheduler-monitor',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './scheduler-monitor.component.html',
  styleUrls: ['./scheduler-monitor.component.scss']
})
export class SchedulerMonitorComponent implements OnInit, OnDestroy {
  schedulerStatus: SchedulerStatus | null = null;
  jobLogs: JobExecutionLog[] = [];
  loading = false;
  error: string | null = null;
  selectedLog: JobExecutionLog | null = null;
  autoRefresh = true;
  private refreshSubscription?: Subscription;

  // Filter options
  selectedJobType: string = '';
  selectedStatus: string = '';
  jobTypes: JobType[] = ['gap_detection', 'quality_check'];
  statuses: JobStatus[] = ['success', 'failed', 'partial'];

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadSchedulerStatus();
    this.loadJobLogs();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadSchedulerStatus(): void {
    this.qualityService.getSchedulerStatus().subscribe({
      next: (status) => {
        this.schedulerStatus = status;
      },
      error: (err) => {
        this.error = 'Failed to load scheduler status: ' + (err.error?.message || err.message);
      }
    });
  }

  loadJobLogs(): void {
    this.loading = true;
    this.error = null;

    const filter: JobLogFilter = {};
    if (this.selectedJobType) {
      filter.job_type = this.selectedJobType as JobType;
    }
    if (this.selectedStatus) {
      filter.status = this.selectedStatus as JobStatus;
    }

    this.qualityService.getJobLogs(filter, 100).subscribe({
      next: (response) => {
        this.jobLogs = response.logs;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load job logs: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterByJobType(jobType: string): void {
    this.selectedJobType = jobType;
    this.loadJobLogs();
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.loadJobLogs();
  }

  clearFilters(): void {
    this.selectedJobType = '';
    this.selectedStatus = '';
    this.loadJobLogs();
  }

  viewLogDetails(log: JobExecutionLog): void {
    this.selectedLog = log;
  }

  closeDetails(): void {
    this.selectedLog = null;
  }

  refreshData(): void {
    this.loadSchedulerStatus();
    this.loadJobLogs();
  }

  toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private startAutoRefresh(): void {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(30000) // Refresh every 30 seconds
        .pipe(
          switchMap(() => {
            this.loadSchedulerStatus();
            return this.qualityService.getJobLogs({}, 100);
          })
        )
        .subscribe({
          next: (response) => {
            this.jobLogs = response.logs;
          },
          error: (err) => {
            console.error('Auto-refresh failed:', err);
          }
        });
    }
  }

  private stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  getStatusClass(status: JobStatus): string {
    switch (status) {
      case 'success':
        return 'status-success';
      case 'failed':
        return 'status-failed';
      case 'partial':
        return 'status-partial';
      default:
        return 'status-success';
    }
  }

  getStatusIcon(status: JobStatus): string {
    switch (status) {
      case 'success':
        return 'check_circle';
      case 'failed':
        return 'error';
      case 'partial':
        return 'warning';
      default:
        return 'check_circle';
    }
  }

  getJobTypeLabel(type: JobType): string {
    switch (type) {
      case 'gap_detection':
        return 'Gap Detection';
      case 'quality_check':
        return 'Quality Check';
      default:
        return type;
    }
  }

  getJobTypeIcon(type: JobType): string {
    switch (type) {
      case 'gap_detection':
        return 'find_in_page';
      case 'quality_check':
        return 'verified';
      default:
        return 'work';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  formatDuration(ms?: number): string {
    if (!ms) return 'N/A';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  formatJSON(obj: any): string {
    if (!obj) return '';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }

  getNextRunTime(job: any): string {
    if (!job.next_run_time) return 'Not scheduled';
    return this.formatDate(job.next_run_time);
  }
}
