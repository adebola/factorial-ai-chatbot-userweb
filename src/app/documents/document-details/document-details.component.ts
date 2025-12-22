import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  DocumentService,
  DocumentMetadata
} from '../../services/document.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-document-details',
  imports: [CommonModule, RouterModule],
  templateUrl: './document-details.component.html',
  styleUrl: './document-details.component.scss'
})
export class DocumentDetailsComponent implements OnInit, OnDestroy {
  documentId: string = '';
  metadata: DocumentMetadata | null = null;
  isLoading = false;
  errorMessage = '';

  private refreshInterval: any;
  autoRefreshEnabled = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private documentService: DocumentService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.documentId = params['id'];
      if (this.documentId) {
        this.loadDocumentMetadata();
        this.startAutoRefreshIfNeeded();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadDocumentMetadata(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentService.getDocumentMetadata(this.documentId).subscribe({
      next: (response) => {
        this.metadata = response;
        this.isLoading = false;

        // Check if we should continue auto-refresh
        if (this.autoRefreshEnabled &&
            this.metadata.status !== 'processing') {
          this.stopAutoRefresh();
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.logout();
        } else if (error.status === 404) {
          this.errorMessage = 'Document not found or access denied';
        } else {
          this.errorMessage = 'Failed to load document details';
        }
        console.error('Load document metadata error:', error);
      }
    });
  }

  private startAutoRefreshIfNeeded(): void {
    // We'll check if document is processing after first load
    // Auto-refresh will be enabled based on status
  }

  startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.autoRefreshEnabled = true;
    this.refreshInterval = setInterval(() => {
      this.loadDocumentMetadata();

      if (this.metadata?.status !== 'processing') {
        this.stopAutoRefresh();
      }
    }, 5000); // 5 seconds
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
    this.router.navigate(['/documents']);
  }

  // Helper methods
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
      case 'processing':
        return 'status-processing';
      case 'failed':
      case 'error':
        return 'status-error';
      default:
        return 'status-pending';
    }
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return 'confidence-high';
    if (confidence >= 0.6) return 'confidence-medium';
    return 'confidence-low';
  }

  formatConfidence(confidence: number): string {
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

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  getContentTypePercentage(count: number): number {
    if (!this.metadata) return 0;
    const total = this.metadata.processing_stats.chunk_count;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  }

  hasCategorizationData(): boolean {
    return !!(this.metadata?.categories && this.metadata.categories.length > 0) ||
           !!(this.metadata?.tags && this.metadata.tags.length > 0);
  }
}
