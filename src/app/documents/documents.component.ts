import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentsService, Document, DocumentsListResponse } from '../services/documents.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-documents',
  imports: [CommonModule, FormsModule],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  documents: Document[] = [];
  allDocuments: Document[] = []; // Keep track of all documents including failed ones
  selectedDocuments: Set<string> = new Set();
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUser: any = null;
  failedDocumentsCount = 0;
  isProduction = environment.production;


  constructor(
    private documentsService: DocumentsService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadDocuments();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.documentsService.getDocuments().subscribe({
      next: (response: DocumentsListResponse) => {
        // Store all documents for reference
        this.allDocuments = response.documents;

        // Filter out failed documents - only show completed and processing documents
        this.documents = response.documents.filter(doc =>
          doc.status !== 'failed' && doc.status !== 'error'
        );

        // Count failed documents for informational purposes
        this.failedDocumentsCount = response.documents.filter(doc =>
          doc.status === 'failed' || doc.status === 'error'
        ).length;

        // Log failed documents information if any exist
        if (this.failedDocumentsCount > 0) {
          console.info(`${this.failedDocumentsCount} failed document(s) hidden from view`);
          const failedDocs = response.documents.filter(doc =>
            doc.status === 'failed' || doc.status === 'error'
          );
          console.info('Failed documents:', failedDocs.map(doc => ({
            filename: doc.filename,
            error: doc.error_message,
            created_at: doc.created_at
          })));
        }

        this.isLoading = false;
        this.selectedDocuments.clear();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load documents. Please try again.';
        }
        console.error('Load documents error:', error);
      }
    });
  }

  toggleDocumentSelection(documentId: string): void {
    if (this.selectedDocuments.has(documentId)) {
      this.selectedDocuments.delete(documentId);
    } else {
      this.selectedDocuments.add(documentId);
    }
  }

  toggleSelectAll(): void {
    if (this.selectedDocuments.size === this.documents.length) {
      this.selectedDocuments.clear();
    } else {
      this.selectedDocuments.clear();
      this.documents.forEach(doc => this.selectedDocuments.add(doc.id));
    }
  }


  // Additional functionality with backend routes
  deleteSelectedDocuments(): void {
    if (this.selectedDocuments.size === 0) {
      this.errorMessage = 'Please select documents to delete';
      return;
    }

    if (!confirm(`Are you sure you want to delete ${this.selectedDocuments.size} document(s)?`)) {
      return;
    }

    const documentIds = Array.from(this.selectedDocuments);

    this.documentsService.deleteMultipleDocuments(documentIds).subscribe({
      next: (response) => {
        this.successMessage = `Documents deleted successfully: ${response.deleted_count}/${response.total_requested}`;
        this.loadDocuments();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to delete documents';
        console.error('Delete documents error:', error);
      }
    });
  }

  deleteDocument(documentId: string): void {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    this.documentsService.deleteDocument(documentId).subscribe({
      next: (response) => {
        this.successMessage = `Document deleted successfully: ${response.filename}`;
        this.loadDocuments();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to delete document';
        console.error('Delete document error:', error);
      }
    });
  }

  downloadDocument(documentId: string): void {
    this.documentsService.downloadDocument(documentId).subscribe({
      next: (blob) => {
        const document = this.documents.find(d => d.id === documentId);
        const filename = document?.filename || 'document';

        const url = window.URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);

        this.successMessage = `Document downloaded: ${filename}`;
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to download document';
        console.error('Download document error:', error);
      }
    });
  }


  navigateToUpload(): void {
    this.router.navigate(['/upload']);
  }

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
      case 'completed':
      case 'processed':
        return 'status-success';
      case 'processing':
      case 'in_progress':
        return 'status-processing';
      case 'failed':
      case 'error':
        return 'status-error';
      default:
        return 'status-pending';
    }
  }

  // For debugging/admin purposes - method to view all documents including failed ones
  showAllDocuments(): void {
    if (this.allDocuments.length > 0) {
      console.table(this.allDocuments.map(doc => ({
        filename: doc.filename,
        status: doc.status,
        error_message: doc.error_message,
        created_at: doc.created_at
      })));
    }
  }
}
