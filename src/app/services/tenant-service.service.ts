import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { TenantService } from '../models/service.models';

const STANDARD_RAG: TenantService = {
  id: 'built-in-rag',
  name: 'AI Chatbot (RAG)',
  service_key: 'standard_rag',
  description: 'AI-powered chatbot that answers questions from your uploaded documents and websites.',
  category: 'core',
  config: null,
};

@Injectable({ providedIn: 'root' })
export class TenantServiceService {

  private apiUrl = `${environment.apiUrl}/subscriptions/services`;

  constructor(private http: HttpClient) {}

  getTenantServices(): Observable<TenantService[]> {
    return this.http.get<TenantService[]>(this.apiUrl).pipe(
      map(services => [STANDARD_RAG, ...services])
    );
  }
}