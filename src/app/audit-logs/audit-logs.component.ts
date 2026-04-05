import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AuditService,
  AuditEvent,
  AuditListResponse,
  AuditStats,
  AuditEventParams
} from '../services/audit.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-audit-logs',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './audit-logs.component.html',
  styleUrl: './audit-logs.component.scss'
})
export class AuditLogsComponent implements OnInit {
  // Data
  events: AuditEvent[] = [];
  stats: AuditStats | null = null;
  totalEvents = 0;

  // UI State
  isLoading = false;
  isLoadingStats = false;
  errorMessage = '';
  expandedEventId: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalPages = 1;

  // Filters
  filterTier = '';
  filterSourceService = '';
  filterActionType = '';
  filterDateFrom = '';
  filterDateTo = '';

  constructor(
    private auditService: AuditService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    this.loadStats();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: AuditEventParams = {
      page: this.currentPage - 1,  // backend uses 0-based pagination
      size: this.pageSize
    };

    if (this.filterTier) {
      params.tier = this.filterTier;
    }
    if (this.filterSourceService) {
      params.source_service = this.filterSourceService;
    }
    if (this.filterActionType) {
      params.action_type = this.filterActionType;
    }
    if (this.filterDateFrom) {
      params.date_from = this.filterDateFrom;
    }
    if (this.filterDateTo) {
      params.date_to = this.filterDateTo;
    }

    this.auditService.getEvents(params).subscribe({
      next: (response: AuditListResponse) => {
        this.events = response.items;
        this.totalEvents = response.total;
        this.totalPages = Math.ceil(response.total / this.pageSize);
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.logout();
        } else {
          this.errorMessage = 'Failed to load audit events. Please try again.';
        }
        console.error('Load audit events error:', error);
      }
    });
  }

  loadStats(): void {
    this.isLoadingStats = true;

    this.auditService.getStats().subscribe({
      next: (stats: AuditStats) => {
        this.stats = stats;
        this.isLoadingStats = false;
      },
      error: (error) => {
        this.isLoadingStats = false;
        console.error('Load audit stats error:', error);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadEvents();
  }

  clearFilters(): void {
    this.filterTier = '';
    this.filterSourceService = '';
    this.filterActionType = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.currentPage = 1;
    this.loadEvents();
  }

  toggleEventDetail(eventId: string): void {
    this.expandedEventId = this.expandedEventId === eventId ? null : eventId;
  }

  isExpanded(eventId: string): boolean {
    return this.expandedEventId === eventId;
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadEvents();
    }
  }

  get visiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(this.totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Utility methods
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getActionIcon(actionType: string): string {
    const iconMap: { [key: string]: string } = {
      'create': 'add_circle',
      'update': 'edit',
      'delete': 'delete',
      'login': 'login',
      'logout': 'logout',
      'access': 'visibility',
      'export': 'file_download',
      'import': 'file_upload',
      'approve': 'check_circle',
      'reject': 'cancel',
      'assign': 'person_add',
      'unassign': 'person_remove',
      'enable': 'toggle_on',
      'disable': 'toggle_off',
      'upload': 'cloud_upload',
      'download': 'cloud_download',
      'configure': 'settings',
      'subscribe': 'card_membership',
      'unsubscribe': 'unsubscribe',
      'payment': 'payment',
      'invoke': 'play_arrow',
      'register': 'app_registration'
    };
    return iconMap[actionType?.toLowerCase()] || 'article';
  }

  getTierClass(tier: string): string {
    switch (tier?.toLowerCase()) {
      case 'security': return 'tier-security';
      case 'data': return 'tier-data';
      case 'system': return 'tier-system';
      case 'billing': return 'tier-billing';
      case 'admin': return 'tier-admin';
      default: return 'tier-default';
    }
  }

  getStatCount(key: string): number {
    if (!this.stats?.by_tier) return 0;
    return this.stats.by_tier[key] || 0;
  }

  hasState(state: any): boolean {
    return state && typeof state === 'object' && Object.keys(state).length > 0;
  }

  clearError(): void {
    this.errorMessage = '';
  }
}