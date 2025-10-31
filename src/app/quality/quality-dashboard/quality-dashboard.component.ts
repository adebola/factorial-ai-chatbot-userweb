import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { QualityService } from '../../services/quality.service';
import {
  DashboardOverview,
  QualityTrendsResponse,
  LowQualityMessage
} from '../../models/quality.models';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartOptions } from 'chart.js';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
}

@Component({
  selector: 'app-quality-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, BaseChartDirective],
  templateUrl: './quality-dashboard.component.html',
  styleUrl: './quality-dashboard.component.scss'
})
export class QualityDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data properties
  dashboardOverview: DashboardOverview | null = null;
  qualityTrends: QualityTrendsResponse | null = null;
  lowQualityMessages: LowQualityMessage[] = [];

  // UI state
  loading = true;
  error: string | null = null;
  selectedPeriod: number = 7;
  statCards: StatCard[] = [];

  // Chart configuration
  public lineChartData: ChartConfiguration<'line'>['data'] = {
    labels: [],
    datasets: []
  };

  public lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Quality Trends Over Time'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1
      }
    }
  };

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    // Load all data in parallel using forkJoin
    forkJoin({
      overview: this.qualityService.getDashboardOverview(this.selectedPeriod),
      trends: this.qualityService.getQualityTrends(this.selectedPeriod),
      lowQualityMessages: this.qualityService.getLowQualityMessages(20)
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          // Always set loading to false when done, whether success or error
          this.loading = false;
        })
      )
      .subscribe({
        next: (data) => {
          // Debug: Log the raw backend response
          console.log('=== Backend Response Debug ===');
          console.log('Full response:', data);
          console.log('Overview data:', data.overview);
          console.log('Trends data:', data.trends);
          console.log('Low quality messages:', data.lowQualityMessages);
          console.log('=============================');

          // Handle dashboard overview
          this.dashboardOverview = data.overview;
          this.updateStatCards();

          // Handle quality trends
          this.qualityTrends = data.trends;
          this.updateChartData();

          // Handle low quality messages
          // API returns { count, messages }, so access messages directly
          this.lowQualityMessages = data.lowQualityMessages?.messages || [];
        },
        error: (error) => {
          this.error = 'Failed to load dashboard data';
          console.error('Error loading dashboard:', error);
        }
      });
  }

  updateStatCards(): void {
    if (!this.dashboardOverview) return;

    const overview = this.dashboardOverview as any; // Backend structure differs from interface

    this.statCards = [
      {
        title: 'Total Messages',
        value: overview.metrics?.total_messages?.toLocaleString() || '0',
        icon: 'chat',
        color: 'primary',
        subtitle: `Last ${this.selectedPeriod} days`
      },
      {
        title: 'Avg Retrieval Score',
        value: this.formatScore(overview.metrics?.avg_retrieval_score),
        icon: 'search',
        color: 'success',
        subtitle: 'Document matching quality'
      },
      {
        title: 'Avg Confidence',
        value: this.formatScore(overview.metrics?.avg_confidence),
        icon: 'verified',
        color: 'info',
        subtitle: 'AI answer confidence'
      },
      {
        title: 'Avg Response Time',
        value: overview.metrics?.avg_response_time_ms ? `${Math.round(overview.metrics.avg_response_time_ms)}ms` : 'N/A',
        icon: 'speed',
        color: 'warning',
        subtitle: 'Average response speed'
      },
      {
        title: 'Helpful Feedback',
        value: overview.feedback?.helpful_percentage ? `${overview.feedback.helpful_percentage.toFixed(1)}%` : 'N/A',
        icon: 'thumb_up',
        color: 'success',
        subtitle: overview.feedback ? `${overview.feedback.helpful || 0}/${overview.feedback.total || 0} responses` : 'No feedback'
      },
      {
        title: 'Knowledge Gaps',
        value: overview.knowledge_gaps?.active_gaps ?? 0,
        icon: 'report_problem',
        color: 'danger',
        subtitle: 'Active gaps detected'
      }
    ];
  }

  updateChartData(): void {
    if (!this.qualityTrends || !this.qualityTrends.trends) return;

    const trends = this.qualityTrends.trends as any[]; // Backend uses different field names

    this.lineChartData = {
      labels: trends.map(t => this.formatDate(t.date)),
      datasets: [
        {
          data: trends.map(t => t.avg_retrieval || 0),
          label: 'Retrieval Score',
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          data: trends.map(t => t.avg_confidence || 0),
          label: 'Answer Confidence',
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    };
  }

  changePeriod(days: number): void {
    this.selectedPeriod = days;
    this.loadDashboardData();
  }

  exportReport(): void {
    this.qualityService.exportQualityReport(this.selectedPeriod)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `quality-report-${this.selectedPeriod}days-${new Date().toISOString().split('T')[0]}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error exporting report:', error);
        }
      });
  }

  refresh(): void {
    this.loadDashboardData();
  }

  formatScore(score: number | undefined): string {
    if (score === undefined || score === null) return 'N/A';
    return (score * 100).toFixed(1) + '%';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getScoreClass(score: number | undefined): string {
    if (!score) return 'score-na';
    if (score >= 0.7) return 'score-good';
    if (score >= 0.5) return 'score-medium';
    return 'score-low';
  }

  getFeedback(): any {
    // Backend returns feedback in overview.feedback instead of overview.feedback_stats
    return (this.dashboardOverview as any)?.feedback || null;
  }

  getKnowledgeGaps(): any {
    // Backend returns knowledge_gaps.active_gaps instead of active_gaps_count
    return (this.dashboardOverview as any)?.knowledge_gaps || null;
  }
}