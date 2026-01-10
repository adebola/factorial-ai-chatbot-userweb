import {Component, OnDestroy, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  WebsiteIngestionService,
  WebsiteIngestion,
  WebsiteIngestionsListResponse
} from '../services/website-ingestion.service';
import { AuthService } from '../services/auth.service';
import { ModalService } from '../shared/modal/modal.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-website-ingestion',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './website-ingestion.component.html',
  styleUrl: './website-ingestion.component.scss'
})
export class WebsiteIngestionComponent implements OnInit, OnDestroy {
  ingestions: WebsiteIngestion[] = [];
  selectedIngestions: Set<string> = new Set();
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUser: any = null;

  // New ingestion form
  showAddModal = false;
  newWebsiteUrl = '';
  autoCategorize: boolean | null = null; // null = use global config, true = enable, false = disable
  isStartingIngestion = false;

  // Refresh confirmation modal
  showRefreshModal = false;
  ingestionToRefresh: WebsiteIngestion | null = null;
  isRefreshing = false;

  // Auto-refresh for status updates
  private refreshInterval: any;
  autoRefreshEnabled = false;
  showingFeedback = false;
  feedbackMessage = '';
  newlySubmittedIngestion: WebsiteIngestion | null = null;
  isProduction = environment.production;

  constructor(
    private websiteIngestionService: WebsiteIngestionService,
    private authService: AuthService,
    private router: Router,
    private modalService: ModalService
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadIngestions();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadIngestions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📥 Loading ingestions...');
    this.websiteIngestionService.getIngestions().subscribe({
      next: (response: WebsiteIngestionsListResponse) => {
        console.log('📊 Received ingestions:', response.ingestions.length, 'entries');
        console.log('📋 Ingestions data:', response.ingestions);

        // Debug categorization_summary
        response.ingestions.forEach((ing, index) => {
          console.log(`Ingestion ${index} (${ing.base_url}):`, {
            id: ing.id,
            has_summary: !!ing.categorization_summary,
            summary: ing.categorization_summary
          });
        });

        // Check for potential duplicates
        this.checkForDuplicates(response.ingestions);

        this.ingestions = response.ingestions;
        this.isLoading = false;
        this.selectedIngestions.clear();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.logout();
        } else {
          this.errorMessage = 'Failed to load website ingestions. Please try again.';
        }
        console.error('Load ingestions error:', error);
      }
    });
  }

  toggleIngestionSelection(ingestionId: string): void {
    if (this.selectedIngestions.has(ingestionId)) {
      this.selectedIngestions.delete(ingestionId);
    } else {
      this.selectedIngestions.add(ingestionId);
    }
  }

  toggleSelectAll(): void {
    if (this.selectedIngestions.size === this.ingestions.length) {
      this.selectedIngestions.clear();
    } else {
      this.selectedIngestions.clear();
      this.ingestions.forEach(ing => this.selectedIngestions.add(ing.id));
    }
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.newWebsiteUrl = '';
    this.autoCategorize = null; // Reset to use global config
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.newWebsiteUrl = '';
    this.autoCategorize = null;
  }

  startIngestion(): void {
    if (!this.newWebsiteUrl.trim()) {
      this.errorMessage = 'Please enter a website URL';
      return;
    }

    // Basic URL validation
    if (!this.newWebsiteUrl.startsWith('http://') && !this.newWebsiteUrl.startsWith('https://')) {
      this.errorMessage = 'URL must start with http:// or https://';
      return;
    }

    this.isStartingIngestion = true;
    this.errorMessage = '';
    this.successMessage = '';

    console.log('🚀 Starting ingestion for:', this.newWebsiteUrl, 'with auto_categorize:', this.autoCategorize);
    this.websiteIngestionService.startIngestion(this.newWebsiteUrl, this.autoCategorize).subscribe({
      next: (response) => {
        console.log('✅ Ingestion started successfully:', response);
        this.isStartingIngestion = false;

        // Show immediate feedback that the process has started
        this.showImmediateFeedback(
          `✓ Website submission successful! Processing has started for: ${response.website_url}`,
          'success'
        );

        // Store the response data for tracking
        this.trackNewSubmission(response.website_url);

        this.closeAddModal();
        this.loadIngestions(); // Refresh the list to show the new entry

        // Delay auto-refresh to avoid race conditions
        setTimeout(() => {
          this.enableAutoRefreshIfNeeded();
        }, 2000);

        setTimeout(() => {
          this.successMessage = '';
          this.newlySubmittedIngestion = null;
        }, 10000);
      },
      error: (error) => {
        this.isStartingIngestion = false;
        this.errorMessage = error.error?.detail || 'Failed to start website ingestion';
        console.error('Start ingestion error:', error);
      }
    });
  }

  async deleteIngestion(ingestionId: string): Promise<void> {
    const ingestion = this.ingestions.find(ing => ing.id === ingestionId);

    const confirmed = await this.modalService.confirm(
      'Delete Ingestion',
      `Are you sure you want to delete the ingestion for "${ingestion?.base_url}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    this.websiteIngestionService.deleteIngestion(ingestionId).subscribe({
      next: (response) => {
        this.modalService.success(
          'Ingestion Deleted',
          `Successfully deleted ingestion for ${response.base_url}`
        );
        this.loadIngestions();
      },
      error: (error) => {
        this.modalService.error(
          'Delete Failed',
          error.error?.detail || 'Failed to delete ingestion. Please try again.'
        );
        console.error('Delete ingestion error:', error);
      }
    });
  }

  async retryIngestion(ingestionId: string): Promise<void> {
    const ingestion = this.ingestions.find(ing => ing.id === ingestionId);

    const confirmed = await this.modalService.confirm(
      'Retry Ingestion',
      `Are you sure you want to retry the ingestion for "${ingestion?.base_url}"? This will restart the crawling process.`,
      'Retry',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    this.websiteIngestionService.retryIngestion(ingestionId).subscribe({
      next: (response) => {
        this.modalService.success(
          'Retry Started',
          `Ingestion retry started for ${response.base_url}`
        );
        this.loadIngestions();
      },
      error: (error) => {
        this.modalService.error(
          'Retry Failed',
          error.error?.detail || 'Failed to retry ingestion. Please try again.'
        );
        console.error('Retry ingestion error:', error);
      }
    });
  }

  openRefreshModal(ingestion: WebsiteIngestion): void {
    this.ingestionToRefresh = ingestion;
    this.showRefreshModal = true;
  }

  closeRefreshModal(): void {
    this.showRefreshModal = false;
    this.ingestionToRefresh = null;
    this.isRefreshing = false;
  }

  confirmRefresh(): void {
    if (!this.ingestionToRefresh) return;

    this.isRefreshing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const ingestionId = this.ingestionToRefresh.id;
    const baseUrl = this.ingestionToRefresh.base_url;

    console.log('🔄 Refreshing ingestion for:', baseUrl);
    this.websiteIngestionService.retryIngestion(ingestionId).subscribe({
      next: (response) => {
        console.log('✅ Ingestion refresh started successfully:', response);
        this.isRefreshing = false;

        this.showImmediateFeedback(
          `Refresh started for: ${response.base_url}. The existing ingestion will be deleted and reloaded.`,
          'success'
        );

        this.closeRefreshModal();
        this.loadIngestions();

        setTimeout(() => {
          this.enableAutoRefreshIfNeeded();
        }, 2000);

        setTimeout(() => {
          this.successMessage = '';
        }, 10000);
      },
      error: (error) => {
        this.isRefreshing = false;
        this.errorMessage = error.error?.detail || 'Failed to refresh ingestion';
        console.error('Refresh ingestion error:', error);
        this.closeRefreshModal();
      }
    });
  }

  async deleteSelectedIngestions(): Promise<void> {
    if (this.selectedIngestions.size === 0) {
      await this.modalService.alert(
        'No Selection',
        'Please select ingestions to delete'
      );
      return;
    }

    const confirmed = await this.modalService.warning(
      'Delete Multiple Ingestions',
      `Are you sure you want to delete ${this.selectedIngestions.size} ingestion(s)? This action cannot be undone.`,
      'Delete All',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    const deletions = Array.from(this.selectedIngestions).map(id =>
      this.websiteIngestionService.deleteIngestion(id)
    );

    // Simple implementation - delete one by one
    let completed = 0;
    let failed = 0;

    deletions.forEach(deletion => {
      deletion.subscribe({
        next: () => {
          completed++;
          if (completed + failed === deletions.length) {
            this.modalService.success(
              'Deletion Complete',
              `Successfully deleted ${completed} of ${deletions.length} ingestion(s)${failed > 0 ? `. Failed to delete ${failed}.` : ''}`
            );
            this.loadIngestions();
          }
        },
        error: () => {
          failed++;
          if (completed + failed === deletions.length) {
            if (completed === 0) {
              this.modalService.error(
                'Deletion Failed',
                `Failed to delete all ${deletions.length} ingestion(s)`
              );
            } else {
              this.modalService.warning(
                'Partial Success',
                `Deleted ${completed} of ${deletions.length} ingestion(s). Failed to delete ${failed}.`
              );
            }
            this.loadIngestions();
          }
        }
      });
    });
  }


  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
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

  getProgressPercentage(ingestion: WebsiteIngestion): number {
    if (ingestion.pages_discovered === 0) return 0;
    return Math.round((ingestion.pages_processed / ingestion.pages_discovered) * 100);
  }

  canRetry(status: string): boolean {
    return ['failed', 'error'].includes(status.toLowerCase());
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

  private showImmediateFeedback(message: string, type: 'success' | 'info' | 'warning' = 'info'): void {
    this.showingFeedback = true;
    this.feedbackMessage = message;

    if (type === 'success') {
      this.successMessage = message;
    }

    setTimeout(() => {
      this.showingFeedback = false;
      this.feedbackMessage = '';
    }, 8000);
  }

  private trackNewSubmission(websiteUrl: string): void {
    // We'll identify the newly submitted ingestion by URL after refresh
    console.log('🔍 Tracking new submission for URL:', websiteUrl);
    setTimeout(() => {
      console.log('🔍 Looking for new ingestion in list:', this.ingestions.map(ing => ({ url: ing.base_url, status: ing.status, id: ing.id })));
      const newIngestion = this.ingestions.find(ing =>
        ing.base_url === websiteUrl && ing.status === 'in_progress'
      );
      if (newIngestion) {
        console.log('✅ Found new ingestion:', newIngestion);
        this.newlySubmittedIngestion = newIngestion;
      } else {
        console.log('⚠️ No matching in_progress ingestion found for URL:', websiteUrl);
      }
    }, 1000);
  }

  private enableAutoRefreshIfNeeded(): void {
    // Check if there are any in-progress ingestions
    const hasInProgressIngestions = this.ingestions.some(ing =>
      ing.status === 'in_progress' || ing.status === 'processing'
    );

    if (hasInProgressIngestions && !this.autoRefreshEnabled) {
      this.startAutoRefresh();
    }
  }

  startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.autoRefreshEnabled = true;
    this.refreshInterval = setInterval(() => {
      console.log('🔄 Auto-refresh triggered');
      this.loadIngestions();

      // Stop auto-refresh if no in-progress ingestions
      const hasInProgressIngestions = this.ingestions.some(ing =>
        ing.status === 'in_progress' || ing.status === 'processing'
      );

      if (!hasInProgressIngestions) {
        console.log('⏹️ Stopping auto-refresh - no in-progress ingestions');
        this.stopAutoRefresh();
      }
    }, 5000); // Refresh every 5 seconds
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

  isNewlySubmitted(ingestion: WebsiteIngestion): boolean {
    return this.newlySubmittedIngestion?.id === ingestion.id;
  }

  private checkForDuplicates(ingestions: WebsiteIngestion[]): void {
    const urlGroups = new Map<string, WebsiteIngestion[]>();

    // Group ingestions by base_url
    ingestions.forEach(ingestion => {
      const url = ingestion.base_url;
      if (!urlGroups.has(url)) {
        urlGroups.set(url, []);
      }
      urlGroups.get(url)!.push(ingestion);
    });

    // Check for duplicates
    urlGroups.forEach((group, url) => {
      if (group.length > 1) {
        console.warn('⚠️ DUPLICATE INGESTIONS DETECTED for URL:', url);
        console.warn('🔍 Duplicates:', group.map(ing => ({ id: ing.id, status: ing.status, started_at: ing.started_at })));
      }
    });
  }
}
