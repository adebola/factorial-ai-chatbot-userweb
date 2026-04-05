import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditEvent {
  id: string;
  event_id: string;
  tenant_id: string;
  actor_user_id: string;
  actor_email: string;
  actor_type: string;
  action_type: string;
  tier: string;
  resource_type: string;
  resource_id: string;
  source_service: string;
  trace_id: string;
  before_state: any;
  after_state: any;
  event_metadata: any;
  occurred_at: string;
  created_at: string;
}

export interface AuditListResponse {
  items: AuditEvent[];
  total: number;
  page: number;
  size: number;
}

export interface AuditStats {
  total_events: number;
  by_tier: { [key: string]: number };
  by_service: { [key: string]: number };
  by_action_type: { [key: string]: number };
}

export interface AuditEventParams {
  page?: number;
  size?: number;
  action_type?: string;
  tier?: string;
  resource_type?: string;
  source_service?: string;
  date_from?: string;
  date_to?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private readonly baseUrl = `${environment.apiUrl}/audit/tenant`;

  constructor(private http: HttpClient) {}

  getEvents(filters: AuditEventParams = {}): Observable<AuditListResponse> {
    let params = new HttpParams();

    if (filters.page !== undefined && filters.page !== null) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.size) {
      params = params.set('size', filters.size.toString());
    }
    if (filters.action_type) {
      params = params.set('action_type', filters.action_type);
    }
    if (filters.tier) {
      params = params.set('tier', filters.tier);
    }
    if (filters.resource_type) {
      params = params.set('resource_type', filters.resource_type);
    }
    if (filters.source_service) {
      params = params.set('source_service', filters.source_service);
    }
    if (filters.date_from) {
      params = params.set('date_from', filters.date_from);
    }
    if (filters.date_to) {
      params = params.set('date_to', filters.date_to);
    }

    return this.http.get<AuditListResponse>(`${this.baseUrl}/events`, { params });
  }

  getStats(): Observable<AuditStats> {
    return this.http.get<AuditStats>(`${this.baseUrl}/stats`);
  }
}