import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { SettingsService, TenantSettings } from './settings.service';
import { BillingService } from './billing.service';
import { environment } from '../../environments/environment';

export interface TenantInfo {
  id: string;
  name: string;
  domain: string;
  website_url: string;
  planId?: string;
  isActive: boolean;
  createdAt: string;
  config?: any;
  username: string;
  email: string;
  role: string;
}

export interface DocumentStats {
  documents: Array<{
    id: string;
    filename: string;
    status: string;
    created_at: string;
    processed_at?: string;
    error_message?: string;
  }>;
}

export interface WebsiteStats {
  ingestions: Array<{
    id: string;
    base_url: string;
    status: string;
    pages_discovered: number;
    pages_processed: number;
    pages_failed: number;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
  }>;
  total_ingestions: number;
  tenant_id: string;
  tenant_name: string;
}

export interface PlanInfo {
  plans: Array<{
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
    created_at: string;
    updated_at?: string;
  }>;
  total_plans: number;
}

export interface WidgetInfo {
  widget_status: string;
  tenant_id: string;
  tenant_name: string;
  api_key_configured: boolean;
  download_endpoints: {
    javascript: string;
    css: string;
    demo: string;
    guide: string;
    all_files: string;
    preview: string;
  };
  last_generated: string;
  features_enabled: string[];
}

export interface PlanDetails {
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
}

export interface DashboardData {
  tenant: TenantInfo;
  documentsCount: number;
  websitesCount: number;
  totalChats: number;
  totalResponses: number;
  currentPlan?: PlanDetails;
  currentUsage?: UsageStatistics;
  widgetInfo?: WidgetInfo;
  tenantSettings?: TenantSettings;
  lastActivityDate?: string;
  storageUsed?: string;
  planMismatch?: {
    detected: boolean;
    subscriptionPlanId?: string;
    tenantPlanId?: string;
  };
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

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private settingsService: SettingsService,
    private billingService: BillingService
  ) {}

  private getHttpHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getTenantInfo(): Observable<TenantInfo> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant ID found for current user');
    }

    return this.http.get<TenantInfo>(
      `${this.baseUrl}/tenants/${tenantId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  getDocuments(): Observable<DocumentStats> {
    return this.http.get<DocumentStats>(
      `${this.baseUrl}/documents/`,
      { headers: this.getHttpHeaders() }
    );
  }

  getWebsiteIngestions(): Observable<WebsiteStats> {
    return this.http.get<WebsiteStats>(
      `${this.baseUrl}/ingestions/`,
      { headers: this.getHttpHeaders() }
    );
  }

  getPlans(): Observable<PlanInfo> {
    return this.http.get<PlanInfo>(
      `${this.baseUrl}/plans/`,
      { headers: this.getHttpHeaders() }
    );
  }

  getPlanById(planId: string): Observable<{ plan: PlanDetails }> {
    return this.http.get<{ plan: PlanDetails }>(
      `${this.baseUrl}/plans/${planId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  getWidgetInfo(): Observable<WidgetInfo> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant ID found for current user');
    }

    return this.http.get<WidgetInfo>(
      `${this.baseUrl}/widget/status`,
      { headers: this.getHttpHeaders() }
    );
  }

  generateWidget(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant ID found for current user');
    }

    return this.http.get(
      `${this.baseUrl}/widget/generate`,
      { headers: this.getHttpHeaders() }
    );
  }

  downloadWidgetFile(fileType: 'javascript' | 'css' | 'demo' | 'guide' | 'all_files'): Observable<Blob> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant ID found for current user');
    }

    const fileEndpoints = {
      javascript: 'chat-widget.js',
      css: 'chat-widget.css',
      demo: 'chat-widget.html',
      guide: 'integration-guide.html',
      all_files: 'download-all'
    };

    const url = `${this.baseUrl}/widget/${fileEndpoints[fileType]}`;
    return this.http.get(url, {
      headers: this.getHttpHeaders(),
      responseType: 'blob'
    });
  }

  previewWidget(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (!tenantId) {
      throw new Error('No tenant ID found for current user');
    }

    const url = `${this.baseUrl}/widget/preview`;
    return this.http.get(url, {
      headers: this.getHttpHeaders(),
      responseType: 'text'
    });
  }

  // Plan management methods
  getPlanDetails(planId: string): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/plans/${planId}`,
      { headers: this.getHttpHeaders() }
    );
  }

  // Get current usage statistics
  getCurrentUsage(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/subscriptions/usage/current`,
      { headers: this.getHttpHeaders() }
    );
  }

  getPublicPlans(): Observable<any> {
    return this.http.get(`${this.baseUrl}/plans/public`);
  }

  switchTenantPlan(newPlanId: string, billingCycle: 'monthly' | 'yearly' = 'monthly', paymentReference?: string): Observable<any> {
    const body: any = {
      new_plan_id: newPlanId,
      billing_cycle: billingCycle
    };

    // Include payment reference for upgrades
    if (paymentReference) {
      body.payment_reference = paymentReference;
    }

    return this.http.post(
      `${this.baseUrl}/plans/switch`,
      body,
      { headers: this.getHttpHeaders() }
    );
  }

  // Preview plan switch to get proration details before committing
  previewPlanSwitch(newPlanId: string, billingCycle: 'monthly' | 'yearly' = 'monthly'): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/plans/preview-switch`,
      {
        new_plan_id: newPlanId,
        billing_cycle: billingCycle
      },
      { headers: this.getHttpHeaders() }
    );
  }

  // Get current plan for the authenticated user
  getCurrentPlan(): Observable<any> {
    return this.http.get(
      `${this.baseUrl}/plans/current`,
      { headers: this.getHttpHeaders() }
    );
  }

  getDashboardData(): Observable<DashboardData> {
    return new Observable(observer => {
      const dashboardData: Partial<DashboardData> = {};

      // Load tenant and subscription in parallel
      forkJoin({
        tenant: this.getTenantInfo(),
        subscription: this.billingService.getCurrentSubscription().pipe(
          catchError(error => {
            console.warn('No active subscription found, using tenant plan');
            return of(null);
          })
        )
      }).subscribe({
        next: ({ tenant, subscription }) => {
          dashboardData.tenant = tenant;

          // Get tenant settings
          this.settingsService.getSettings().subscribe({
            next: (settings) => {
              dashboardData.tenantSettings = settings;
            },
            error: (error) => {
              console.error('Error fetching tenant settings:', error);
            }
          });

          // Determine authoritative plan ID
          const subscriptionPlanId = subscription?.plan_id;
          const tenantPlanId = tenant.planId;

          // Detect and log mismatch
          if (subscriptionPlanId && tenantPlanId && subscriptionPlanId !== tenantPlanId) {
            console.warn(
              '🚨 [PLAN MISMATCH DETECTED]',
              {
                subscription_plan_id: subscriptionPlanId,
                tenant_plan_id: tenantPlanId,
                authoritative_source: 'subscription.plan_id',
                action: 'Using subscription plan as current plan'
              }
            );

            dashboardData.planMismatch = {
              detected: true,
              subscriptionPlanId,
              tenantPlanId
            };
          }

          // Use subscription.plan_id as authoritative source, fallback to tenant.planId
          const authoritativePlanId = subscriptionPlanId || tenantPlanId;

          if (authoritativePlanId) {
            this.getPlanDetails(authoritativePlanId).subscribe({
              next: (planResponse) => {
                if (planResponse.plan) {
                  dashboardData.currentPlan = planResponse.plan;
                  console.log(
                    '✅ Loaded current plan:',
                    planResponse.plan.name,
                    `(source: ${subscriptionPlanId ? 'subscription' : 'tenant'})`
                  );
                }
                // Get usage statistics
                this.loadUsageAndContinue(dashboardData, observer);
              },
              error: (error) => {
                console.error('❌ Error fetching plan details:', error);
                this.loadUsageAndContinue(dashboardData, observer);
              }
            });
          } else {
            console.warn('⚠️ No plan ID found (neither subscription nor tenant)');
            this.loadUsageAndContinue(dashboardData, observer);
          }
        },
        error: (error) => {
          console.error('❌ Error fetching tenant/subscription info:', error);
          observer.error(error);
        }
      });
    });
  }

  private loadUsageAndContinue(dashboardData: Partial<DashboardData>, observer: any): void {
    this.getCurrentUsage().subscribe({
      next: (usageResponse) => {
        console.log('Usage API Response:', usageResponse);
        if (usageResponse.usage_statistics) {
          dashboardData.currentUsage = usageResponse.usage_statistics;
        } else if (usageResponse.documents && usageResponse.websites) {
          dashboardData.currentUsage = usageResponse;
        }
        console.log('Current Usage:', dashboardData.currentUsage);
        this.loadRemainingData(dashboardData, observer);
      },
      error: (error) => {
        console.error('Error fetching usage statistics:', error);
        this.loadRemainingData(dashboardData, observer);
      }
    });
  }

  private loadRemainingData(dashboardData: Partial<DashboardData>, observer: any): void {
    // Get documents count
    this.getDocuments().subscribe({
      next: (docs) => {
        dashboardData.documentsCount = docs.documents?.length || 0;

        // Get websites count
        this.getWebsiteIngestions().subscribe({
          next: (websites) => {
            dashboardData.websitesCount = websites.total_ingestions || 0;

            // Get widget info
            this.getWidgetInfo().subscribe({
              next: (widgetInfo) => {
                dashboardData.widgetInfo = widgetInfo;
                this.finalizeData(dashboardData, observer);
              },
              error: () => {
                // Continue without widget info if it fails
                this.finalizeData(dashboardData, observer);
              }
            });
          },
          error: (error) => observer.error(error)
        });
      },
      error: (error) => observer.error(error)
    });
  }

  private finalizeData(dashboardData: Partial<DashboardData>, observer: any): void {
    // Set placeholder values for chat data (would come from chat service)
    dashboardData.totalChats = 0; // Placeholder - would come from chat API
    dashboardData.totalResponses = 0; // Placeholder - would come from chat API
    dashboardData.lastActivityDate = new Date().toISOString();
    dashboardData.storageUsed = 'N/A'; // Placeholder - would come from storage API

    observer.next(dashboardData as DashboardData);
    observer.complete();
  }
}
