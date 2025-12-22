import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { DocumentService, Document, DocumentListResponse, DocumentFilters, DocumentMetadata } from '../services/document.service';
import { CategorizationService, DocumentCategory, DocumentTag } from '../services/categorization.service';
import { AuthService } from '../services/auth.service';
import { CategorySelectorComponent } from '../shared/category-selector/category-selector.component';
import { TagSelectorComponent } from '../shared/tag-selector/tag-selector.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-documents',
  imports: [CommonModule, FormsModule, RouterModule, CategorySelectorComponent, TagSelectorComponent],
  templateUrl: './documents.component.html',
  styleUrl: './documents.component.scss'
})
export class DocumentsComponent implements OnInit {
  documents: Document[] = [];
  selectedDocuments: Set<string> = new Set();
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentUser: any = null;
  isProduction = environment.production;
  failedDocumentsCount = 0;

  // Filtering and search
  searchTerm = '';
  selectedCategories: string[] = [];
  selectedTags: string[] = [];
  selectedContentType = '';
  showFilters = false;

  // Pagination
  currentPage = 1;
  pageSize = 20;
  totalCount = 0;

  // Available options for filtering
  categories: DocumentCategory[] = [];
  tags: DocumentTag[] = [];
  contentTypes = [
    { value: '', label: 'All Types' },
    { value: 'application/pdf', label: 'PDF Documents' },
    { value: 'text/plain', label: 'Text Files' },
    { value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', label: 'Word Documents' },
    { value: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', label: 'Excel Files' },
    { value: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', label: 'PowerPoint Files' }
  ];

  constructor(
    private documentService: DocumentService,
    private categorizationService: CategorizationService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadDocuments();
    this.loadFilters();
  }

  private loadFilters(): void {
    this.loadFilterOptions();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filters: DocumentFilters = {};
    if (this.selectedCategories.length > 0) {
      filters.categories = this.selectedCategories;
    }
    if (this.selectedTags.length > 0) {
      filters.tags = this.selectedTags;
    }
    if (this.selectedContentType) {
      filters.content_type = this.selectedContentType;
    }

    this.documentService.getDocuments(this.currentPage, this.pageSize, filters).subscribe({
      next: (response: DocumentListResponse) => {
        this.documents = response.documents;
        this.totalCount = response.total_count;
        this.isLoading = false;
        this.selectedDocuments.clear();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          // Store current URL before logout so user can return after re-authentication
          this.authService.setReturnUrl(this.router.url);
          this.authService.logout();
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


  // Load filter options
  loadFilterOptions(): void {
    this.categorizationService.getCategories(true).subscribe({
      next: (response) => {
        this.categories = response.categories;
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
      }
    });

    this.categorizationService.getTags().subscribe({
      next: (response) => {
        this.tags = response.tags;
      },
      error: (error) => {
        console.error('Failed to load tags:', error);
      }
    });
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
    let deletedCount = 0;

    // Delete documents one by one since we don't have bulk delete in the new service
    const deletePromises = documentIds.map(id =>
      this.documentService.deleteDocument(id).toPromise()
        .then(() => deletedCount++)
        .catch(error => console.error('Failed to delete document:', error))
    );

    Promise.all(deletePromises).then(() => {
      this.successMessage = `${deletedCount} document(s) deleted successfully`;
      this.loadDocuments();
      setTimeout(() => this.successMessage = '', 5000);
    });
  }

  deleteDocument(documentId: string): void {
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    this.documentService.deleteDocument(documentId).subscribe({
      next: (response) => {
        this.successMessage = `Document deleted successfully`;
        this.loadDocuments();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to delete document';
        console.error('Delete document error:', error);
      }
    });
  }

  // Filtering methods
  onCategoriesChange(categories: string[]): void {
    this.selectedCategories = categories;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadDocuments();
  }

  onTagsChange(tags: string[]): void {
    this.selectedTags = tags;
    this.currentPage = 1; // Reset to first page when filtering
    this.loadDocuments();
  }

  onContentTypeChange(): void {
    this.currentPage = 1; // Reset to first page when filtering
    this.loadDocuments();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  clearFilters(): void {
    this.selectedCategories = [];
    this.selectedTags = [];
    this.selectedContentType = '';
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadDocuments();
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadDocuments();
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

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10b981'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }

  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Helper methods for UI
  getCategoryById(categoryId: string): DocumentCategory | undefined {
    return this.categories.find(cat => cat.id === categoryId);
  }

  getTagById(tagId: string): DocumentTag | undefined {
    return this.tags.find(tag => tag.id === tagId);
  }

  getFileIcon(contentType: string): string {
    if (contentType === 'application/pdf') return 'picture_as_pdf';
    if (contentType.includes('word')) return 'article';
    if (contentType.includes('text')) return 'description';
    if (contentType.includes('spreadsheet')) return 'table_chart';
    if (contentType.includes('presentation')) return 'slideshow';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getContentTypeName(contentType: string): string {
    return this.documentService.getContentTypeName(contentType);
  }

  hasActiveFilters(): boolean {
    return this.selectedCategories.length > 0 ||
           this.selectedTags.length > 0 ||
           this.selectedContentType !== '' ||
           this.searchTerm !== '';
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.selectedCategories.length > 0) count++;
    if (this.selectedTags.length > 0) count++;
    if (this.selectedContentType) count++;
    if (this.searchTerm) count++;
    return count;
  }

  // Update document categorization
  updateDocumentCategorization(documentId: string): void {
    const document = this.documents.find(d => d.id === documentId);
    if (!document) return;

    // This would open a modal or navigate to an edit page
    // For now, we'll just log the action
    console.log('Update categorization for document:', document.filename);
  }

  // Status helper method
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

  // Download document (placeholder for now)
  downloadDocument(documentId: string): void {
    const document = this.documents.find(d => d.id === documentId);
    if (!document) return;

    // Placeholder - would integrate with document download API
    this.successMessage = `Download functionality not yet implemented for: ${document.filename}`;
    setTimeout(() => this.successMessage = '', 3000);
  }

}
