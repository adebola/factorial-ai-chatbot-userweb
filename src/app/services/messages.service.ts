import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  id: string;
  session_id: string;
  message_type: string; // 'user' or 'assistant'
  content: string;
  message_metadata: any;
  created_at: string;
}

export interface ChatSession {
  id: string;
  session_id: string;
  user_identifier?: string;
  is_active: boolean;
  created_at: string;
  last_activity?: string;
  message_count: number;
}

export interface ChatSessionWithMessages {
  session: ChatSession;
  messages: ChatMessage[];
}

export interface ChatStats {
  total_sessions: number;
  active_sessions: number;
  total_messages: number;
  user_messages: number;
  assistant_messages: number;
  recent_messages_24h: number;
}

export interface SearchMessagesRequest {
  query: string;
  limit?: number;
  offset?: number;
  message_type?: string;
  session_id?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagesService {
  private readonly baseUrl = `${environment.apiUrl}/chat`;

  constructor(private http: HttpClient) {}

  // Get list of chat sessions
  getChatSessions(
    limit: number = 50,
    offset: number = 0,
    activeOnly: boolean = false
  ): Observable<ChatSession[]> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString())
      .set('active_only', activeOnly.toString());

    return this.http.get<ChatSession[]>(`${this.baseUrl}/admin/sessions`, { params });
  }

  // Get messages for a specific session
  getSessionMessages(
    sessionId: string,
    limit: number = 100,
    offset: number = 0
  ): Observable<ChatMessage[]> {
    let params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<ChatMessage[]>(`${this.baseUrl}/admin/sessions/${sessionId}/messages`, { params });
  }

  // Get session with messages
  getSessionWithMessages(
    sessionId: string,
    messageLimit: number = 100
  ): Observable<ChatSessionWithMessages> {
    let params = new HttpParams()
      .set('message_limit', messageLimit.toString());

    return this.http.get<ChatSessionWithMessages>(`${this.baseUrl}/admin/sessions/${sessionId}`, { params });
  }

  // Search messages
  searchMessages(searchRequest: SearchMessagesRequest): Observable<ChatMessage[]> {
    let params = new HttpParams()
      .set('query', searchRequest.query);
    
    if (searchRequest.limit) {
      params = params.set('limit', searchRequest.limit.toString());
    }
    if (searchRequest.offset) {
      params = params.set('offset', searchRequest.offset.toString());
    }
    if (searchRequest.message_type) {
      params = params.set('message_type', searchRequest.message_type);
    }
    if (searchRequest.session_id) {
      params = params.set('session_id', searchRequest.session_id);
    }

    return this.http.get<ChatMessage[]>(`${this.baseUrl}/admin/messages/search`, { params });
  }

  // Get chat statistics
  getChatStats(): Observable<ChatStats> {
    return this.http.get<ChatStats>(`${this.baseUrl}/admin/stats`);
  }
}