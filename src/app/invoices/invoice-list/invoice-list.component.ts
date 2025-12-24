import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { Invoice, InvoiceStatus } from '../../models/billing.models';

/**
 * Invoice List Component
 * Displays all invoices with pagination and filtering
 * Allows viewing invoice details and downloading/emailing invoices
 */
@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-list.component.html',
  styleUrls: ['./invoice-list.component.scss']
})
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  loading = true;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalInvoices = 0;
  hasMore = false;

  // Filtering
  selectedStatus: string = 'all';
  invoiceStatuses = Object.values(InvoiceStatus);

  constructor(
    private billingService: BillingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadInvoices();
  }

  /**
   * Load invoices with pagination
   */
  loadInvoices() {
    this.loading = true;
    this.error = null;

    const offset = (this.currentPage - 1) * this.pageSize;

    this.billingService.getInvoices({
      limit: this.pageSize,
      offset: offset
    }).subscribe({
      next: (response) => {
        this.invoices = response.invoices;
        this.totalInvoices = response.total;
        this.hasMore = response.has_more;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading invoices:', err);
        this.error = err.error?.detail || 'Failed to load invoices';
        this.loading = false;
      }
    });
  }

  /**
   * Filter invoices by status
   */
  get filteredInvoices(): Invoice[] {
    if (this.selectedStatus === 'all') {
      return this.invoices;
    }
    return this.invoices.filter(inv => inv.status === this.selectedStatus);
  }

  /**
   * View invoice details
   */
  viewInvoice(invoice: Invoice) {
    this.router.navigate(['/invoices', invoice.id]);
  }

  /**
   * Send invoice via email
   */
  sendInvoice(invoice: Invoice, event: Event) {
    event.stopPropagation();

    if (confirm(`Send invoice ${invoice.invoice_number} via email?`)) {
      this.billingService.sendInvoiceEmail(invoice.id).subscribe({
        next: (response) => {
          alert(`Invoice sent successfully to ${response.sent_to}`);
        },
        error: (err) => {
          alert(err.error?.detail || 'Failed to send invoice');
        }
      });
    }
  }

  /**
   * Pagination methods
   */
  nextPage() {
    if (this.hasMore) {
      this.currentPage++;
      this.loadInvoices();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadInvoices();
    }
  }

  goToPage(page: number) {
    this.currentPage = page;
    this.loadInvoices();
  }

  get totalPages(): number {
    return Math.ceil(this.totalInvoices / this.pageSize);
  }

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
   * Formatting methods
   */
  formatCurrency(amount: number, currency: string = 'NGN'): string {
    return this.billingService.formatCurrency(amount, currency);
  }

  formatDate(dateString: string): string {
    return this.billingService.formatDate(dateString);
  }

  getStatusClass(status: string): string {
    return this.billingService.getInvoiceStatusClass(status);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      [InvoiceStatus.COMPLETED]: 'bi-check-circle-fill',
      [InvoiceStatus.PENDING]: 'bi-hourglass-split',
      [InvoiceStatus.CANCELLED]: 'bi-x-circle-fill'
    };
    return icons[status] || 'bi-file-earmark-text';
  }

  /**
   * Check if invoice is overdue
   */
  isOverdue(invoice: Invoice): boolean {
    if (invoice.status !== InvoiceStatus.PENDING) {
      return false;
    }
    const dueDate = new Date(invoice.due_date);
    return dueDate < new Date();
  }

  /**
   * Get days until/past due date
   */
  getDueDateInfo(invoice: Invoice): string {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  }

  /**
   * Refresh invoice list
   */
  refresh() {
    this.currentPage = 1;
    this.loadInvoices();
  }

  /**
   * Navigate back
   */
  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
