import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QualityService } from '../../../services/quality.service';
import {
  AlertHistory,
  AlertSeverity,
  AlertFilter
} from '../../../models/quality.models';

@Component({
  selector: 'app-alert-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './alert-history.component.html',
  styleUrls: ['./alert-history.component.scss']
})
export class AlertHistoryComponent implements OnInit {
  alerts: AlertHistory[] = [];
  loading = false;
  error: string | null = null;
  selectedAlert: AlertHistory | null = null;

  // Filter options
  filter: AlertFilter = {};
  severities: AlertSeverity[] = ['info', 'warning', 'critical'];
  selectedSeverity: string = '';

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadAlertHistory();
  }

  loadAlertHistory(): void {
    this.loading = true;
    this.error = null;

    const filter: AlertFilter = {};
    if (this.selectedSeverity) {
      filter.severity = this.selectedSeverity as AlertSeverity;
    }

    this.qualityService.getAlertHistory(filter, 100).subscribe({
      next: (response) => {
        this.alerts = response.alerts;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load alert history: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterBySeverity(severity: string): void {
    this.selectedSeverity = severity;
    this.loadAlertHistory();
  }

  clearFilter(): void {
    this.selectedSeverity = '';
    this.loadAlertHistory();
  }

  viewAlertDetails(alert: AlertHistory): void {
    this.selectedAlert = alert;
  }

  closeDetails(): void {
    this.selectedAlert = null;
  }

  getSeverityClass(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return 'severity-critical';
      case 'warning':
        return 'severity-warning';
      case 'info':
        return 'severity-info';
      default:
        return 'severity-info';
    }
  }

  getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return this.formatDate(dateString);
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
}
