import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import {
  // Payment models
  PaymentInitializationRequest,
  PaymentInitializationResponse,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
  PaymentHistoryResponse,
  Payment,
  // Subscription models
  UpgradeRequest,
  DowngradeRequest,
  CancelRequest,
  PlanChangePreviewResponse,
  UpgradeResponse,
  DowngradeResponse,
  CancelResponse,
  ReactivateResponse,
  Subscription,
  // Invoice models
  Invoice,
  InvoiceListResponse,
  SendInvoiceResponse,
  // Analytics models
  RevenueMetrics,
  SubscriptionMetrics,
  UsageAnalytics,
  PaymentAnalytics,
  ChurnAnalytics,
  DashboardSummary,
  // Utility types
  PaginationParams,
  DateRangeParams
} from '../models/billing.models';

/**
 * Billing Service
 * Comprehensive service for managing payments, subscriptions, invoices, and analytics
 * Integrates with the backend billing service (Phases 0-8)
 */
@Injectable({
  providedIn: 'root'
})
export class BillingService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get HTTP headers with authorization
   */
  private getHttpHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // ==========================================================================
  // PAYMENT METHODS (Phase 4)
  // ==========================================================================

  /**
   * Initialize payment for a subscription
   * POST /api/v1/payments/initialize
   */
  initializePayment(request: PaymentInitializationRequest): Observable<PaymentInitializationResponse> {
    return this.http.post<PaymentInitializationResponse>(
      `${this.baseUrl}/payments/initialize`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Verify payment after Paystack callback
   * POST /api/v1/payments/verify
   */
  verifyPayment(request: PaymentVerificationRequest): Observable<PaymentVerificationResponse> {
    return this.http.post<PaymentVerificationResponse>(
      `${this.baseUrl}/payments/verify`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Get payment history with pagination
   * GET /api/v1/payments/history
   */
  getPaymentHistory(params?: PaginationParams): Observable<PaymentHistoryResponse> {
    let httpParams = new HttpParams();

    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http.get<PaymentHistoryResponse>(
      `${this.baseUrl}/payments/history`,
      {
        headers: this.getHttpHeaders(),
        params: httpParams
      }
    );
  }

  /**
   * Get saved payment methods
   * GET /api/v1/payment-methods
   */
  getPaymentMethods(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/payment-methods`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Delete a saved payment method
   * DELETE /api/v1/payment-methods/{method_id}
   */
  deletePaymentMethod(methodId: string): Observable<any> {
    return this.http.delete(
      `${this.baseUrl}/payment-methods/${methodId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT METHODS (Phase 5)
  // ==========================================================================

  /**
   * Preview plan change before committing
   * GET /api/v1/subscriptions/{id}/preview-change/{plan_id}
   */
  previewPlanChange(subscriptionId: string, newPlanId: string): Observable<PlanChangePreviewResponse> {
    return this.http.get<PlanChangePreviewResponse>(
      `${this.baseUrl}/subscriptions/${subscriptionId}/preview-change/${newPlanId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Upgrade subscription to higher-tier plan
   * POST /api/v1/subscriptions/{id}/upgrade
   */
  upgradeSubscription(subscriptionId: string, request: UpgradeRequest): Observable<UpgradeResponse> {
    return this.http.post<UpgradeResponse>(
      `${this.baseUrl}/subscriptions/${subscriptionId}/upgrade`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Downgrade subscription to lower-tier plan
   * POST /api/v1/subscriptions/{id}/downgrade
   */
  downgradeSubscription(subscriptionId: string, request: DowngradeRequest): Observable<DowngradeResponse> {
    return this.http.post<DowngradeResponse>(
      `${this.baseUrl}/subscriptions/${subscriptionId}/downgrade`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Cancel subscription
   * POST /api/v1/subscriptions/{id}/cancel
   */
  cancelSubscription(subscriptionId: string, request: CancelRequest): Observable<CancelResponse> {
    return this.http.post<CancelResponse>(
      `${this.baseUrl}/subscriptions/${subscriptionId}/cancel`,
      request,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Reactivate cancelled subscription
   * POST /api/v1/subscriptions/{id}/reactivate
   */
  reactivateSubscription(subscriptionId: string): Observable<ReactivateResponse> {
    return this.http.post<ReactivateResponse>(
      `${this.baseUrl}/subscriptions/${subscriptionId}/reactivate`,
      {},
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Get current subscription details
   * Note: This is an extension - you may need to add this endpoint to backend
   * or use existing tenant info to get subscription ID
   */
  getCurrentSubscription(): Observable<Subscription> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant ID found for current user');
    }

    return this.http.get<{ subscription: Subscription; has_subscription: boolean }>(
      `${this.baseUrl}/subscriptions/current`,
      { headers: this.getHttpHeaders() }
    ).pipe(
      map(response => response.subscription)
    );
  }

  // ==========================================================================
  // INVOICE METHODS (Phase 6)
  // ==========================================================================

  /**
   * Get invoice history with pagination and filtering
   * GET /api/v1/invoices
   */
  getInvoices(params?: PaginationParams): Observable<InvoiceListResponse> {
    let httpParams = new HttpParams();

    if (params?.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }
    if (params?.offset) {
      httpParams = httpParams.set('offset', params.offset.toString());
    }

    return this.http.get<InvoiceListResponse>(
      `${this.baseUrl}/invoices`,
      {
        headers: this.getHttpHeaders(),
        params: httpParams
      }
    );
  }

  /**
   * Get detailed invoice information
   * GET /api/v1/invoices/{id}
   */
  getInvoiceDetails(invoiceId: string): Observable<Invoice> {
    return this.http.get<Invoice>(
      `${this.baseUrl}/invoices/${invoiceId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Get HTML invoice for viewing/printing
   * GET /api/v1/invoices/{id}/html
   */
  getInvoiceHtml(invoiceId: string): Observable<string> {
    return this.http.get(
      `${this.baseUrl}/invoices/${invoiceId}/html`,
      {
        headers: this.getHttpHeaders(),
        responseType: 'text'
      }
    );
  }

  /**
   * Get invoice by invoice number
   * GET /api/v1/invoices/number/{invoice_number}
   */
  getInvoiceByNumber(invoiceNumber: string): Observable<Invoice> {
    return this.http.get<Invoice>(
      `${this.baseUrl}/invoices/number/${invoiceNumber}`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Send invoice via email
   * POST /api/v1/invoices/{id}/send
   */
  sendInvoiceEmail(invoiceId: string): Observable<SendInvoiceResponse> {
    return this.http.post<SendInvoiceResponse>(
      `${this.baseUrl}/invoices/${invoiceId}/send`,
      {},
      { headers: this.getHttpHeaders() }
    );
  }

  // ==========================================================================
  // ANALYTICS METHODS (Phase 8) - Admin Only
  // ==========================================================================

  /**
   * Get revenue metrics (MRR, ARR, growth, ARPU)
   * GET /api/v1/analytics/revenue
   * Admin only
   */
  getRevenueMetrics(params?: DateRangeParams): Observable<RevenueMetrics> {
    let httpParams = new HttpParams();

    if (params?.start_date) {
      httpParams = httpParams.set('start_date', params.start_date);
    }
    if (params?.end_date) {
      httpParams = httpParams.set('end_date', params.end_date);
    }

    return this.http.get<RevenueMetrics>(
      `${this.baseUrl}/analytics/revenue`,
      {
        headers: this.getHttpHeaders(),
        params: httpParams
      }
    );
  }

  /**
   * Get subscription metrics (status distribution, churn)
   * GET /api/v1/analytics/subscriptions
   * Admin only
   */
  getSubscriptionMetrics(): Observable<SubscriptionMetrics> {
    return this.http.get<SubscriptionMetrics>(
      `${this.baseUrl}/analytics/subscriptions`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Get usage analytics (resource consumption patterns)
   * GET /api/v1/analytics/usage
   * Admin only
   */
  getUsageAnalytics(): Observable<UsageAnalytics> {
    return this.http.get<UsageAnalytics>(
      `${this.baseUrl}/analytics/usage`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Get payment analytics (success rates, trends)
   * GET /api/v1/analytics/payments
   * Admin only
   */
  getPaymentAnalytics(params?: DateRangeParams): Observable<PaymentAnalytics> {
    let httpParams = new HttpParams();

    if (params?.start_date) {
      httpParams = httpParams.set('start_date', params.start_date);
    }
    if (params?.end_date) {
      httpParams = httpParams.set('end_date', params.end_date);
    }

    return this.http.get<PaymentAnalytics>(
      `${this.baseUrl}/analytics/payments`,
      {
        headers: this.getHttpHeaders(),
        params: httpParams
      }
    );
  }

  /**
   * Get churn analysis
   * GET /api/v1/analytics/churn
   * Admin only
   */
  getChurnAnalytics(): Observable<ChurnAnalytics> {
    return this.http.get<ChurnAnalytics>(
      `${this.baseUrl}/analytics/churn`,
      { headers: this.getHttpHeaders() }
    );
  }

  /**
   * Get consolidated dashboard summary
   * GET /api/v1/analytics/dashboard
   * Admin only
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(
      `${this.baseUrl}/analytics/dashboard`,
      { headers: this.getHttpHeaders() }
    );
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Check if current user has admin role
   */
  hasAdminRole(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.roles?.includes('ROLE_TENANT_ADMIN') || user?.is_tenant_admin || false;
  }

  /**
   * Format currency amount
   */
  formatCurrency(amount: number, currency: string = 'NGN'): string {
    const currencySymbol = currency === 'NGN' ? '₦' : currency === 'USD' ? '$' : currency;
    return `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  /**
   * Format date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Format date and time
   */
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Get status badge class for subscription status
   */
  getSubscriptionStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'active': 'badge-success',
      'trialing': 'badge-info',
      'pending': 'badge-warning',
      'past_due': 'badge-warning',
      'cancelled': 'badge-danger',
      'expired': 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  }

  /**
   * Get status badge class for payment status
   */
  getPaymentStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'completed': 'badge-success',
      'processing': 'badge-info',
      'pending': 'badge-warning',
      'failed': 'badge-danger',
      'refunded': 'badge-secondary'
    };
    return statusMap[status] || 'badge-secondary';
  }

  /**
   * Get status badge class for invoice status
   */
  getInvoiceStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'completed': 'badge-success',
      'pending': 'badge-warning',
      'cancelled': 'badge-danger'
    };
    return statusMap[status] || 'badge-secondary';
  }

  /**
   * Calculate percentage
   */
  calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Get usage warning level based on percentage
   */
  getUsageWarningLevel(percentage: number): 'success' | 'warning' | 'danger' {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  }
}
