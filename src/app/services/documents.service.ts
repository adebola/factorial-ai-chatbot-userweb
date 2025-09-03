import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Document {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
}

export interface DocumentsListResponse {
  documents: Document[];
}

export interface ReplaceDocumentResponse {
  message: string;
  document_id: string;
  original_filename: string;
  new_filename: string;
  chunks_created: number;
  tenant_id: string;
  tenant_name: string;
}

export interface DocumentViewResponse {
  document_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  content_preview: string | null;
  tenant_id: string;
  tenant_name: string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentsService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Available routes
  getDocuments(): Observable<DocumentsListResponse> {
    return this.http.get<DocumentsListResponse>(`${this.baseUrl}/documents/`);
  }

  replaceDocument(documentId: string, file: File): Observable<ReplaceDocumentResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.http.put<ReplaceDocumentResponse>(`${this.baseUrl}/documents/${documentId}/replace`, formData);
  }

  // Additional available routes
  deleteDocument(documentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/documents/${documentId}`);
  }

  deleteMultipleDocuments(documentIds: string[]): Observable<any> {
    return this.http.request('delete', `${this.baseUrl}/documents/`, {
      body: documentIds
    });
  }

  downloadDocument(documentId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/documents/${documentId}/download`, { 
      responseType: 'blob' 
    });
  }

  viewDocument(documentId: string): Observable<DocumentViewResponse> {
    return this.http.get<DocumentViewResponse>(`${this.baseUrl}/documents/${documentId}/view`);
  }
}
