import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  WebsiteIngestionService,
  IngestionStatsResponse,
  IngestionPagesResponse,
  WebsitePage,
  PageContentResponse
} from '../../services/website-ingestion.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-ingestion-details',
  imports: [CommonModule, RouterModule],
  templateUrl: './ingestion-details.component.html',
  styleUrl: './ingestion-details.component.scss'
})
export class IngestionDetailsComponent implements OnInit, OnDestroy {
  ingestionId: string = '';
  stats: IngestionStatsResponse | null = null;
  statusData: any = null; // Status data with categorization
  pages: WebsitePage[] = [];
  pagination: any = null;
  isLoading = false;
  errorMessage = '';
  currentPage = 1;
  pageSize = 20;

  selectedPage: WebsitePage | null = null;
  pageContent: PageContentResponse | null = null;
  loadingPageContent = false;

  private refreshInterval: any;
  autoRefreshEnabled = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private websiteIngestionService: WebsiteIngestionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.ingestionId = params['id'];
      if (this.ingestionId) {
        this.loadIngestionDetails();
        this.loadIngestionStatus(); // Third API call for categorization
        this.loadIngestionPages();
        this.startAutoRefreshIfNeeded();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadIngestionDetails(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.websiteIngestionService.getIngestionStats(this.ingestionId).subscribe({
      next: (response) => {
        this.stats = response;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.logout();
        } else if (error.status === 404) {
          this.errorMessage = 'Ingestion not found or access denied';
        } else {
          this.errorMessage = 'Failed to load ingestion details';
        }
        console.error('Load ingestion details error:', error);
      }
    });
  }

  loadIngestionStatus(): void {
    this.websiteIngestionService.getIngestionStatus(this.ingestionId).subscribe({
      next: (response) => {
        this.statusData = response;
        console.log('📊 Status data with categorization:', response.categorization);
      },
      error: (error) => {
        console.error('Load ingestion status error:', error);
        // Don't show error to user, categorization is optional
      }
    });
  }

  loadIngestionPages(page: number = 1): void {
    this.currentPage = page;

    this.websiteIngestionService.getIngestionPages(this.ingestionId, page, this.pageSize).subscribe({
      next: (response) => {
        this.pages = response.pages;
        this.pagination = response.pagination;
      },
      error: (error) => {
        if (error.status === 401) {
          this.authService.logout();
        } else {
          this.errorMessage = 'Failed to load pages';
        }
        console.error('Load pages error:', error);
      }
    });
  }

  loadPageContent(page: WebsitePage): void {
    this.selectedPage = page;
    this.loadingPageContent = true;
    this.pageContent = null;

    this.websiteIngestionService.getPageContent(this.ingestionId, page.id).subscribe({
      next: (response) => {
        this.pageContent = response;
        this.loadingPageContent = false;
      },
      error: (error) => {
        this.loadingPageContent = false;
        console.error('Load page content error:', error);
      }
    });
  }

  closePageContent(): void {
    this.selectedPage = null;
    this.pageContent = null;
  }

  goToNextPage(): void {
    if (this.pagination?.has_next) {
      this.loadIngestionPages(this.currentPage + 1);
    }
  }

  goToPreviousPage(): void {
    if (this.pagination?.has_previous) {
      this.loadIngestionPages(this.currentPage - 1);
    }
  }

  goToPage(page: number): void {
    this.loadIngestionPages(page);
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'status-success';
      case 'in_progress':
      case 'processing':
        return 'status-processing';
      case 'failed':
      case 'error':
        return 'status-error';
      default:
        return 'status-pending';
    }
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(seconds: number | null): string {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  }

  getProgressPercentage(): number {
    if (!this.stats?.summary.pages_discovered) return 0;
    return Math.round((this.stats.summary.pages_processed / this.stats.summary.pages_discovered) * 100);
  }

  private startAutoRefreshIfNeeded(): void {
    if (this.stats?.status === 'in_progress' || this.stats?.status === 'processing') {
      this.startAutoRefresh();
    }
  }

  startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.autoRefreshEnabled = true;
    this.refreshInterval = setInterval(() => {
      this.loadIngestionDetails();
      this.loadIngestionStatus(); // Also refresh categorization data
      this.loadIngestionPages(this.currentPage);

      if (this.stats?.status !== 'in_progress' && this.stats?.status !== 'processing') {
        this.stopAutoRefresh();
      }
    }, 5000);
  }

  stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.autoRefreshEnabled = false;
  }

  toggleAutoRefresh(): void {
    if (this.autoRefreshEnabled) {
      this.stopAutoRefresh();
    } else {
      this.startAutoRefresh();
    }
  }

  goBack(): void {
    this.router.navigate(['/websites']);
  }

  // Helper method to get object keys for template
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  // Categorization helper methods
  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  getConfidenceLabel(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  getTagIcon(tagType: string): string {
    switch (tagType) {
      case 'auto':
        return 'smart_toy';
      case 'system':
        return 'verified';
      case 'custom':
        return 'person';
      default:
        return 'label';
    }
  }

  getAssignedByIcon(assignedBy: string): string {
    switch (assignedBy) {
      case 'ai':
        return 'smart_toy';
      case 'user':
        return 'person';
      case 'rule':
        return 'rule';
      default:
        return 'help_outline';
    }
  }

  hasCategorizationData(): boolean {
    // Check statusData first (from /status endpoint), then fallback to stats
    const categorizationData = this.statusData?.categorization || this.stats?.categorization;
    return !!(categorizationData?.categories && categorizationData.categories.length > 0) ||
           !!(categorizationData?.tags && categorizationData.tags.length > 0);
  }
}
