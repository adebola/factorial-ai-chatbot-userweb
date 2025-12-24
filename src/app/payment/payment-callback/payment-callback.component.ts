import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BillingService } from '../../services/billing.service';
import { PaymentVerificationRequest } from '../../models/billing.models';

/**
 * Payment Callback Component
 * Handles redirect from Paystack after payment attempt
 * Verifies payment and shows success/failure message
 */
@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment-callback.component.html',
  styleUrls: ['./payment-callback.component.scss']
})
export class PaymentCallbackComponent implements OnInit {
  loading = true;
  success = false;
  error: string | null = null;
  paymentReference: string | null = null;
  paymentDetails: any = null;
  verificationMessage = 'Verifying your payment...';
  countdown = 5;
  private countdownInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private billingService: BillingService
  ) {}

  ngOnInit() {
    // Get payment reference from URL query params
    this.route.queryParams.subscribe(params => {
      const reference = params['reference'] || params['trxref'];

      if (reference) {
        this.paymentReference = reference;
        this.verifyPayment(reference);
      } else {
        this.error = 'No payment reference found in callback URL';
        this.loading = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  /**
   * Verify payment with backend
   */
  verifyPayment(reference: string) {
    this.loading = true;
    this.error = null;

    const request: PaymentVerificationRequest = {
      reference: reference
    };

    this.billingService.verifyPayment(request).subscribe({
      next: (response) => {
        if (response.success) {
          this.success = true;
          this.paymentDetails = response.payment;
          this.verificationMessage = 'Payment verified successfully!';
          this.startCountdown();
        } else {
          this.success = false;
          this.error = response.message || 'Payment verification failed';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Payment verification error:', err);
        this.success = false;
        this.error = err.error?.detail || err.error?.message || 'Failed to verify payment. Please contact support.';
        this.loading = false;
      }
    });
  }

  /**
   * Start countdown before redirect
   */
  startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(this.countdownInterval);
        this.redirectToDashboard();
      }
    }, 1000);
  }

  /**
   * Redirect to dashboard
   */
  redirectToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Redirect to invoices
   */
  goToInvoices() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/invoices']);
  }

  /**
   * Redirect to payment history
   */
  goToPaymentHistory() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/payment/history']);
  }

  /**
   * Retry verification
   */
  retryVerification() {
    if (this.paymentReference) {
      this.verifyPayment(this.paymentReference);
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.billingService.formatCurrency(amount);
  }
}
