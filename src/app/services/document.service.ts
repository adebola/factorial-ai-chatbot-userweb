import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CategorizationService, EnhancedUploadResponse } from './categorization.service';

export interface Document {
  id: string;
  filename: string;
  content_type: string;
  size: number;
  chunks_count: number;
  categories: Array<{
    id: string;
    name: string;
    confidence: number;
    assigned_by: 'user' | 'ai' | 'rule';
  }>;
  tags: Array<{
    id: string;
    name: string;
    confidence: number;
    assigned_by: 'user' | 'ai' | 'rule';
  }>;
  upload_date: string;
  created_at: string;
  processed_at?: string;
  status: 'processing' | 'completed' | 'failed' | 'error';
  error_message?: string;
  tenant_id: string;
}

export interface DocumentListResponse {
  documents: Document[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface DocumentFilters {
  categories?: string[];
  tags?: string[];
  content_type?: string;
  date_from?: string;
  date_to?: string;
}

export interface DocumentMetadata {
  // Core Document Information
  document_id: string;
  filename: string;
  file_size: number;
  file_size_formatted: string;
  mime_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_path: string;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
  tenant_id: string;

  // Content Type Information (NEW)
  content_type: string | null;  // Primary content type (most common in chunks)
  content_types_distribution: {  // Distribution of content types across chunks
    [key: string]: number;  // e.g., { "text": 45, "table": 8, "list": 12 }
  };

  // Categories (AI and User-assigned)
  categories: Array<{
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    is_system_category: boolean;
    confidence_score: number;
    assigned_by: 'user' | 'ai' | 'rule';
    assigned_at: string | null;
  }>;

  // Tags (Flexible labeling system)
  tags: Array<{
    id: string;
    name: string;
    tag_type: 'auto' | 'custom' | 'system';
    usage_count: number;
    confidence_score: number;
    assigned_by: 'user' | 'ai' | 'rule';
    assigned_at: string | null;
  }>;

  // Processing Statistics
  processing_stats: {
    chunk_count: number;
    has_vector_data: boolean;
  };

  // Categorization Summary
  categorization_summary: {
    total_categories: number;
    total_tags: number;
    ai_assigned_categories: number;
    user_assigned_categories: number;
    auto_tags: number;
    custom_tags: number;
    has_content_type: boolean;  // NEW: Indicates if content_type is set
    content_type_chunks: number;  // NEW: Total chunks with content_type data
  };
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private categorizationService: CategorizationService
  ) {}

  // Use the categorization service for uploads
  uploadDocument(
    file: File,
    categories?: string[],
    tags?: string[],
    autoCategorize: boolean = true
  ): Observable<EnhancedUploadResponse> {
    return this.categorizationService.uploadDocumentWithCategorization(
      file,
      categories,
      tags,
      autoCategorize
    );
  }

  // Get documents with filtering
  getDocuments(
    page: number = 1,
    pageSize: number = 20,
    filters?: DocumentFilters
  ): Observable<DocumentListResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('page_size', pageSize.toString());

    if (filters?.categories && filters.categories.length > 0) {
      filters.categories.forEach(category =>
        params = params.append('categories', category)
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag =>
        params = params.append('tags', tag)
      );
    }

    if (filters?.content_type) {
      params = params.set('content_type', filters.content_type);
    }

    if (filters?.date_from) {
      params = params.set('date_from', filters.date_from);
    }

    if (filters?.date_to) {
      params = params.set('date_to', filters.date_to);
    }

    return this.http.get<DocumentListResponse>(`${this.baseUrl}/documents/`, { params });
  }

  // Get single document
  getDocument(documentId: string): Observable<Document> {
    return this.http.get<Document>(`${this.baseUrl}/documents/${documentId}`);
  }

  // Get document metadata with full details
  getDocumentMetadata(documentId: string): Observable<DocumentMetadata> {
    return this.http.get<DocumentMetadata>(`${this.baseUrl}/documents/${documentId}/metadata`);
  }

  // Delete document
  deleteDocument(documentId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.baseUrl}/documents/${documentId}`);
  }

  // Update document categorization
  updateDocumentCategorization(
    documentId: string,
    categories?: string[],
    tags?: string[],
    autoCategorize: boolean = false
  ): Observable<any> {
    return this.categorizationService.classifyDocument({
      document_id: documentId,
      categories,
      tags,
      auto_categorize: autoCategorize
    });
  }

  // Get content types for filtering
  getContentTypes(): string[] {
    return [
      'application/pdf',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
  }

  // Get human-readable content type names
  getContentTypeName(contentType: string): string {
    const typeMap: {[key: string]: string} = {
      'application/pdf': 'PDF Document',
      'text/plain': 'Text File',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation'
    };
    return typeMap[contentType] || 'Unknown';
  }
}