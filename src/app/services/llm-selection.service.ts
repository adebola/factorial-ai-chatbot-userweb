import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LLMProvider {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  base_url: string | null;
  requires_api_key: boolean;
  has_system_api_key: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface TenantLLMSelection {
  id: string;
  tenant_id: string;
  llm_provider_id: string;
  provider: string;
  model_id: string;
  display_name: string;
  base_url: string | null;
  has_tenant_api_key: boolean;
  temperature: number;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface SelectLLMRequest {
  llm_provider_id: string;
  api_key?: string;
  temperature: number;
}

export interface UpdateLLMSelectionRequest {
  llm_provider_id?: string;
  api_key?: string;
  temperature?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LLMSelectionService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getAvailableProviders(): Observable<LLMProvider[]> {
    return this.http.get<LLMProvider[]>(
      `${this.baseUrl}/observe/llm-providers`
    );
  }

  getCurrentSelection(): Observable<TenantLLMSelection> {
    return this.http.get<TenantLLMSelection>(
      `${this.baseUrl}/observe/llm-selection`
    );
  }

  selectLLM(request: SelectLLMRequest): Observable<TenantLLMSelection> {
    return this.http.post<TenantLLMSelection>(
      `${this.baseUrl}/observe/llm-selection`, request
    );
  }

  updateSelection(request: UpdateLLMSelectionRequest): Observable<TenantLLMSelection> {
    return this.http.put<TenantLLMSelection>(
      `${this.baseUrl}/observe/llm-selection`, request
    );
  }

  deleteSelection(): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/observe/llm-selection`
    );
  }
}