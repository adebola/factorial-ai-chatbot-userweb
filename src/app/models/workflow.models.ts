// Workflow TypeScript interfaces matching backend schemas

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

export enum TriggerType {
  MESSAGE = 'message',
  INTENT = 'intent',
  KEYWORD = 'keyword'
}

export enum StepType {
  MESSAGE = 'message',
  CHOICE = 'choice',
  INPUT = 'input',
  CONDITION = 'condition',
  ACTION = 'action'
}

export const FALLBACK_TO_AI_SENTINEL = '__fallback_to_ai';

export enum ExecutionStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled'
}

// Workflow Step Interfaces
export interface ChoiceOption {
  text: string;
  value: string;
  next_step?: string;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  name?: string;
  content?: string;
  condition?: string;
  options?: ChoiceOption[];  // Updated to support rich option objects
  variable?: string;
  action?: string;
  params?: Record<string, any>;
  next_step?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTrigger {
  type: TriggerType;
  conditions?: string[];
  keywords?: string[];
  intent_patterns?: string[];
  metadata?: Record<string, any>;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
  settings?: Record<string, any>;
}

// Request Interfaces
export interface WorkflowCreateRequest {
  name: string;
  description?: string;
  definition: WorkflowDefinition;
  trigger_type: TriggerType;
  trigger_config?: Record<string, any>;
  is_active?: boolean;
}

export interface WorkflowUpdateRequest {
  name?: string;
  description?: string;
  definition?: WorkflowDefinition;
  trigger_type?: TriggerType;
  trigger_config?: Record<string, any>;
  is_active?: boolean;
  status?: WorkflowStatus;
}

// Response Interfaces
export interface WorkflowResponse {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  version: string;
  status: WorkflowStatus;
  definition: WorkflowDefinition;
  trigger_type: TriggerType;
  trigger_config?: Record<string, any>;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description?: string;
  status: WorkflowStatus;
  trigger_type: TriggerType;
  is_active: boolean;
  usage_count: number;
  last_used_at?: string;
  created_at: string;
}

export interface WorkflowListResponse {
  workflows: WorkflowSummary[];
  total: number;
  page: number;
  size: number;
}

// Template Interfaces
export interface WorkflowTemplateCreateRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  definition: WorkflowDefinition;
  default_config?: Record<string, any>;
  is_public?: boolean;
}

export interface WorkflowTemplateResponse {
  id: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  definition: WorkflowDefinition;
  default_config?: Record<string, any>;
  is_public: boolean;
  usage_count: number;
  rating: number;
  created_at: string;
  updated_at?: string;
}

// Execution Interfaces
export interface ExecutionStartRequest {
  workflow_id: string;
  session_id: string;
  user_identifier?: string;
  initial_variables?: Record<string, any>;
  context?: Record<string, any>;
}

export interface ExecutionStepRequest {
  execution_id: string;
  session_id: string;
  user_input?: string;
  user_choice?: string;
  context?: Record<string, any>;
}

export interface StepExecutionResponse {
  id: string;
  step_id: string;
  step_type: StepType;
  status: ExecutionStatus;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

export interface WorkflowExecutionResponse {
  id: string;
  workflow_id: string;
  tenant_id: string;
  session_id: string;
  user_identifier?: string;
  status: ExecutionStatus;
  current_step_id?: string;
  variables: Record<string, any>;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  steps_completed: number;
  total_steps?: number;
}

export interface WorkflowStateResponse {
  session_id: string;
  execution_id: string;
  workflow_id: string;
  current_step_id: string;
  step_context: Record<string, any>;
  variables: Record<string, any>;
  waiting_for_input?: string;
  last_user_message?: string;
  last_bot_message?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface StepExecutionResult {
  success: boolean;
  step_id: string;
  step_type: StepType;
  message?: string;
  choices?: string[];
  input_required?: string;
  next_step_id?: string;
  workflow_completed: boolean;
  variables_updated?: Record<string, any>;
  error_message?: string;
  fallback_to_ai: boolean;
  metadata?: Record<string, any>;
}

// Analytics Interfaces
export interface WorkflowAnalyticsResponse {
  workflow_id: string;
  date: string;
  total_executions: number;
  completed_executions: number;
  failed_executions: number;
  avg_completion_time_ms?: number;
  avg_steps_completed?: number;
  completion_rate?: number;
  unique_users: number;
  returning_users: number;
}

export interface WorkflowMetrics {
  total_workflows: number;
  active_workflows: number;
  total_executions: number;
  avg_completion_rate: number;
  top_workflows: Array<Record<string, any>>;
  recent_activity: Array<Record<string, any>>;
}

export interface ExecutionSummary {
  id: string;
  workflow_id: string;
  session_id: string;
  user_identifier?: string;
  status: ExecutionStatus;
  steps_completed: number;
  total_steps?: number;
  started_at: string;
  completed_at?: string;
}

export interface ExecutionListResponse {
  executions: ExecutionSummary[];
  total: number;
  page: number;
  size: number;
}

// Trigger Detection Interfaces
export interface TriggerCheckRequest {
  message: string;
  session_id: string;
  user_context?: Record<string, any>;
}

export interface TriggerCheckResponse {
  triggered: boolean;
  workflow_id?: string;
  workflow_name?: string;
  confidence: number;
  trigger_type?: TriggerType;
  metadata?: Record<string, any>;
}

// Filters and Search
export interface WorkflowFilters {
  status?: WorkflowStatus;
  trigger_type?: TriggerType;
  is_active?: boolean;
  search?: string;
  created_by?: string;
  date_from?: string;
  date_to?: string;
}

export interface ExecutionFilters {
  workflow_id?: string;
  status?: ExecutionStatus;
  user_identifier?: string;
  date_from?: string;
  date_to?: string;
}