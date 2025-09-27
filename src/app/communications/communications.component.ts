import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CommunicationsService,
  EmailMessage,
  SmsMessage,
  EmailListResponse,
  SmsListResponse
} from '../services/communications.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-communications',
  imports: [CommonModule, FormsModule],
  templateUrl: './communications.component.html',
  styleUrl: './communications.component.scss'
})
export class CommunicationsComponent implements OnInit {
  // Data
  emails: EmailMessage[] = [];
  smsMessages: SmsMessage[] = [];
  selectedMessage: EmailMessage | SmsMessage | null = null;
  currentUser: any = null;

  // UI State
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  currentView: 'emails' | 'sms' = 'emails';
  isProduction = environment.production;

  // Search and filtering
  searchTerm = '';
  selectedStatus = '';
  showFilters = false;

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;

  // Available status options
  statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'sent', label: 'Sent' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'failed', label: 'Failed' }
  ];

  constructor(
    private communicationsService: CommunicationsService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadMessages();
  }

  // Load messages based on current view
  loadMessages(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const searchQuery = this.searchTerm.trim() || undefined;
    const statusFilter = this.selectedStatus || undefined;

    if (this.currentView === 'emails') {
      this.communicationsService.getEmails(
        this.currentPage,
        this.pageSize,
        searchQuery,
        statusFilter
      ).subscribe({
        next: (response: EmailListResponse) => {
          this.emails = response.emails;
          this.totalCount = response.total;
          this.totalPages = Math.ceil(response.total / response.size);
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError(error, 'Failed to load emails');
        }
      });
    } else {
      this.communicationsService.getSms(
        this.currentPage,
        this.pageSize,
        searchQuery,
        statusFilter
      ).subscribe({
        next: (response: SmsListResponse) => {
          this.smsMessages = response.messages;
          this.totalCount = response.total;
          this.totalPages = response.pages;
          this.isLoading = false;
        },
        error: (error) => {
          this.handleError(error, 'Failed to load SMS messages');
        }
      });
    }
  }

  // Handle API errors
  private handleError(error: any, defaultMessage: string): void {
    this.isLoading = false;
    if (error.status === 401) {
      // Store current URL before logout so user can return after re-authentication
      this.authService.setReturnUrl(this.router.url);
      this.authService.logout();
    } else if (error.status === 0 && error.error instanceof ProgressEvent) {
      // CORS error or network error
      this.errorMessage = 'Communications service is not accessible. Please check that the API gateway CORS configuration includes the communications service routes.';
    } else if (error.status === 404) {
      this.errorMessage = 'Communications endpoints not found. The service may not be properly configured in the API gateway.';
    } else {
      this.errorMessage = defaultMessage + '. Please try again.';
    }
    console.error('Communications API error:', error);
  }

  // Switch between email and SMS views
  switchView(view: 'emails' | 'sms'): void {
    this.currentView = view;
    this.currentPage = 1;
    this.selectedMessage = null;
    this.loadMessages();
  }

  // Search functionality
  onSearch(): void {
    this.currentPage = 1;
    this.loadMessages();
  }

  // Clear search
  clearSearch(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadMessages();
  }

  // Toggle filters panel
  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadMessages();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadMessages();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadMessages();
    }
  }

  // View message details
  viewMessage(message: EmailMessage | SmsMessage): void {
    this.selectedMessage = message;
  }

  closeMessageDetails(): void {
    this.selectedMessage = null;
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

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'sent':
      case 'delivered':
        return 'status-success';
      case 'pending':
        return 'status-warning';
      case 'failed':
        return 'status-error';
      default:
        return 'status-default';
    }
  }

  isEmailMessage(message: EmailMessage | SmsMessage): message is EmailMessage {
    return 'subject' in message;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  getPaginationArray(): number[] {
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }
}
