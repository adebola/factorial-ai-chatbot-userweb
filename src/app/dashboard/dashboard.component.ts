import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import {BehaviorSubject, Subject} from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {DashboardService, DashboardData, PlanDetails} from '../services/dashboard.service';
import { AuthService } from '../services/auth.service';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  dashboardData: DashboardData | null = null;
  loading = true;
  error: string | null = null;
  currentUser: any = null;

  statCards: StatCard[] = [];

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router
  ) {
    this.currentUser = this.authService.getCurrentUser();
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getDashboardData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.dashboardData = data;
          this.updateStatCards();
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load dashboard data';
          this.loading = false;
        }
      });
  }

  private updateStatCards(): void {
    if (!this.dashboardData) return;

    const usage = this.dashboardData.currentUsage;

    this.statCards = [
      {
        title: 'Documents',
        value: usage ? `${usage.documents.used}/${usage.documents.limit}` : `${this.dashboardData.documentsCount || 0}`,
        icon: 'description',
        color: 'primary'
      },
      {
        title: 'Websites',
        value: usage ? `${usage.websites.used}/${usage.websites.limit}` : `${this.dashboardData.websitesCount || 0}`,
        icon: 'web',
        color: 'secondary'
      },
      {
        title: 'Daily Chats',
        value: usage ? `${usage.daily_chats.used}/${usage.daily_chats.limit}` : '0',
        icon: 'chat',
        color: 'success'
      },
      {
        title: 'Monthly Chats',
        value: usage ? `${usage.monthly_chats.used}/${usage.monthly_chats.limit}` : '0',
        icon: 'smart_toy',
        color: 'info'
      }
    ];
  }

  getSubscriptionTierDisplay(tier: string): string {
    switch (tier?.toLowerCase()) {
      case 'free':
        return 'Free Plan';
      case 'basic':
        return 'Basic Plan';
      case 'pro':
        return 'Pro Plan';
      case 'enterprise':
        return 'Enterprise Plan';
      default:
        return tier || 'Unknown Plan';
    }
  }

  getSubscriptionBadgeClass(tier: string): string {
    const planName = tier?.toLowerCase();

    // Check for specific plan keywords
    if (planName?.includes('free') || planName?.includes('trial')) {
      return 'badge-secondary';
    } else if (planName?.includes('basic') || planName?.includes('starter')) {
      return 'badge-primary';
    } else if (planName?.includes('pro') || planName?.includes('premium') || planName?.includes('professional')) {
      return 'badge-success';
    } else if (planName?.includes('enterprise') || planName?.includes('business')) {
      return 'badge-premium';
    } else {
      return 'badge-primary'; // Default to primary for any subscribed plan
    }
  }

  getCurrentPlanDisplay(): string {
    if (this.dashboardData?.currentPlan?.name) {
      return this.dashboardData.currentPlan.name;
    }

    return 'No Plan Selected';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  }

  refresh(): void {
    this.loadDashboardData();
  }

  downloadWidgetFile(fileType: 'javascript' | 'css' | 'demo' | 'guide' | 'all_files'): void {
    this.dashboardService.downloadWidgetFile(fileType)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          // Create a blob URL and trigger download
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;

          // Set the appropriate filename based on file type
          const filenames = {
            javascript: 'chat-widget.js',
            css: 'chat-widget.css',
            demo: 'chat-widget.html',
            guide: 'integration-guide.html',
            all_files: 'widget-files.zip'
          };

          link.download = filenames[fileType];
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading widget file:', error);
          // You might want to show an error message to the user
        }
      });
  }

  previewWidget(): void {
    this.dashboardService.previewWidget()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (htmlContent) => {
          // Create a blob URL with the HTML content and open in new tab
          const blob = new Blob([htmlContent], { type: 'text/html' });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');

          // Clean up the blob URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        },
        error: (error) => {
          console.error('Error previewing widget:', error);
          // You might want to show an error message to the user
        }
      });
  }

  generateWidget(): void {
    this.dashboardService.generateWidget()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Widget generated successfully:', response);
          // Optionally refresh dashboard data to get updated widget info
          this.loadDashboardData();
        },
        error: (error) => {
          console.error('Error generating widget:', error);
        }
      });
  }

  viewIntegrationGuide(): void {
    this.dashboardService.downloadWidgetFile('guide')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          // Create a blob URL and open in new tab
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');

          // Clean up the blob URL after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        },
        error: (error) => {
          console.error('Error viewing integration guide:', error);
          // You might want to show an error message to the user
        }
      });
  }

  getPlanDisplayName(plan: any): string {
    return plan?.name || 'No Plan Selected';
  }

  getPlanLimitsText(plan: any): string {
    if (!plan) return 'No plan limits available';

    const limits = [];
    if (plan.document_limit) limits.push(`${plan.document_limit} documents`);
    if (plan.website_limit) limits.push(`${plan.website_limit} websites`);
    if (plan.daily_chat_limit) limits.push(`${plan.daily_chat_limit} chats/day`);

    return limits.join(', ') || 'No limits specified';
  }

  navigateToPlans(): void {
    this.router.navigate(['/plans']);
  }

  // Usage Statistics Helper Methods
  getBillingPeriod(): string {
    // This would come from the backend usage response
    // For now, returning a placeholder
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return `Billing period ends ${this.formatDate(endOfMonth.toISOString())}`;
  }

  getResetTime(resetDate: string): string {
    if (!resetDate) return '';

    const now = new Date();
    const reset = new Date(resetDate);
    const diffTime = Math.abs(reset.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

    if (diffDays > 1) {
      return `in ${diffDays} days`;
    } else if (diffHours > 1) {
      return `in ${diffHours} hours`;
    } else {
      return 'soon';
    }
  }

  getUsageWarnings(): string[] {
    const warnings: string[] = [];

    if (!this.dashboardData?.currentUsage) return warnings;

    const usage = this.dashboardData.currentUsage;

    // Check each resource type for high usage
    if (usage.documents.percentage >= 100) {
      warnings.push('Document limit reached. Upgrade your plan to add more documents.');
    } else if (usage.documents.percentage >= 80) {
      warnings.push(`You've used ${usage.documents.percentage}% of your document limit.`);
    }

    if (usage.websites.percentage >= 100) {
      warnings.push('Website limit reached. Upgrade your plan to add more websites.');
    } else if (usage.websites.percentage >= 80) {
      warnings.push(`You've used ${usage.websites.percentage}% of your website limit.`);
    }

    if (usage.daily_chats.percentage >= 100) {
      warnings.push('Daily chat limit reached. Your limit will reset tomorrow.');
    } else if (usage.daily_chats.percentage >= 80) {
      warnings.push(`You've used ${usage.daily_chats.percentage}% of your daily chat limit.`);
    }

    if (usage.monthly_chats.percentage >= 100) {
      warnings.push('Monthly chat limit reached. Consider upgrading your plan.');
    } else if (usage.monthly_chats.percentage >= 80) {
      warnings.push(`You've used ${usage.monthly_chats.percentage}% of your monthly chat limit.`);
    }

    return warnings;
  }

  getUsageStatus(percentage: number): 'normal' | 'warning' | 'danger' {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'normal';
  }
}
