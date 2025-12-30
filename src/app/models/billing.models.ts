/**
 * Billing System Models
 * Comprehensive TypeScript interfaces for billing, payments, invoices, and analytics
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum InvoiceStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum SubscriptionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum PaymentMethod {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  USSD = 'ussd',
  QR = 'qr',
  MOBILE_MONEY = 'mobile_money'
}

// ============================================================================
// PAYMENT MODELS
// ============================================================================

export interface Payment {
  id: string;
  subscription_id: string;
  invoice_id?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  paystack_reference: string;
  transaction_id?: string | null;
  access_code?: string;
  authorization_code?: string;
  paid_at?: string | null;
  failure_reason?: string | null;
  payment_metadata?: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

export interface PaymentInitializationRequest {
  subscription_id: string;
  callback_url?: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitializationResponse {
  success: boolean;
  message: string;
  payment: {
    payment_id: string;
    reference: string;
    access_code: string;
    authorization_url: string;
    amount: number;
    currency: string;
  };
  paystack_public_key: string;
}

export interface PaymentVerificationRequest {
  reference: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  message: string;
  payment: {
    payment_id: string;
    subscription_id: string;
    amount: number;
    transaction_id: string;
  };
}

export interface PaymentHistoryResponse {
  payments: Payment[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

// ============================================================================
// SUBSCRIPTION MODELS
// ============================================================================

export interface Subscription {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  amount: number;
  currency: string;
  starts_at?: string;
  ends_at?: string;
  trial_ends_at?: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  cancellation_reason?: string;
  cancelled_at?: string;
  auto_renew: boolean;
  pending_plan_id?: string;
  pending_plan_effective_date?: string;
  user_email?: string;
  user_full_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface UpgradeRequest {
  new_plan_id: string;
}

export interface DowngradeRequest {
  new_plan_id: string;
  immediate?: boolean;
}

export interface CancelRequest {
  reason?: string;
  cancel_immediately?: boolean;
}

export interface PlanChangePreviewResponse {
  current_plan: {
    id: string;
    name: string;
    amount: number;
  };
  new_plan: {
    id: string;
    name: string;
    amount: number;
  };
  proration: {
    amount: number;
    days_remaining: number;
    is_upgrade: boolean;
  };
  effective_date: string;
  requires_payment: boolean;
}

export interface UpgradeResponse {
  success: boolean;
  message: string;
  subscription_id: string;
  old_plan: string;
  new_plan: string;
  proration_amount: number;
  currency: string;
  effective_date: string;
  payment_required: boolean;
}

export interface DowngradeResponse {
  success: boolean;
  message: string;
  subscription_id: string;
  current_plan: string;
  new_plan: string;
  effective_date: string;
  access_until: string;
}

export interface CancelResponse {
  success: boolean;
  message: string;
  subscription_id: string;
  effective_date: string;
  access_until: string;
  can_reactivate: boolean;
}

export interface ReactivateResponse {
  success: boolean;
  message: string;
  subscription_id: string;
  next_billing_date: string;
  auto_renew: boolean;
}

export interface RenewSubscriptionResponse {
  success: boolean;
  message: string;
  renewal: {
    subscription_id: string;
    payment_id: string;
    payment_url: string;
    payment_reference: string;
    amount: number;
    currency: string;
    new_period_start: string;
    new_period_end: string;
  };
}

// ============================================================================
// INVOICE MODELS
// ============================================================================

export interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  subscription_id: string;
  tenant_id: string;
  status: InvoiceStatus;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  period_start: string;
  period_end: string;
  due_date: string;
  paid_at?: string;
  line_items: LineItem[];
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface InvoiceListResponse {
  invoices: Invoice[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface SendInvoiceResponse {
  success: boolean;
  message: string;
  invoice_id: string;
  sent_to: string;
}

// ============================================================================
// ANALYTICS MODELS
// ============================================================================

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  growth_rate: number;
  arpu: number;
  active_subscriptions: number;
  revenue_by_plan: Record<string, {
    mrr: number;
    count: number;
  }>;
  previous_period?: {
    mrr: number;
    growth_rate: number;
  };
}

export interface SubscriptionMetrics {
  total_subscriptions: number;
  active_subscriptions: number;
  trialing_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
  past_due_subscriptions: number;
  churn_rate_30d: number;
  plan_distribution: Record<string, number>;
  status_distribution: Record<string, number>;
}

export interface UsageAnalytics {
  total_usage: {
    documents: number;
    websites: number;
    monthly_chats: number;
  };
  average_usage: {
    documents: number;
    websites: number;
    monthly_chats: number;
  };
  active_users: number;
  users_at_capacity: {
    documents: number;
    websites: number;
    monthly_chats: number;
  };
  usage_by_plan: Record<string, {
    avg_documents: number;
    avg_websites: number;
    avg_monthly_chats: number;
  }>;
}

export interface PaymentTimelineEntry {
  date: string;
  count: number;
  revenue: number;
}

export interface PaymentAnalytics {
  total_payments: number;
  successful_payments: number;
  failed_payments: number;
  success_rate: number;
  total_revenue: number;
  average_payment: number;
  payment_timeline: PaymentTimelineEntry[];
}

export interface ChurnPeriod {
  count: number;
  rate: number;
  total_at_start: number;
}

export interface ChurnByPlan {
  churned: number;
  total: number;
  rate: number;
}

export interface ChurnAnalytics {
  churn_by_period: {
    last_7_days: ChurnPeriod;
    last_30_days: ChurnPeriod;
    last_90_days: ChurnPeriod;
  };
  churn_by_plan: Record<string, ChurnByPlan>;
  average_lifetime_days: number;
  total_churned: number;
  recoverable_subscriptions: number;
}

export interface AlertItem {
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
}

export interface DashboardSummary {
  revenue: {
    mrr: number;
    arr: number;
    growth_rate: number;
    arpu: number;
  };
  subscriptions: {
    total: number;
    active: number;
    churn_rate_30d: number;
  };
  usage: {
    active_users: number;
    users_at_capacity: {
      documents: number;
      websites: number;
      monthly_chats: number;
    };
  };
  payments: {
    success_rate: number;
    last_7_days: {
      count: number;
      revenue: number;
    };
  };
  alerts: AlertItem[];
}

// ============================================================================
// PLAN MODELS (extended from existing)
// ============================================================================

export interface PlanFeatures {
  conversational_workflow?: boolean;
  sentiment_analytics?: boolean;
  api_access?: boolean;
  custom_integrations?: boolean;
  support_channels?: string | string[];
  support?: string;
  analytics?: boolean;
  priority_support?: boolean;
  sso?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  document_limit: number;
  website_limit: number;
  daily_chat_limit: number;
  monthly_chat_limit: number;
  monthly_plan_cost: string;
  yearly_plan_cost: string;
  features: PlanFeatures;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  is_current?: boolean;
}

// ============================================================================
// USAGE TRACKING MODELS
// ============================================================================

export interface UsageTracking {
  subscription_id: string;
  documents_uploaded: number;
  websites_ingested: number;
  monthly_chats_used: number;
  monthly_reset_at: string;
  created_at: string;
  updated_at?: string;
}

export interface UsageStatistics {
  documents: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
  };
  websites: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
  };
  daily_chats: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
    resets_at?: string;
  };
  monthly_chats: {
    used: number;
    limit: number;
    percentage: number;
    remaining: number;
    resets_at?: string;
  };
}

// ============================================================================
// PAYSTACK SPECIFIC MODELS
// ============================================================================

export interface PaystackConfig {
  key: string;
  email: string;
  amount: number; // in kobo for NGN
  ref: string;
  currency?: string;
  callback?: (response: PaystackResponse) => void;
  onClose?: () => void;
  metadata?: Record<string, any>;
}

export interface PaystackResponse {
  reference: string;
  status: string;
  trans: string;
  transaction: string;
  trxref: string;
  message?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface DateRangeParams {
  start_date?: string;
  end_date?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}
