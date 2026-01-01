import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { BillingService } from '../../services/billing.service';
import { Invoice } from '../../models/billing.models';
import { ModalService } from '../../shared/modal/modal.service';

/**
 * Invoice Details Component
 * Shows detailed invoice information
 * Allows viewing HTML invoice and sending via email
 */
@Component({
  selector: 'app-invoice-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-details.component.html',
  styleUrls: ['./invoice-details.component.scss']
})
export class InvoiceDetailsComponent implements OnInit {
  invoice: Invoice | null = null;
  loading = true;
  error: string | null = null;
  invoiceHtml: SafeHtml | null = null;
  showHtmlView = false;
  sendingEmail = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private billingService: BillingService,
    private sanitizer: DomSanitizer,
    private modalService: ModalService
  ) {}

  ngOnInit() {
    // Get invoice ID from route
    this.route.params.subscribe(params => {
      const invoiceId = params['id'];
      if (invoiceId) {
        this.loadInvoice(invoiceId);
      } else {
        this.error = 'No invoice ID provided';
        this.loading = false;
      }
    });
  }

  /**
   * Load invoice details
   */
  loadInvoice(invoiceId: string) {
    this.loading = true;
    this.error = null;

    this.billingService.getInvoiceDetails(invoiceId).subscribe({
      next: (invoice) => {
        this.invoice = invoice;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading invoice:', err);
        this.error = err.error?.detail || 'Failed to load invoice';
        this.loading = false;
      }
    });
  }

  /**
   * Load and display HTML invoice
   */
  viewHtmlInvoice() {
    if (!this.invoice) return;

    this.showHtmlView = true;

    if (!this.invoiceHtml) {
      this.billingService.getInvoiceHtml(this.invoice.id).subscribe({
        next: (html) => {
          this.invoiceHtml = this.sanitizer.bypassSecurityTrustHtml(html);
        },
        error: (err) => {
          console.error('Error loading HTML invoice:', err);
          this.modalService.error(
            'Load Failed',
            err.error?.detail || 'Failed to load HTML invoice'
          );
        }
      });
    }
  }

  /**
   * Close HTML view
   */
  closeHtmlView() {
    this.showHtmlView = false;
  }

  /**
   * Send invoice via email
   */
  async sendInvoice() {
    if (!this.invoice) return;

    const confirmed = await this.modalService.confirm(
      'Send Invoice',
      `Are you sure you want to send invoice ${this.invoice.invoice_number} via email?`,
      'Send',
      'Cancel'
    );

    if (confirmed) {
      this.sendingEmail = true;

      this.billingService.sendInvoiceEmail(this.invoice.id).subscribe({
        next: (response) => {
          this.modalService.success(
            'Invoice Sent',
            `Invoice sent successfully to ${response.sent_to}`
          );
          this.sendingEmail = false;
        },
        error: (err) => {
          this.modalService.error(
            'Send Failed',
            err.error?.detail || 'Failed to send invoice. Please try again.'
          );
          this.sendingEmail = false;
        }
      });
    }
  }

  /**
   * Print invoice (opens HTML view in print mode)
   */
  printInvoice() {
    if (!this.invoice) return;

    // Open HTML invoice in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      this.billingService.getInvoiceHtml(this.invoice.id).subscribe({
        next: (html) => {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        },
        error: (err) => {
          console.error('Error loading HTML invoice:', err);
          this.modalService.error(
            'Print Failed',
            'Failed to load invoice for printing. Please try again.'
          );
          printWindow.close();
        }
      });
    }
  }

  /**
   * Navigate back to invoice list
   */
  goBack() {
    this.router.navigate(['/invoices']);
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

  formatDateTime(dateString: string): string {
    return this.billingService.formatDateTime(dateString);
  }

  getStatusClass(status: string): string {
    return this.billingService.getInvoiceStatusClass(status);
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'completed': 'bi-check-circle-fill',
      'pending': 'bi-hourglass-split',
      'cancelled': 'bi-x-circle-fill'
    };
    return icons[status] || 'bi-file-earmark-text';
  }

  /**
   * Calculate subtotal from line items
   */
  get calculatedSubtotal(): number {
    if (!this.invoice || !this.invoice.line_items) return 0;
    return this.invoice.line_items.reduce((sum, item) => sum + item.total, 0);
  }

  /**
   * Check if invoice is overdue
   */
  get isOverdue(): boolean {
    if (!this.invoice || this.invoice.status !== 'pending') return false;
    const dueDate = new Date(this.invoice.due_date);
    return dueDate < new Date();
  }

  /**
   * Get days until/past due date
   */
  get dueDateInfo(): string {
    if (!this.invoice) return '';

    const dueDate = new Date(this.invoice.due_date);
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
}
