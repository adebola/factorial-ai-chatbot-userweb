import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  // Feedback Models
  AnswerFeedback,
  FeedbackStats,
  SubmitFeedbackRequest,
  // Quality Metrics Models
  RAGQualityMetrics,
  SessionQuality,
  QualityStatsResponse,
  SessionStatsResponse,
  LowQualityMessage,
  // Knowledge Gap Models
  KnowledgeGap,
  KnowledgeGapsListResponse,
  GapDetectionRequest,
  GapDetectionResponse,
  AcknowledgeGapRequest,
  ResolveGapRequest,
  // Dashboard Models
  DashboardOverview,
  QualityTrendsResponse,
  // Alert Models
  AlertRule,
  AlertRulesListResponse,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertHistory,
  AlertHistoryListResponse,
  TestAlertRequest,
  TestAlertResponse,
  CheckAlertsResponse,
  // Scheduler Models
  SchedulerStatus,
  JobExecutionLog,
  JobLogsListResponse,
  // Filters
  GapFilter,
  AlertFilter,
  JobLogFilter
} from '../models/quality.models';

/**
 * Quality Service
 *
 * Handles all API communication with the Answer Quality & Feedback Service.
 * Provides methods for:
 * - Feedback collection
 * - Quality metrics tracking
 * - Knowledge gap management
 * - Alert rule management
 * - Scheduler monitoring
 */
@Injectable({
  providedIn: 'root'
})
export class QualityService {
  private readonly gatewayUrl = environment.gatewayUrl;
  private readonly feedbackUrl = `${this.gatewayUrl}/api/v1/feedback`;
  private readonly qualityUrl = `${this.gatewayUrl}/api/v1/quality`;
  private readonly adminUrl = `${this.gatewayUrl}/api/v1/admin`;
  private readonly alertsUrl = `${this.gatewayUrl}/api/v1/alerts`;

  constructor(private http: HttpClient) {}

  // ============================================================================
  // Feedback API
  // ============================================================================

  /**
   * Submit user feedback for an AI response
   */
  submitFeedback(request: SubmitFeedbackRequest): Observable<AnswerFeedback> {
    return this.http.post<AnswerFeedback>(
      this.feedbackUrl,
      request
    );
  }

  /**
   * Get feedback for a specific message
   */
  getFeedbackForMessage(messageId: string): Observable<AnswerFeedback[]> {
    return this.http.get<AnswerFeedback[]>(
      `${this.feedbackUrl}/message/${messageId}`
    );
  }

  /**
   * Get all feedback for a session
   */
  getFeedbackForSession(sessionId: string): Observable<AnswerFeedback[]> {
    return this.http.get<AnswerFeedback[]>(
      `${this.feedbackUrl}/session/${sessionId}`
    );
  }

  /**
   * Get feedback statistics
   */
  getFeedbackStats(sessionId?: string): Observable<FeedbackStats> {
    const params = sessionId
      ? new HttpParams().set('session_id', sessionId)
      : new HttpParams();

    return this.http.get<FeedbackStats>(
      `${this.feedbackUrl}/stats`,
      { params }
    );
  }

  // ============================================================================
  // Quality Metrics API
  // ============================================================================

  /**
   * Get quality metrics for a specific message
   */
  getQualityMetricsForMessage(messageId: string): Observable<RAGQualityMetrics> {
    return this.http.get<RAGQualityMetrics>(
      `${this.qualityUrl}/message/${messageId}`
    );
  }

  /**
   * Get all quality metrics for a session
   */
  getQualityMetricsForSession(sessionId: string): Observable<RAGQualityMetrics[]> {
    return this.http.get<RAGQualityMetrics[]>(
      `${this.qualityUrl}/session/${sessionId}`
    );
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId: string): Observable<SessionStatsResponse> {
    return this.http.get<SessionStatsResponse>(
      `${this.qualityUrl}/session/${sessionId}/stats`
    );
  }

  /**
   * Get overall quality statistics
   */
  getQualityStats(sessionId?: string): Observable<QualityStatsResponse> {
    const params = sessionId
      ? new HttpParams().set('session_id', sessionId)
      : new HttpParams();

    return this.http.get<QualityStatsResponse>(
      `${this.qualityUrl}/stats`,
      { params }
    );
  }

  /**
   * Get low quality messages (admin only)
   */
  getLowQualityMessages(limit: number = 50): Observable<{ count: number; messages: LowQualityMessage[] }> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<{ count: number; messages: LowQualityMessage[] }>(
      `${this.qualityUrl}/low-quality`,
      { params }
    );
  }

  // ============================================================================
  // Admin Dashboard API
  // ============================================================================

  /**
   * Get dashboard overview statistics
   */
  getDashboardOverview(days: number = 7): Observable<DashboardOverview> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<DashboardOverview>(
      `${this.adminUrl}/dashboard/overview`,
      { params }
    );
  }

  /**
   * Get quality trends over time
   */
  getQualityTrends(days: number = 30): Observable<QualityTrendsResponse> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.get<QualityTrendsResponse>(
      `${this.adminUrl}/dashboard/trends`,
      { params }
    );
  }

  /**
   * Export quality report as CSV (admin only)
   */
  exportQualityReport(days: number = 30): Observable<Blob> {
    const params = new HttpParams()
      .set('days', days.toString())
      .set('format', 'csv');

    return this.http.get(
      `${this.adminUrl}/export/quality-report`,
      { params, responseType: 'blob' }
    );
  }

  // ============================================================================
  // Knowledge Gaps API
  // ============================================================================

  /**
   * List knowledge gaps with optional filtering
   */
  listKnowledgeGaps(filter?: GapFilter, limit: number = 50): Observable<KnowledgeGapsListResponse> {
    let params = new HttpParams().set('limit', limit.toString());

    if (filter?.status) {
      params = params.set('status', filter.status);
    }

    return this.http.get<KnowledgeGapsListResponse>(
      `${this.adminUrl}/gaps`,
      { params }
    );
  }

  /**
   * Trigger knowledge gap detection (admin only)
   */
  detectKnowledgeGaps(days: number = 7): Observable<GapDetectionResponse> {
    const params = new HttpParams().set('days', days.toString());

    return this.http.post<GapDetectionResponse>(
      `${this.adminUrl}/gaps/detect`,
      null,
      { params }
    );
  }

  /**
   * Acknowledge a knowledge gap (admin only)
   */
  acknowledgeGap(gapId: string, request: AcknowledgeGapRequest): Observable<KnowledgeGap> {
    return this.http.patch<KnowledgeGap>(
      `${this.adminUrl}/gaps/${gapId}/acknowledge`,
      request
    );
  }

  /**
   * Resolve a knowledge gap (admin only)
   */
  resolveGap(gapId: string, request: ResolveGapRequest): Observable<KnowledgeGap> {
    return this.http.patch<KnowledgeGap>(
      `${this.adminUrl}/gaps/${gapId}/resolve`,
      request
    );
  }

  // ============================================================================
  // Alert Rules API
  // ============================================================================

  /**
   * List alert rules
   */
  listAlertRules(enabledOnly: boolean = false): Observable<AlertRulesListResponse> {
    const params = new HttpParams().set('enabled_only', enabledOnly.toString());

    return this.http.get<AlertRulesListResponse>(
      `${this.alertsUrl}/rules`,
      { params }
    );
  }

  /**
   * Get a specific alert rule
   */
  getAlertRule(ruleId: string): Observable<AlertRule> {
    return this.http.get<AlertRule>(
      `${this.alertsUrl}/rules/${ruleId}`
    );
  }

  /**
   * Create a new alert rule (admin only)
   */
  createAlertRule(request: CreateAlertRuleRequest): Observable<{ id: string; name: string; rule_type: string; enabled: boolean; created_at: string }> {
    return this.http.post<{ id: string; name: string; rule_type: string; enabled: boolean; created_at: string }>(
      `${this.alertsUrl}/rules`,
      request
    );
  }

  /**
   * Update an alert rule (admin only)
   */
  updateAlertRule(ruleId: string, request: UpdateAlertRuleRequest): Observable<{ id: string; name: string; enabled: boolean; updated_at: string }> {
    return this.http.put<{ id: string; name: string; enabled: boolean; updated_at: string }>(
      `${this.alertsUrl}/rules/${ruleId}`,
      request
    );
  }

  /**
   * Delete an alert rule (admin only)
   */
  deleteAlertRule(ruleId: string): Observable<{ success: boolean; rule_id: string }> {
    return this.http.delete<{ success: boolean; rule_id: string }>(
      `${this.alertsUrl}/rules/${ruleId}`
    );
  }

  // ============================================================================
  // Alert History API
  // ============================================================================

  /**
   * Get alert history with optional filtering
   */
  getAlertHistory(filter?: AlertFilter, limit: number = 50): Observable<AlertHistoryListResponse> {
    let params = new HttpParams().set('limit', limit.toString());

    if (filter?.rule_id) {
      params = params.set('rule_id', filter.rule_id);
    }
    if (filter?.severity) {
      params = params.set('severity', filter.severity);
    }

    return this.http.get<AlertHistoryListResponse>(
      `${this.alertsUrl}/history`,
      { params }
    );
  }

  // ============================================================================
  // Alert Testing & Utilities
  // ============================================================================

  /**
   * Send a test alert (admin only)
   */
  sendTestAlert(request: TestAlertRequest): Observable<TestAlertResponse> {
    return this.http.post<TestAlertResponse>(
      `${this.alertsUrl}/test`,
      request
    );
  }

  /**
   * Manually trigger alert checking (admin only)
   */
  checkAlertsNow(): Observable<CheckAlertsResponse> {
    return this.http.post<CheckAlertsResponse>(
      `${this.alertsUrl}/check-now`,
      {}
    );
  }

  // ============================================================================
  // Scheduler API
  // ============================================================================

  /**
   * Get scheduler status
   */
  getSchedulerStatus(): Observable<SchedulerStatus> {
    return this.http.get<SchedulerStatus>(
      `${this.alertsUrl}/scheduler/status`
    );
  }

  /**
   * Get job execution logs
   */
  getJobLogs(filter?: JobLogFilter, limit: number = 50): Observable<JobLogsListResponse> {
    let params = new HttpParams().set('limit', limit.toString());

    if (filter?.job_type) {
      params = params.set('job_type', filter.job_type);
    }
    if (filter?.status) {
      params = params.set('status_filter', filter.status);
    }

    return this.http.get<JobLogsListResponse>(
      `${this.alertsUrl}/jobs/logs`,
      { params }
    );
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Check if quality monitoring is enabled
   */
  isQualityMonitoringEnabled(): boolean {
    return environment.features?.enableQualityMonitoring ?? false;
  }

  /**
   * Get the gateway URL
   */
  getGatewayUrl(): string {
    return this.gatewayUrl;
  }
}
