import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Attachment {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  url?: string;  // Download URL if available
}

export interface EmailMessage {
  id: string;
  tenant_id: string;
  to_email: string;
  to_name?: string;
  from_email: string;
  from_name?: string;
  subject: string;
  text_content?: string;      // Plain text content
  html_content?: string;      // HTML content (preferred)
  status: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
  error_message?: string;
  attachments?: Attachment[];
}

export interface SmsMessage {
  id: string;
  tenant_id: string;
  to_phone: string;
  from_phone: string;
  message: string;
  status: string;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
  error_message?: string;
}

export interface EmailListResponse {
  emails: EmailMessage[];
  total: number;
  page: number;
  size: number;
}

export interface SmsListResponse {
  messages: SmsMessage[];
  total: number;
  page: number;
  pages: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommunicationsService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Email methods
  getEmails(page: number = 1, size: number = 50, search?: string, status?: string): Observable<EmailListResponse> {
    let params: any = { page, size };
    if (search) params.search = search;
    if (status) params.status = status;

    return this.http.get<EmailListResponse>(`${this.baseUrl}/email/messages`, { params });
  }

  getEmailDetails(messageId: string): Observable<EmailMessage> {
    return this.http.get<EmailMessage>(`${this.baseUrl}/email/messages/${messageId}`);
  }

  // SMS methods
  getSms(page: number = 1, size: number = 50, search?: string, status?: string): Observable<SmsListResponse> {
    let params: any = { page, size };
    if (search) params.search = search;
    if (status) params.status = status;

    return this.http.get<SmsListResponse>(`${this.baseUrl}/sms/messages`, { params });
  }

  getSmsDetails(messageId: string): Observable<SmsMessage> {
    return this.http.get<SmsMessage>(`${this.baseUrl}/sms/messages/${messageId}`);
  }
}
