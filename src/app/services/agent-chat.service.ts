import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface AgentSession {
  id: string;
  service_key: string;
  parent_session_id?: string;
  status: 'active' | 'completed' | 'context_overflow';
  total_tokens_used: number;
  context_limit_tokens?: number;
  model_name?: string;
  message_count?: number;
  created_at: string;
  last_activity: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  structured_blocks?: ContentBlock[];
  token_count: number;
  tool_calls?: ToolCall[];
  message_metadata?: Record<string, any>;
  created_at: string;
}

export interface ContentBlock {
  type: 'text' | 'table' | 'chart' | 'diagram' | 'code' | 'image' | 'alert';
  content?: string;
  data?: Record<string, any>;
  language?: string;
  format?: string;
  chart_type?: string;
  url?: string;
  alt?: string;
  severity?: string;
}

export interface ToolCall {
  tool: string;
  input?: Record<string, any>;
  output?: string;
  duration_ms?: number;
}

export interface SessionOverflowEvent {
  type: 'session_overflow';
  old_session_id: string;
  new_session_id: string;
  has_context_summary: boolean;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AgentChatService {
  private ws: WebSocket | null = null;

  readonly messages$ = new BehaviorSubject<AgentMessage[]>([]);
  readonly sessionInfo$ = new BehaviorSubject<AgentSession | null>(null);
  readonly connectionStatus$ = new BehaviorSubject<'connecting' | 'connected' | 'disconnected'>('disconnected');
  readonly typing$ = new BehaviorSubject<boolean>(false);
  readonly overflowEvent$ = new Subject<SessionOverflowEvent>();
  readonly suggestedActions$ = new BehaviorSubject<string[]>([]);

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  connect(serviceKey: string, sessionId?: string): void {
    this.disconnect();

    const token = this.authService.getToken();
    if (!token) {
      this.connectionStatus$.next('disconnected');
      return;
    }

    let wsUrl = `${environment.gatewayUrl.replace('http', 'ws')}/ws/agent/${serviceKey}?token=${encodeURIComponent(token)}`;
    if (sessionId) {
      wsUrl += `&session_id=${encodeURIComponent(sessionId)}`;
    }

    this.connectionStatus$.next('connecting');
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => this.connectionStatus$.next('connected');

    this.ws.onmessage = (event) => {
      try {
        this.handleMessage(JSON.parse(event.data));
      } catch (e) {
        console.error('Failed to parse WebSocket message', e);
      }
    };

    this.ws.onclose = () => {
      this.connectionStatus$.next('disconnected');
      this.typing$.next(false);
    };

    this.ws.onerror = (err) => console.error('Agent WebSocket error', err);
  }

  sendMessage(content: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const userMsg: AgentMessage = {
        id: crypto.randomUUID(),
        session_id: this.sessionInfo$.value?.id || '',
        role: 'user',
        content,
        token_count: 0,
        created_at: new Date().toISOString(),
      };
      this.messages$.next([...this.messages$.value, userMsg]);
      this.ws.send(JSON.stringify({ type: 'message', content }));
    }
  }

  requestNewSession(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'new_session' }));
    }
  }

  switchSession(sessionId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'switch_session', session_id: sessionId }));
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connectionStatus$.next('disconnected');
    this.typing$.next(false);
  }

  // REST API methods
  getSessions(serviceKey: string): Observable<AgentSession[]> {
    return this.http.get<AgentSession[]>(`${environment.apiUrl}/agent/sessions`, {
      params: { service_key: serviceKey }
    });
  }

  exportSession(sessionId: string, format: string): Observable<Blob> {
    return this.http.post(`${environment.apiUrl}/agent/sessions/${sessionId}/export`, null, {
      params: { format },
      responseType: 'blob'
    });
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'welcome':
        this.sessionInfo$.next(data.session);
        this.messages$.next(data.history || []);
        break;
      case 'response':
        this.messages$.next([...this.messages$.value, data.message]);
        if (this.sessionInfo$.value) {
          this.sessionInfo$.next({
            ...this.sessionInfo$.value,
            total_tokens_used: data.session_update?.total_tokens_used ?? this.sessionInfo$.value.total_tokens_used,
            context_limit_tokens: data.session_update?.context_limit_tokens ?? this.sessionInfo$.value.context_limit_tokens,
          });
        }
        this.suggestedActions$.next(data.metadata?.suggested_actions || []);
        break;
      case 'typing':
        this.typing$.next(data.is_typing);
        break;
      case 'session_overflow':
        this.overflowEvent$.next(data as SessionOverflowEvent);
        break;
      case 'session_created':
        this.sessionInfo$.next(data.session);
        this.messages$.next([]);
        break;
      case 'session_switched':
        this.sessionInfo$.next(data.session);
        this.messages$.next(data.history || []);
        break;
    }
  }
}