import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UploadService, UploadResponse } from '../services/upload.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-document-upload',
  imports: [CommonModule, FormsModule],
  templateUrl: './document-upload.component.html',
  styleUrl: './document-upload.component.scss'
})
export class DocumentUploadComponent {
  selectedFile: File | null = null;
  isUploading: boolean = false;
  uploadResult: UploadResponse | null = null;
  errorMessage: string = '';
  currentUser: any = null;

  constructor(
    private uploadService: UploadService,
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

    this.isUploading = true;
    this.errorMessage = '';
    this.uploadResult = null;

    this.uploadService.uploadDocument(this.selectedFile).subscribe({
      next: (response: UploadResponse) => {
        this.uploadResult = response;
        this.isUploading = false;
        this.selectedFile = null;
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      },
      error: (error) => {
        this.isUploading = false;
        if (error.status === 401) {
          this.errorMessage = 'Session expired. Please log in again.';
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
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

  get apiUrl(): string {
    return environment.apiUrl;
  }
}
