import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DocumentService } from '../services/document.service';
import { CategorizationService, EnhancedUploadResponse } from '../services/categorization.service';
import { AuthService } from '../services/auth.service';
import { CategorySelectorComponent } from '../shared/category-selector/category-selector.component';
import { TagSelectorComponent } from '../shared/tag-selector/tag-selector.component';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-document-upload',
  imports: [CommonModule, FormsModule, CategorySelectorComponent, TagSelectorComponent],
  templateUrl: './document-upload.component.html',
  styleUrl: './document-upload.component.scss'
})
export class DocumentUploadComponent {
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadResult: EnhancedUploadResponse | null = null;
  errorMessage: string = '';
  currentUser: any = null;

  // Categorization options
  selectedCategories: string[] = [];
  selectedTags: string[] = [];
  autoCategorize: boolean = true;
  showAdvancedOptions: boolean = false;

  constructor(
    private documentService: DocumentService,
    private categorizationService: CategorizationService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadResult = null;
      this.errorMessage = '';
    }
  }

  onUpload(): void {
    if (!this.selectedFile) {
      this.errorMessage = 'Please select a file';
      return;
    }

    if (!this.isValidFileType(this.selectedFile)) {
      this.errorMessage = 'Invalid file type. Please select a PDF, Word document, or text file.';
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';
    this.uploadResult = null;

    this.documentService.uploadDocument(
      this.selectedFile,
      this.selectedCategories.length > 0 ? this.selectedCategories : undefined,
      this.selectedTags.length > 0 ? this.selectedTags : undefined,
      this.autoCategorize
    ).subscribe({
      next: (response: EnhancedUploadResponse) => {
        this.uploadResult = response;
        this.isUploading = false;
        this.resetForm();
      },
      error: (error) => {
        this.isUploading = false;
        if (error.status === 401) {
          // Store current URL before logout so user can return after re-authentication
          this.authService.setReturnUrl(this.router.url);
          this.errorMessage = 'Session expired. Please log in again.';
          setTimeout(() => {
            this.authService.logout();
          }, 2000);
        } else if (error.error?.detail) {
          this.errorMessage = error.error.detail;
        } else {
          this.errorMessage = 'Upload failed. Please try again.';
        }
        console.error('Upload error:', error);
      }
    });
  }

  navigateToDocuments(): void {
    this.router.navigate(['/documents']);
  }

  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return allowedTypes.includes(file.type);
  }

  clearResults(): void {
    this.uploadResult = null;
    this.errorMessage = '';
  }

  resetForm(): void {
    this.selectedFile = null;
    this.selectedCategories = [];
    this.selectedTags = [];
    this.showAdvancedOptions = false;
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  toggleAdvancedOptions(): void {
    this.showAdvancedOptions = !this.showAdvancedOptions;
  }

  onCategoriesChange(categories: string[]): void {
    this.selectedCategories = categories;
  }

  onTagsChange(tags: string[]): void {
    this.selectedTags = tags;
  }

  onCategoryCreate(categoryData: {name: string, description?: string}): void {
    this.categorizationService.createCategory(categoryData).subscribe({
      next: (category) => {
        this.selectedCategories.push(category.id);
        // Refresh the category selector component
        window.location.reload(); // Temporary solution - should use proper state management
      },
      error: (error) => {
        console.error('Failed to create category:', error);
      }
    });
  }

  onTagCreate(tagName: string): void {
    this.categorizationService.createTag({ name: tagName, tag_type: 'custom' }).subscribe({
      next: (tag) => {
        this.selectedTags.push(tag.id);
        // Refresh the tag selector component
        window.location.reload(); // Temporary solution - should use proper state management
      },
      error: (error) => {
        console.error('Failed to create tag:', error);
      }
    });
  }

  getFileIcon(file: File): string {
    const type = file.type;
    if (type === 'application/pdf') return 'picture_as_pdf';
    if (type.includes('word')) return 'article';
    if (type.includes('text')) return 'description';
    if (type.includes('spreadsheet')) return 'table_chart';
    if (type.includes('presentation')) return 'slideshow';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getConfidenceColor(confidence: number): string {
    if (confidence >= 0.8) return '#10b981'; // Green
    if (confidence >= 0.6) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  }

  formatConfidence(confidence: number): string {
    return this.categorizationService.formatConfidence(confidence);
  }

  get apiUrl(): string {
    return environment.apiUrl;
  }

  get hasSelectedFile(): boolean {
    return this.selectedFile !== null;
  }

  get hasClassificationResults(): boolean {
    return this.uploadResult?.classification !== undefined;
  }

  get hasUserSpecifiedData(): boolean {
    return (this.uploadResult?.user_specified.categories?.length || 0) > 0 ||
           (this.uploadResult?.user_specified.tags?.length || 0) > 0;
  }
}
