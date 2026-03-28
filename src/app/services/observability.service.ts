import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ObservabilityBackend {
  id: string;
  tenant_id: string;
  backend_type: string;
  url: string | null;
  auth_type: string;
  verify_ssl: boolean;
  timeout_seconds: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

@Injectable({ providedIn: 'root' })
export class ObservabilityService {
  private apiUrl = `${environment.apiUrl}/observe`;

  constructor(private http: HttpClient) {}

  getBackends(): Observable<ObservabilityBackend[]> {
    return this.http.get<ObservabilityBackend[]>(`${this.apiUrl}/backends`);
  }
}