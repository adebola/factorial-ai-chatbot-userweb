/**
 * TypeScript models for Answer Quality & Feedback Service
 * These interfaces match the API responses from the backend service
 */

// ============================================================================
// Feedback Models
// ============================================================================

export type FeedbackType = 'helpful' | 'not_helpful';

export interface AnswerFeedback {
  id: string;
  tenant_id: string;
  session_id: string;
  message_id: string;
  user_id?: string;
  feedback_type: FeedbackType;
  comment?: string;
  created_at: string;
}

export interface FeedbackStats {
  total_count: number;
  helpful_count: number;
  not_helpful_count: number;
  helpful_percentage: number;
  recent_feedback: AnswerFeedback[];
}

export interface SubmitFeedbackRequest {
  message_id: string;
  session_id: string;
  feedback_type: FeedbackType;
  comment?: string;
}

// ============================================================================
// Quality Metrics Models
// ============================================================================

export interface RAGQualityMetrics {
  id: string;
  tenant_id: string;
  session_id: string;
  message_id: string;
  retrieval_score?: number;
  documents_retrieved?: number;
  answer_confidence?: number;
  sources_cited?: number;
  answer_length?: number;
  response_time_ms?: number;
  has_low_confidence: boolean;
  has_poor_retrieval: boolean;
  has_slow_response: boolean;
  sentiment_score?: number;
  sentiment_label?: 'positive' | 'neutral' | 'negative';
  created_at: string;
}

export interface SessionQuality {
  id: string;
  tenant_id: string;
  session_id: string;
  total_messages: number;
  avg_retrieval_score?: number;
  avg_answer_confidence?: number;
  avg_response_time_ms?: number;
  low_quality_count: number;
  feedback_count: number;
  positive_feedback_count: number;
  negative_feedback_count: number;
  session_success_score?: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

export interface QualityStatsResponse {
  total_messages: number;
  avg_retrieval_score?: number;
  avg_answer_confidence?: number;
  avg_response_time_ms?: number;
  low_confidence_count: number;
  poor_retrieval_count: number;
  slow_response_count: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface SessionStatsResponse {
  session_id: string;
  total_messages: number;
  avg_retrieval_score?: number;
  avg_answer_confidence?: number;
  avg_response_time_ms?: number;
  low_confidence_count: number;
  feedback_count: number;
  positive_feedback: number;
  negative_feedback: number;
  sentiment_breakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface LowQualityMessage {
  message_id: string;
  session_id: string;
  answer_confidence?: number;
  retrieval_score?: number;
  response_time_ms?: number;
  created_at: string;
}

// ============================================================================
// Knowledge Gap Models
// ============================================================================

export type GapStatus = 'detected' | 'acknowledged' | 'resolved';

export interface KnowledgeGap {
  id: string;
  tenant_id: string;
  question_pattern: string;
  category?: string;
  occurrence_count: number;
  avg_confidence: number;
  example_questions: string[];
  first_detected_at: string;
  last_occurred_at: string;
  status: GapStatus;
  acknowledged_at?: string;
  acknowledged_by?: string;
  acknowledgement_notes?: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface GapDetectionRequest {
  days?: number;
}

export interface GapDetectionResponse {
  gaps_detected: number;
  new_gaps: number;
  updated_gaps: number;
  detection_time_ms: number;
}

export interface AcknowledgeGapRequest {
  notes?: string;
}

export interface ResolveGapRequest {
  resolution_notes: string;
}

// ============================================================================
// Dashboard & Analytics Models
// ============================================================================

export interface DashboardOverview {
  total_messages: number;
  avg_retrieval_score: number;
  avg_answer_confidence: number;
  avg_response_time_ms: number;
  feedback_stats: {
    total: number;
    helpful: number;
    not_helpful: number;
    helpful_percentage: number;
  };
  active_gaps_count: number;
  period_days: number;
}

export interface DailyTrend {
  date: string;
  message_count: number;
  avg_retrieval_score?: number;
  avg_answer_confidence?: number;
  avg_response_time_ms?: number;
  feedback_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

export interface QualityTrendsResponse {
  trends: DailyTrend[];
  period_days: number;
}

// ============================================================================
// Alert Management Models
// ============================================================================

export type AlertRuleType =
  | 'quality_drop'
  | 'new_gaps'
  | 'high_negative_feedback'
  | 'session_degradation';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export type NotificationChannel = 'console' | 'email' | 'webhook';

export interface AlertRule {
  id: string;
  tenant_id: string;
  name: string;
  rule_type: AlertRuleType;
  description?: string;
  threshold_value: number;
  check_interval_hours: number;
  min_sample_size: number;
  notification_channels: NotificationChannel[];
  notification_recipients?: {
    emails?: string[];
    webhook_urls?: string[];
  };
  throttle_minutes: number;
  enabled: boolean;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateAlertRuleRequest {
  name: string;
  rule_type: AlertRuleType;
  description?: string;
  threshold_value: number;
  check_interval_hours?: number;
  min_sample_size?: number;
  notification_channels: NotificationChannel[];
  notification_recipients?: {
    emails?: string[];
    webhook_urls?: string[];
  };
  throttle_minutes?: number;
  enabled?: boolean;
}

export interface UpdateAlertRuleRequest {
  name?: string;
  description?: string;
  threshold_value?: number;
  check_interval_hours?: number;
  min_sample_size?: number;
  notification_channels?: NotificationChannel[];
  notification_recipients?: {
    emails?: string[];
    webhook_urls?: string[];
  };
  throttle_minutes?: number;
  enabled?: boolean;
}

export interface AlertHistory {
  id: string;
  tenant_id: string;
  rule_id: string;
  rule_name: string;
  rule_type: AlertRuleType;
  severity: AlertSeverity;
  message: string;
  data: any;
  notification_sent: boolean;
  notification_channels_used?: NotificationChannel[];
  notification_response?: any;
  notification_error?: string;
  triggered_at: string;
  processed_at?: string;
}

export interface TestAlertRequest {
  rule_id?: string;
  channels?: NotificationChannel[];
  recipients?: {
    emails?: string[];
    webhook_urls?: string[];
  };
}

export interface TestAlertResponse {
  success: boolean;
  channels: NotificationChannel[];
  results: any;
}

export interface CheckAlertsResponse {
  success: boolean;
  result: {
    total_rules_checked: number;
    alerts_triggered: number;
    results: any[];
  };
}

// ============================================================================
// Scheduler & Job Models
// ============================================================================

export type JobType = 'gap_detection' | 'quality_check';
export type JobStatus = 'success' | 'failed' | 'partial';

export interface SchedulerStatus {
  scheduler_running: boolean;
  job_count: number;
  jobs: ScheduledJob[];
}

export interface ScheduledJob {
  id: string;
  name: string;
  next_run_time?: string;
  trigger: string;
}

export interface JobExecutionLog {
  id: string;
  tenant_id?: string;
  job_name: string;
  job_type: JobType;
  status: JobStatus;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  result_summary?: any;
  error_message?: string;
  triggered_by: string;
}

// ============================================================================
// API Response Wrappers
// ============================================================================

export interface ListResponse<T> {
  count: number;
  items: T[];
}

export interface AlertRulesListResponse {
  count: number;
  rules: AlertRule[];
}

export interface AlertHistoryListResponse {
  count: number;
  alerts: AlertHistory[];
}

export interface JobLogsListResponse {
  count: number;
  logs: JobExecutionLog[];
}

export interface KnowledgeGapsListResponse {
  count: number;
  gaps: KnowledgeGap[];
}

// ============================================================================
// UI-specific Models
// ============================================================================

export interface QualityChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

export interface AlertRuleFormData {
  name: string;
  rule_type: AlertRuleType;
  description: string;
  threshold_value: number;
  check_interval_hours: number;
  min_sample_size: number;
  notification_channels: NotificationChannel[];
  email_recipients: string;
  webhook_urls: string;
  throttle_minutes: number;
  enabled: boolean;
}

export interface QualityMetricsFilter {
  session_id?: string;
  date_from?: string;
  date_to?: string;
  min_confidence?: number;
  max_confidence?: number;
}

export interface GapFilter {
  status?: GapStatus;
  category?: string;
  min_occurrences?: number;
  date_from?: string;
  date_to?: string;
}

export interface AlertFilter {
  rule_id?: string;
  severity?: AlertSeverity;
  date_from?: string;
  date_to?: string;
}

export interface JobLogFilter {
  job_type?: JobType;
  status?: JobStatus;
  date_from?: string;
  date_to?: string;
}