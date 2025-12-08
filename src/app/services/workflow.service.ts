import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  WorkflowResponse,
  WorkflowListResponse,
  WorkflowFilters,
  ExecutionStartRequest,
  ExecutionStepRequest,
  WorkflowExecutionResponse,
  ExecutionListResponse,
  ExecutionFilters,
  StepExecutionResult,
  WorkflowStateResponse,
  TriggerCheckRequest,
  TriggerCheckResponse,
  WorkflowTemplateCreateRequest,
  WorkflowTemplateResponse,
  WorkflowAnalyticsResponse,
  WorkflowMetrics
} from '../models/workflow.models';

@Injectable({
  providedIn: 'root'
})
export class WorkflowService {
  private apiUrl = `${environment.apiUrl}/workflows/`;
  private executionsUrl = `${environment.apiUrl}/executions`;
  private triggersUrl = `${environment.apiUrl}/triggers`;

  constructor(private http: HttpClient) {}

  // Workflow Management
  getWorkflows(
    page: number = 1,
    size: number = 10,
    filters?: WorkflowFilters
  ): Observable<WorkflowListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters) {
      if (filters.status) params = params.set('status', filters.status);
      if (filters.trigger_type) params = params.set('trigger_type', filters.trigger_type);
      if (filters.is_active !== undefined) params = params.set('is_active', filters.is_active.toString());
      if (filters.search) params = params.set('search', filters.search);
      if (filters.created_by) params = params.set('created_by', filters.created_by);
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
    }

    return this.http.get<WorkflowListResponse>(this.apiUrl, { params });
  }

  getWorkflow(workflowId: string): Observable<WorkflowResponse> {
    return this.http.get<WorkflowResponse>(`${this.apiUrl}${workflowId}`);
  }

  createWorkflow(workflow: WorkflowCreateRequest): Observable<WorkflowResponse> {
    return this.http.post<WorkflowResponse>(this.apiUrl, workflow);
  }

  updateWorkflow(workflowId: string, workflow: WorkflowUpdateRequest): Observable<WorkflowResponse> {
    return this.http.put<WorkflowResponse>(`${this.apiUrl}${workflowId}`, workflow);
  }

  deleteWorkflow(workflowId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${workflowId}`);
  }

  activateWorkflow(workflowId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}${workflowId}/activate`, {});
  }

  deactivateWorkflow(workflowId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}${workflowId}/deactivate`, {});
  }

  // Workflow Execution
  getExecutions(
    page: number = 1,
    size: number = 10,
    filters?: ExecutionFilters
  ): Observable<ExecutionListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters) {
      if (filters.workflow_id) params = params.set('workflow_id', filters.workflow_id);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.user_identifier) params = params.set('user_identifier', filters.user_identifier);
      if (filters.date_from) params = params.set('date_from', filters.date_from);
      if (filters.date_to) params = params.set('date_to', filters.date_to);
    }

    return this.http.get<ExecutionListResponse>(this.executionsUrl, { params });
  }

  getExecution(executionId: string): Observable<WorkflowExecutionResponse> {
    return this.http.get<WorkflowExecutionResponse>(`${this.executionsUrl}/${executionId}`);
  }

  startExecution(request: ExecutionStartRequest): Observable<WorkflowExecutionResponse> {
    return this.http.post<WorkflowExecutionResponse>(`${this.executionsUrl}/start`, request);
  }

  executeStep(request: ExecutionStepRequest): Observable<StepExecutionResult> {
    return this.http.post<StepExecutionResult>(`${this.executionsUrl}/step`, request);
  }

  getSessionState(sessionId: string): Observable<WorkflowStateResponse> {
    return this.http.get<WorkflowStateResponse>(`${this.executionsUrl}/session/${sessionId}/state`);
  }

  cancelExecution(executionId: string): Observable<void> {
    return this.http.post<void>(`${this.executionsUrl}/${executionId}/cancel`, {});
  }

  // Trigger Detection
  checkTriggers(request: TriggerCheckRequest): Observable<TriggerCheckResponse> {
    return this.http.post<TriggerCheckResponse>(`${this.triggersUrl}/check`, request);
  }

  testWorkflowTrigger(workflowId: string, message: string): Observable<any> {
    const params = new HttpParams().set('message', message);
    return this.http.get(`${this.triggersUrl}/workflows/${workflowId}/test`, { params });
  }

  // Templates (future endpoints)
  getWorkflowTemplates(
    page: number = 1,
    size: number = 10,
    category?: string
  ): Observable<{ templates: WorkflowTemplateResponse[], total: number, page: number, size: number }> {
    let params = new HttpParams();

    if (category) params = params.set('category', category);

    // Backend returns array directly, not paginated response
    return this.http.get<WorkflowTemplateResponse[]>(
      `${this.apiUrl}templates/list`, { params }
    ).pipe(
      map((templates: WorkflowTemplateResponse[]) => ({
        templates: templates,
        total: templates.length,
        page: page,
        size: size
      }))
    );
  }

  createWorkflowTemplate(template: WorkflowTemplateCreateRequest): Observable<WorkflowTemplateResponse> {
    return this.http.post<WorkflowTemplateResponse>(`${this.apiUrl}templates`, template);
  }

  getWorkflowTemplate(templateId: string): Observable<WorkflowTemplateResponse> {
    return this.http.get<WorkflowTemplateResponse>(`${this.apiUrl}templates/${templateId}`);
  }

  createWorkflowFromTemplate(templateId: string, name: string): Observable<WorkflowResponse> {
    return this.http.post<WorkflowResponse>(`${this.apiUrl}from-template/${templateId}`, { workflow_name: name });
  }

  // Analytics
  getWorkflowAnalytics(
    workflowId: string,
    dateFrom?: string,
    dateTo?: string
  ): Observable<WorkflowAnalyticsResponse[]> {
    // Backend analytics endpoint not yet implemented
    // Calculate analytics from executions data
    return new Observable(observer => {
      // Fetch executions for this workflow
      // Note: Backend max page size is 100
      let params = new HttpParams()
        .set('workflow_id', workflowId)
        .set('page', '1')
        .set('size', '100');

      this.http.get<ExecutionListResponse>(this.executionsUrl, { params })
        .toPromise()
        .then(executionsResp => {
          let executions = executionsResp?.executions || [];

          // Filter by date range if provided
          if (dateFrom) {
            const fromDate = new Date(dateFrom);
            executions = executions.filter(e => new Date(e.started_at) >= fromDate);
          }
          if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            executions = executions.filter(e => new Date(e.started_at) <= toDate);
          }

          // Group executions by date
          const executionsByDate: { [date: string]: any[] } = {};
          executions.forEach(execution => {
            const date = execution.started_at.split('T')[0]; // Get YYYY-MM-DD
            if (!executionsByDate[date]) {
              executionsByDate[date] = [];
            }
            executionsByDate[date].push(execution);
          });

          // Calculate analytics for each date
          const analytics: WorkflowAnalyticsResponse[] = Object.keys(executionsByDate)
            .map(date => {
              const dayExecutions = executionsByDate[date];
              const completed = dayExecutions.filter(e => e.status === 'completed').length;
              const failed = dayExecutions.filter(e => e.status === 'failed').length;
              const total = dayExecutions.length;

              // Get unique users
              const uniqueUsers = new Set(dayExecutions.map(e => e.user_identifier).filter(u => u)).size;

              return {
                workflow_id: workflowId,
                date: date,
                total_executions: total,
                completed_executions: completed,
                failed_executions: failed,
                completion_rate: total > 0 ? completed / total : 0,
                unique_users: uniqueUsers,
                returning_users: 0 // Complex to calculate without more data
              };
            })
            .sort((a, b) => a.date.localeCompare(b.date));

          observer.next(analytics);
          observer.complete();
        })
        .catch(error => {
          console.error('Error calculating workflow analytics:', error);
          observer.next([]);
          observer.complete();
        });
    });
  }

  getWorkflowMetrics(): Observable<WorkflowMetrics> {
    // Backend metrics endpoint not yet implemented
    // Calculate metrics from workflows and executions data
    return new Observable(observer => {
      // Fetch workflows and executions to calculate metrics
      // Note: Backend max page size is 100
      Promise.all([
        this.http.get<WorkflowListResponse>(this.apiUrl, {
          params: new HttpParams().set('page', '1').set('size', '100')
        }).toPromise(),
        this.http.get<ExecutionListResponse>(this.executionsUrl, {
          params: new HttpParams().set('page', '1').set('size', '100')
        }).toPromise()
      ]).then(([workflowsResp, executionsResp]) => {
        const workflows = workflowsResp?.workflows || [];
        const executions = executionsResp?.executions || [];

        // Calculate metrics
        const totalWorkflows = workflows.length;
        const activeWorkflows = workflows.filter(w => w.is_active).length;
        const totalExecutions = executions.length;

        // Calculate completion rate
        const completedExecutions = executions.filter(e => e.status === 'completed').length;
        const avgCompletionRate = totalExecutions > 0 ? completedExecutions / totalExecutions : 0;

        // Get top workflows by usage
        const workflowUsage = workflows.map(w => ({
          id: w.id,
          name: w.name,
          usage_count: w.usage_count || 0
        })).sort((a, b) => b.usage_count - a.usage_count).slice(0, 5);

        // Get recent activity
        const recentActivity = executions
          .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
          .slice(0, 10)
          .map(e => ({
            id: e.id,
            workflow_id: e.workflow_id,
            status: e.status,
            started_at: e.started_at
          }));

        observer.next({
          total_workflows: totalWorkflows,
          active_workflows: activeWorkflows,
          total_executions: totalExecutions,
          avg_completion_rate: avgCompletionRate,
          top_workflows: workflowUsage,
          recent_activity: recentActivity
        });
        observer.complete();
      }).catch(error => {
        console.error('Error calculating metrics:', error);
        // Return zeros if there's an error
        observer.next({
          total_workflows: 0,
          active_workflows: 0,
          total_executions: 0,
          avg_completion_rate: 0,
          top_workflows: [],
          recent_activity: []
        });
        observer.complete();
      });
    });
  }

  // Utility Methods
  validateWorkflowDefinition(definition: any): Observable<{ valid: boolean, errors: string[] }> {
    return this.http.post<{ valid: boolean, errors: string[] }>(
      `${this.apiUrl}validate`, { definition }
    );
  }

  duplicateWorkflow(workflowId: string, newName: string): Observable<WorkflowResponse> {
    return this.http.post<WorkflowResponse>(
      `${this.apiUrl}${workflowId}/duplicate`, { name: newName }
    );
  }

  exportWorkflow(workflowId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}${workflowId}/export`, {
      responseType: 'blob'
    });
  }

  importWorkflow(file: File): Observable<WorkflowResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<WorkflowResponse>(`${this.apiUrl}import`, formData);
  }

  // Helper methods for UI
  getStepTypeIcon(stepType: string): string {
    switch (stepType) {
      case 'message': return 'chat';
      case 'choice': return 'list';
      case 'input': return 'input';
      case 'condition': return 'call_split';
      case 'action': return 'play_arrow';
      case 'sub_workflow': return 'account_tree';
      case 'delay': return 'schedule';
      default: return 'help';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#10b981';
      case 'draft': return '#6b7280';
      case 'inactive': return '#f59e0b';
      case 'archived': return '#ef4444';
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'paused': return '#f59e0b';
      case 'cancelled': return '#6b7280';
      default: return '#6b7280';
    }
  }

  formatDuration(milliseconds: number): string {
    if (!milliseconds) return '0ms';

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    if (seconds > 0) return `${seconds}s`;
    return `${milliseconds}ms`;
  }
}
