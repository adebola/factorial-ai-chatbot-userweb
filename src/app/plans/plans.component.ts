import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService } from '../services/dashboard.service';
import { AuthService } from '../services/auth.service';

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

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadPlansData();
  }

  loadPlansData() {
    this.loading = true;
    this.error = null;

    // Get current user and their tenant info
    const currentUser = this.authService.getCurrentUser();
    const tenantId = currentUser?.tenant_id;

    if (tenantId) {
      // First get tenant info to get plan_id
      this.dashboardService.getTenantInfo().subscribe({
        next: (tenant) => {
          this.tenantInfo = tenant;

          // If tenant has a plan, get its details
          if (tenant.planId) {
            this.dashboardService.getPlanDetails(tenant.planId).subscribe({
              next: (response) => {
                if (response.plan) {
                  this.currentPlan = response.plan;
                }
                // Load all available plans
                this.loadPublicPlans();
              },
              error: (error: any) => {
                console.error('Error loading current plan:', error);
                // Still load available plans even if the current plan fails
                this.loadPublicPlans();
              }
            });
          } else {
            // No current plan, just load available plans
            this.loadPublicPlans();
          }
        },
        error: (error: any) => {
          console.error('Error loading tenant info:', error);
          // Fallback to public plans
          this.loadPublicPlans();
        }
      });
    } else {
      // No tenant ID, just load public plans
      this.loadPublicPlans();
    }
  }

  loadPublicPlans() {
    this.dashboardService.getPublicPlans().subscribe({
      next: (response) => {
        this.plans = response.plans || [];
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
    return value.toLocaleString('en-US');
  }

  getFeaturesList(plan: Plan): string[] {
    if (!plan.features) return [];

    const features: string[] = [];

    if (plan.features.support) {
      features.push(`${plan.features.support} support`);
    }
    if (plan.features.api_access) {
      features.push('API access');
    }
    if (plan.features.priority_support) {
      features.push('Priority support');
    }
    if (plan.features.analytics) {
      features.push('Analytics dashboard');
    }
    if (plan.features.custom_integrations) {
      features.push('Custom integrations');
    }
    if (plan.features.sso) {
      features.push('Single sign-on (SSO)');
    }

    return features;
  }

  isCurrentPlan(plan: Plan): boolean {
    return this.currentPlan?.id === plan.id;
  }

  isUpgrade(plan: Plan): boolean {
    if (!this.currentPlan) return true;
    return this.getPlanCost(plan) > this.getPlanCost(this.currentPlan);
  }

  isDowngrade(plan: Plan): boolean {
    if (!this.currentPlan) return false;
    return this.getPlanCost(plan) < this.getPlanCost(this.currentPlan);
  }

  switchPlan(plan: Plan) {
    if (this.isCurrentPlan(plan) || this.switching) return;

    const confirmMessage = this.isUpgrade(plan)
      ? `Upgrade to ${plan.name} plan for ₦${this.formatNumber(this.getPlanCost(plan))}/${this.billingCycle}?`
      : `Downgrade to ${plan.name} plan for ₦${this.formatNumber(this.getPlanCost(plan))}/${this.billingCycle}?`;

    if (!confirm(confirmMessage)) return;

    this.switching = true;
    this.error = null;
    this.successMessage = null;

    this.dashboardService.switchTenantPlan(plan.id, this.billingCycle).subscribe({
      next: (response) => {
        this.successMessage = `Successfully switched to ${plan.name} plan!`;
        this.switching = false;
        // Reload plans data to update current plan
        setTimeout(() => {
          this.loadPlansData();
        }, 1000);
      },
      error: (error: any) => {
        console.error('Error switching plan:', error);
        this.error = error.error?.detail || 'Failed to switch plan. Please try again.';
        this.switching = false;
      }
    });
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }

  setBillingCycle(cycle: 'monthly' | 'yearly') {
    this.billingCycle = cycle;
  }
}
