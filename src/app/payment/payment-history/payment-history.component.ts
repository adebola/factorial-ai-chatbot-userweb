import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { Payment, PaymentStatus } from '../../models/billing.models';

/**
 * Payment History Component
 * Displays list of all payments with pagination
 * Shows payment status, amount, date, and method
 */
@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {
  payments: Payment[] = [];
  loading = true;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPayments = 0;
  hasMore = false;

  // Filtering
  selectedStatus: string = 'all';
  paymentStatuses = Object.values(PaymentStatus);

  constructor(
    private billingService: BillingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPayments();
  }

  /**
   * Load payments with pagination
   */
  loadPayments() {
    this.loading = true;
    this.error = null;

    const offset = (this.currentPage - 1) * this.pageSize;

    this.billingService.getPaymentHistory({
      limit: this.pageSize,
      offset: offset
    }).subscribe({
      next: (response) => {
        this.payments = response.payments;
        this.totalPayments = response.total;
        this.hasMore = response.has_more;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading payment history:', err);
        this.error = err.error?.detail || 'Failed to load payment history';
        this.loading = false;
      }
    });
  }

  /**
   * Filter payments by status
   */
  get filteredPayments(): Payment[] {
    if (this.selectedStatus === 'all') {
      return this.payments;
    }
    return this.payments.filter(p => p.status === this.selectedStatus);
  }

  /**
   * Go to next page
   */
  nextPage() {
    if (this.hasMore) {
      this.currentPage++;
      this.loadPayments();
    }
  }

  /**
   * Go to previous page
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPayments();
    }
  }

  /**
   * Go to specific page
   */
  goToPage(page: number) {
    this.currentPage = page;
    this.loadPayments();
  }

  /**
   * Get total pages
   */
  get totalPages(): number {
    return Math.ceil(this.totalPayments / this.pageSize);
  }

  /**
   * Get page numbers for pagination
   */
  get pageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number, currency: string = 'NGN'): string {
    return this.billingService.formatCurrency(amount, currency);
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    return this.billingService.formatDate(dateString);
  }

  /**
   * Format payment method for display
   */
  formatPaymentMethod(method: string): string {
    return method.replace(/_/g, ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  /**
   * Format date and time
   */
  formatDateTime(dateString: string): string {
    return this.billingService.formatDateTime(dateString);
  }

  /**
   * Get status badge class
   */
  getStatusClass(status: string): string {
    return this.billingService.getPaymentStatusClass(status);
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      [PaymentStatus.COMPLETED]: 'bi-check-circle-fill',
      [PaymentStatus.PROCESSING]: 'bi-clock-fill',
      [PaymentStatus.PENDING]: 'bi-hourglass-split',
      [PaymentStatus.FAILED]: 'bi-x-circle-fill',
      [PaymentStatus.REFUNDED]: 'bi-arrow-counterclockwise'
    };
    return icons[status] || 'bi-question-circle';
  }

  /**
   * Get payment method icon
   */
  getPaymentMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      'card': 'bi-credit-card-fill',
      'bank_transfer': 'bi-bank',
      'ussd': 'bi-phone-fill',
      'qr': 'bi-qr-code',
      'mobile_money': 'bi-phone-fill'
    };
    return icons[method] || 'bi-wallet2';
  }

  /**
   * View invoice for payment
   */
  viewInvoice(payment: Payment) {
    // Navigate to invoices and try to find invoice for this payment's subscription
    this.router.navigate(['/invoices']);
  }

  /**
   * Refresh payment list
   */
  refresh() {
    this.currentPage = 1;
    this.loadPayments();
  }

  /**
   * Go back to dashboard
   */
  goBack() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Change status filter
   */
  onStatusFilterChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.selectedStatus = target.value;
  }
}
