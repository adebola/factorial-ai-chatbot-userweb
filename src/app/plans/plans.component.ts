import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DashboardService } from '../services/dashboard.service';
import { AuthService } from '../services/auth.service';
import { PaystackService } from '../services/paystack.service';
import { BillingService } from '../services/billing.service';
import { Subscription } from '../models/billing.models';
import { environment } from '../../environments/environment';

interface Plan {
  id: string;
  name: string;
  description?: string;
  document_limit: number;
  website_limit: number;
  daily_chat_limit: number;
  monthly_chat_limit: number;
  monthly_plan_cost: string;
  yearly_plan_cost: string;
  features: any;
  is_active: boolean;
  is_current?: boolean;
}

interface CurrentPlanResponse {
  tenant_info: any;
  current_plan: Plan;
  available_plans: Plan[];
  can_switch_plans: boolean;
}

interface PlanSwitchPreview {
  preview: {
    current_plan: { id: string; name: string; cost: number };
    new_plan: { id: string; name: string; cost: number; description?: string };
    billing_cycle: string;
  };
  billing_info: {
    old_cost: number;
    new_cost: number;
    prorated_amount: number;
    is_upgrade: boolean;
    is_downgrade: boolean;
    currency: string;
  };
  requires_payment: boolean;
  effective_immediately: boolean;
  scheduled_for_period_end: boolean;
  message: string;
  action_required?: string;
}

@Component({
  selector: 'app-plans',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plans.component.html',
  styleUrls: ['./plans.component.scss']
})
export class PlansComponent implements OnInit {
  plans: Plan[] = [];
  currentPlan: Plan | null = null;
  tenantInfo: any = null;
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  loading = true;
  switching = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Payment modal state
  showPaymentModal = false;
  selectedPlan: Plan | null = null;
  switchPreview: PlanSwitchPreview | null = null;
  processingPayment = false;

  // Renewal modal state
  showRenewalModal = false;
  renewalDetails: {
    amount: number;
    currency: string;
    payment_url: string;
    payment_reference: string;
    new_period_end: string;
  } | null = null;
  processingRenewal = false;

  // Subscription information
  currentSubscription: Subscription | null = null;
  subscriptionLoading = false;

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private paystackService: PaystackService,
    private billingService: BillingService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPlansData();
    this.loadSubscriptionInfo();
  }

  /**
   * Load current subscription information
   */
  loadSubscriptionInfo() {
    this.subscriptionLoading = true;

    this.billingService.getCurrentSubscription().subscribe({
      next: (subscription) => {
        console.log('Loaded subscription:', subscription);
        this.currentSubscription = subscription;
        this.subscriptionLoading = false;
      },
      error: (error) => {
        console.error('Error loading subscription:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        this.subscriptionLoading = false;
        // Don't show error to user - subscription might not exist yet
      }
    });
  }

  loadPlansData() {
    this.loading = true;
    this.error = null;

    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (tenantId) {
      // Load both tenant and subscription in parallel
      forkJoin({
        tenant: this.dashboardService.getTenantInfo(),
        subscription: this.billingService.getCurrentSubscription().pipe(
          catchError(error => {
            console.warn('[PLANS] No subscription found, using tenant plan');
            return of(null);
          })
        )
      }).subscribe({
        next: ({ tenant, subscription }) => {
          this.tenantInfo = tenant;

          // Determine authoritative plan ID
          const subscriptionPlanId = subscription?.plan_id;
          const tenantPlanId = tenant.planId;

          // Log mismatch if detected
          if (subscriptionPlanId && tenantPlanId && subscriptionPlanId !== tenantPlanId) {
            console.warn(
              '🚨 [PLANS PAGE] Plan mismatch detected',
              {
                subscription_plan_id: subscriptionPlanId,
                tenant_plan_id: tenantPlanId,
                authoritative_source: 'subscription.plan_id'
              }
            );
          }

          // Use subscription.plan_id as authoritative source
          const authoritativePlanId = subscriptionPlanId || tenantPlanId;

          if (authoritativePlanId) {
            this.dashboardService.getPlanDetails(authoritativePlanId).subscribe({
              next: (response) => {
                if (response.plan) {
                  this.currentPlan = response.plan;
                  console.log(
                    '✅ [PLANS] Current plan:',
                    response.plan.name,
                    `(source: ${subscriptionPlanId ? 'subscription' : 'tenant'})`
                  );
                }
                this.loadPublicPlans();
              },
              error: (error: any) => {
                console.error('❌ [PLANS] Error loading current plan:', error);
                this.loadPublicPlans();
              }
            });
          } else {
            console.warn('⚠️ [PLANS] No plan ID found');
            this.loadPublicPlans();
          }
        },
        error: (error: any) => {
          console.error('❌ [PLANS] Error loading tenant/subscription:', error);
          this.loadPublicPlans();
        }
      });
    } else {
      this.loadPublicPlans();
    }
  }

  loadPublicPlans() {
    this.dashboardService.getPublicPlans().subscribe({
      next: (response) => {
        // Sort plans by cost (ascending), so Enterprise (most expensive) appears last
        // Treat cost of 0 as infinity (highest value) for Enterprise plan
        this.plans = (response.plans || []).sort((a: Plan, b: Plan) => {
          const costA = this.getPlanCost(a);
          const costB = this.getPlanCost(b);

          // If costA is 0, it should come after costB (return positive)
          if (costA === 0) return 1;
          // If costB is 0, it should come after costA (return negative)
          if (costB === 0) return -1;

          return costA - costB;
        });
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading public plans:', error);
        this.error = 'Failed to load plans. Please try again later.';
        this.loading = false;
      }
    });
  }

  getPlanCost(plan: Plan): number {
    return parseFloat(this.billingCycle === 'yearly' ? plan.yearly_plan_cost : plan.monthly_plan_cost);
  }

  formatNumber(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  }

  formatLimit(value: number): string {
    // -1 means unlimited
    return value === -1 ? 'Unlimited' : this.formatNumber(value);
  }

  getPlanCostDisplay(plan: Plan): string {
    const cost = this.getPlanCost(plan);
    // 0 means "Call" for Enterprise plan
    return cost === 0 ? 'Call' : this.formatNumber(cost);
  }

  isPricingCall(plan: Plan): boolean {
    return this.getPlanCost(plan) === 0;
  }

  getFeaturesList(plan: Plan): string[] {
    if (!plan.features) return [];

    const features: string[] = [];

    // Conversational Workflow
    if (plan.features.conversational_workflow) {
      features.push('Conversational workflow');
    }

    // Sentiment Analytics
    if (plan.features.sentiment_analytics) {
      features.push('Sentiment analytics');
    }

    // API Access
    if (plan.features.api_access) {
      features.push('API access');
    }

    // Custom Integrations
    if (plan.features.custom_integrations) {
      features.push('Custom integrations');
    }

    // Support Channels
    if (plan.features.support_channels) {
      if (typeof plan.features.support_channels === 'string') {
        features.push(`Support: ${plan.features.support_channels}`);
      } else if (Array.isArray(plan.features.support_channels)) {
        features.push(`Support: ${plan.features.support_channels.join(', ')}`);
      } else {
        features.push('Multi-channel support');
      }
    }

    // Legacy support field
    if (plan.features.support && !plan.features.support_channels) {
      features.push(`${plan.features.support} support`);
    }

    // Analytics Dashboard (existing)
    if (plan.features.analytics) {
      features.push('Analytics dashboard');
    }

    // Priority Support (existing)
    if (plan.features.priority_support) {
      features.push('Priority support');
    }

    // SSO (existing)
    if (plan.features.sso) {
      features.push('Single sign-on (SSO)');
    }

    return features;
  }

  isCurrentPlan(plan: Plan): boolean {
    // Primary check: match against currentPlan (loaded from authoritative source)
    if (this.currentPlan?.id === plan.id) {
      return true;
    }

    // Secondary check: match against subscription plan_id if available
    if (this.currentSubscription?.plan_id === plan.id) {
      return true;
    }

    return false;
  }

  isUpgrade(plan: Plan): boolean {
    if (!this.currentPlan) return true;

    const planCost = this.getPlanCost(plan);
    const currentCost = this.getPlanCost(this.currentPlan);

    // Cost of 0 means "Call for pricing" (Enterprise) - treat as most expensive
    if (planCost === 0) return true; // Switching to Enterprise is always an upgrade
    if (currentCost === 0) return false; // Already on Enterprise, can't upgrade

    return planCost > currentCost;
  }

  isDowngrade(plan: Plan): boolean {
    if (!this.currentPlan) return false;

    const planCost = this.getPlanCost(plan);
    const currentCost = this.getPlanCost(this.currentPlan);

    // Cost of 0 means "Call for pricing" (Enterprise) - treat as most expensive
    if (currentCost === 0 && planCost !== 0) return true; // Switching from Enterprise to any priced plan is a downgrade
    if (planCost === 0) return false; // Switching to Enterprise is never a downgrade

    return planCost < currentCost;
  }

  switchPlan(plan: Plan) {
    if (this.isCurrentPlan(plan) || this.switching) return;

    this.selectedPlan = plan;
    this.switching = true;
    this.error = null;
    this.successMessage = null;

    // First, get the preview to see if payment is required
    this.dashboardService.previewPlanSwitch(plan.id, this.billingCycle).subscribe({
      next: (preview: PlanSwitchPreview) => {
        this.switchPreview = preview;

        // Check if this requires contacting sales (Enterprise plan)
        if (preview.action_required === 'contact_sales') {
          this.switching = false;
          this.error = preview.message;
          return;
        }

        // If payment is required, show the payment modal
        if (preview.requires_payment && preview.billing_info.prorated_amount > 0) {
          this.showPaymentModal = true;
          this.switching = false;
        } else {
          // No payment required (downgrade or no prorated amount)
          // Confirm and proceed directly
          const confirmMessage = preview.billing_info.is_downgrade
            ? `Downgrade to ${plan.name}? This will take effect at the end of your current billing period.`
            : `Switch to ${plan.name} plan?`;

          if (confirm(confirmMessage)) {
            this.executePlanSwitch();
          } else {
            this.switching = false;
            this.selectedPlan = null;
            this.switchPreview = null;
          }
        }
      },
      error: (error: any) => {
        console.error('Error previewing plan switch:', error);
        this.error = error.error?.detail || 'Failed to get plan details. Please try again.';
        this.switching = false;
        this.selectedPlan = null;
      }
    });
  }

  // Execute plan switch after payment (or for downgrades without payment)
  executePlanSwitch(paymentReference?: string) {
    if (!this.selectedPlan) return;

    this.switching = true;
    this.processingPayment = false;

    this.dashboardService.switchTenantPlan(
      this.selectedPlan.id,
      this.billingCycle,
      paymentReference
    ).subscribe({
      next: (response) => {
        this.successMessage = response.message || `Successfully switched to ${this.selectedPlan?.name} plan!`;
        this.switching = false;
        this.closePaymentModal();

        // Reload plans data to update current plan
        setTimeout(() => {
          this.loadPlansData();
          this.successMessage = null;
        }, 5000);
      },
      error: (error: any) => {
        console.error('Error switching plan:', error);
        this.error = error.error?.detail?.message || error.error?.detail || 'Failed to switch plan. Please try again.';
        this.switching = false;
        this.closePaymentModal();
      }
    });
  }

  // Initiate Paystack payment for upgrade
  initiatePayment() {
    if (!this.switchPreview || !this.selectedPlan) return;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.email) {
      this.error = 'User email not found. Please log in again.';
      return;
    }

    this.processingPayment = true;
    this.error = null;

    // Convert amount to kobo (Paystack expects amount in smallest currency unit)
    const amountInKobo = Math.round(this.switchPreview.billing_info.prorated_amount * 100);

    // Generate unique payment reference
    const paymentRef = `plan_upgrade_${this.selectedPlan.id}_${Date.now()}`;

    this.paystackService.initializePayment({
      key: environment.paystack.publicKey,
      email: currentUser.email,
      amount: amountInKobo,
      ref: paymentRef,
      currency: this.switchPreview.billing_info.currency || 'NGN',
      metadata: {
        plan_id: this.selectedPlan.id,
        plan_name: this.selectedPlan.name,
        billing_cycle: this.billingCycle,
        type: 'plan_upgrade'
      },
      callback: (response: any) => {
        // Payment successful
        console.log('Payment successful:', response);
        this.executePlanSwitch(response.reference);
      },
      onClose: () => {
        // Payment cancelled by user
        console.log('Payment cancelled');
        this.processingPayment = false;
        this.error = 'Payment was cancelled. Your plan has not been changed.';
      }
    });
  }

  // Close the payment modal
  closePaymentModal() {
    this.showPaymentModal = false;
    this.selectedPlan = null;
    this.switchPreview = null;
    this.processingPayment = false;
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  setBillingCycle(cycle: 'monthly' | 'yearly') {
    this.billingCycle = cycle;
  }

  /**
   * Format subscription expiry date
   */
  formatExpiryDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Get days until subscription expiry
   */
  getDaysUntilExpiry(): number {
    if (!this.currentSubscription?.current_period_end) return 0;

    const expiryDate = new Date(this.currentSubscription.current_period_end);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Check if subscription is expiring soon (within 7 days)
   */
  isExpiringSoon(): boolean {
    const daysUntil = this.getDaysUntilExpiry();
    return daysUntil > 0 && daysUntil <= 7;
  }

  /**
   * Check if subscription has expired
   */
  hasExpired(): boolean {
    return this.getDaysUntilExpiry() <= 0;
  }

  /**
   * Check if renewal button should be shown
   * Shows renewal for:
   * - Subscriptions with status 'expired'
   * - Active subscriptions that have passed their expiry date (backend hasn't updated status yet)
   * - Active subscriptions expiring within 7 days
   */
  shouldShowRenewal(): boolean {
    console.log('shouldShowRenewal - currentSubscription:', this.currentSubscription);

    if (!this.currentSubscription) {
      console.log('shouldShowRenewal - No subscription, returning false');
      return false;
    }

    const status = this.currentSubscription.status;
    const daysUntilExpiry = this.getDaysUntilExpiry();
    const hasExpired = daysUntilExpiry <= 0;

    console.log('shouldShowRenewal - Subscription status:', status);
    console.log('shouldShowRenewal - Days until expiry:', daysUntilExpiry);
    console.log('shouldShowRenewal - Has expired:', hasExpired);

    // Show renewal for subscriptions with 'expired' status
    if (status === 'expired') {
      console.log('shouldShowRenewal - Status is expired, returning true');
      return true;
    }

    // Show renewal for active subscriptions that have actually expired (date-based check)
    // This handles cases where backend hasn't updated the status yet
    if (status === 'active' && hasExpired) {
      console.log('shouldShowRenewal - Status is active but subscription has expired, returning true');
      return true;
    }

    // Show renewal for active subscriptions expiring soon (within 7 days)
    if (status === 'active' && this.isExpiringSoon()) {
      console.log('shouldShowRenewal - Status is active and expiring soon, returning true');
      return true;
    }

    console.log('shouldShowRenewal - No renewal conditions met, returning false');
    return false;
  }

  /**
   * Get button label for current plan action
   * Returns appropriate label based on subscription status
   */
  getCurrentPlanButtonLabel(): string {
    if (!this.currentSubscription) return 'Subscribe';

    if (this.shouldShowRenewal()) return 'Renew Plan';
    if (this.currentSubscription.cancel_at_period_end) return 'Reactivate';

    return 'Current Plan';
  }

  /**
   * Renew current subscription
   * Initiates renewal payment flow via Paystack
   */
  async renewSubscription(): Promise<void> {
    if (!this.currentSubscription?.id) {
      console.error('No subscription to renew');
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      // Call renewal API
      const response = await this.billingService
        .renewSubscription(this.currentSubscription.id)
        .toPromise();

      if (response?.success && response.renewal) {
        // Store renewal details and show modal
        this.renewalDetails = {
          amount: response.renewal.amount,
          currency: response.renewal.currency,
          payment_url: response.renewal.payment_url,
          payment_reference: response.renewal.payment_reference,
          new_period_end: response.renewal.new_period_end
        };
        this.showRenewalModal = true;
      }
    } catch (error: any) {
      console.error('Renewal error:', error);
      this.error = error.error?.detail || 'Failed to initialize renewal. Please try again.';

      // Show specific error messages
      if (error.status === 400) {
        this.error = error.error?.detail || 'Cannot renew subscription at this time.';
      } else if (error.status === 403) {
        this.error = 'You do not have permission to renew this subscription.';
      } else if (error.status === 404) {
        this.error = 'Subscription not found.';
      }
    } finally {
      this.loading = false;
    }
  }

  /**
   * Confirm renewal and redirect to payment
   */
  confirmRenewal(): void {
    if (!this.renewalDetails?.payment_url) return;

    this.processingRenewal = true;
    // Redirect to Paystack payment page
    window.location.href = this.renewalDetails.payment_url;
  }

  /**
   * Close renewal modal
   */
  closeRenewalModal(): void {
    this.showRenewalModal = false;
    this.renewalDetails = null;
    this.processingRenewal = false;
  }
}
