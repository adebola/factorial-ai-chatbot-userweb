import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Core interfaces for categorization
export interface DocumentCategory {
  id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  color?: string;
  icon?: string;
  is_system_category: boolean;
  document_count?: number;
  created_at: string;
}

export interface DocumentTag {
  id: string;
  name: string;
  tag_type: 'auto' | 'custom' | 'system';
  usage_count: number;
  created_at: string;
}

export interface DocumentClassification {
  categories: Array<{name: string, confidence: number}>;
  tags: Array<{name: string, confidence: number}>;
  content_type: string;
  language: string;
  confidence: number;
}

export interface EnhancedUploadResponse {
  message: string;
  document_id: string;
  filename: string;
  chunks_created: number;
  classification: DocumentClassification;
  user_specified: {
    categories: string[];
    tags: string[];
  };
  tenant_id: string;
  tenant_name: string;
}

export interface CategoryCreateRequest {
  name: string;
  description?: string;
  parent_category_id?: string;
  color?: string;
  icon?: string;
}

export interface TagCreateRequest {
  name: string;
  tag_type: 'custom';
}

export interface DocumentClassifyRequest {
  document_id: string;
  categories?: string[];
  tags?: string[];
  auto_categorize: boolean;
}

export interface SearchFilters {
  categories?: string[];
  tags?: string[];
  content_type?: string;
}

export interface SearchResult {
  content: string;
  metadata: {
    source: string;
    source_type: string;
    categories: string[];
    tags: string[];
    similarity: number;
  };
  relevance_score: number;
}

export interface CategoryStatistics {
  categories: Array<{
    id: string;
    name: string;
    document_count: number;
    chunk_count: number;
    avg_confidence: number;
    ai_vs_manual: {
      ai_assigned: number;
      user_assigned: number;
    };
  }>;
  total_categories: number;
}

export interface AnalyticsData {
  category_statistics: CategoryStatistics;
  tag_statistics: {
    tags: Array<{
      id: string;
      name: string;
      usage_count: number;
      avg_confidence: number;
    }>;
    total_tags: number;
  };
  performance_metrics: {
    overall_stats: {
      total_documents: number;
      total_chunks: number;
      avg_categories_per_chunk: number;
      avg_tags_per_chunk: number;
    };
    optimization_recommendations: string[];
  };
  summary: {
    total_categories: number;
    total_tags: number;
    total_documents: number;
    total_chunks: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class CategorizationService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Category Management
  getCategories(includeStats: boolean = false, parentId?: string): Observable<{categories: DocumentCategory[], total_count: number}> {
    let params = new HttpParams();
    if (includeStats) params = params.set('include_stats', 'true');
    if (parentId) params = params.set('parent_id', parentId);

    return this.http.get<{categories: DocumentCategory[], total_count: number}>(`${this.baseUrl}/categories/`, { params });
  }

  createCategory(category: CategoryCreateRequest): Observable<DocumentCategory> {
    return this.http.post<DocumentCategory>(`${this.baseUrl}/categories/`, category);
  }

  updateCategory(categoryId: string, category: CategoryCreateRequest): Observable<DocumentCategory> {
    return this.http.put<DocumentCategory>(`${this.baseUrl}/categories/${categoryId}`, category);
  }

  deleteCategory(categoryId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.baseUrl}/categories/${categoryId}`);
  }

  // Tag Management
  getTags(tagType?: string, limit: number = 50): Observable<{tags: DocumentTag[], total_count: number}> {
    let params = new HttpParams().set('limit', limit.toString());
    if (tagType) params = params.set('tag_type', tagType);

    return this.http.get<{tags: DocumentTag[], total_count: number}>(`${this.baseUrl}/tags/`, { params });
  }

  createTag(tag: TagCreateRequest): Observable<DocumentTag> {
    return this.http.post<DocumentTag>(`${this.baseUrl}/tags/`, tag);
  }

  // Document Upload with Categorization
  uploadDocumentWithCategorization(
    file: File,
    categories?: string[],
    tags?: string[],
    autoCategorize: boolean = true
  ): Observable<EnhancedUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_categorize', autoCategorize.toString());

    if (categories && categories.length > 0) {
      categories.forEach(category => formData.append('categories', category));
    }

    if (tags && tags.length > 0) {
      tags.forEach(tag => formData.append('tags', tag));
    }

    return this.http.post<EnhancedUploadResponse>(`${this.baseUrl}/documents/upload`, formData);
  }

  // Document Classification
  classifyDocument(request: DocumentClassifyRequest): Observable<{
    message: string;
    document_id: string;
    ai_classification?: DocumentClassification;
    total_categories: number;
    total_tags: number;
  }> {
    return this.http.post<any>(`${this.baseUrl}/documents/${request.document_id}/classify`, request);
  }

  // Advanced Search
  searchDocuments(
    query: string,
    filters?: SearchFilters,
    limit: number = 10
  ): Observable<{
    query: string;
    filters: SearchFilters;
    results: SearchResult[];
    total_results: number;
  }> {
    let params = new HttpParams()
      .set('q', query)
      .set('limit', limit.toString());

    if (filters?.categories && filters.categories.length > 0) {
      filters.categories.forEach(category => params = params.append('categories', category));
    }

    if (filters?.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params = params.append('tags', tag));
    }

    if (filters?.content_type) {
      params = params.set('content_type', filters.content_type);
    }

    return this.http.get<any>(`${this.baseUrl}/documents/search`, { params });
  }

  // Analytics
  getCategoryAnalytics(): Observable<AnalyticsData> {
    return this.http.get<AnalyticsData>(`${this.baseUrl}/analytics/categories`);
  }

  // System Setup
  initializeSystemCategories(): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.baseUrl}/setup/initialize`, {});
  }

  // Utility Methods
  getCategoryColors(): string[] {
    return [
      '#1E40AF', // Legal - Blue
      '#059669', // Financial - Green
      '#DC2626', // HR - Red
      '#7C3AED', // Technical - Purple
      '#EA580C', // Marketing - Orange
      '#0891B2', // Teal
      '#BE185D', // Pink
      '#65A30D', // Lime
      '#7C2D12', // Brown
      '#374151'  // Gray
    ];
  }

  getCategoryIcons(): Array<{name: string, icon: string}> {
    return [
      { name: 'Legal', icon: 'legal' },
      { name: 'Financial', icon: 'financial' },
      { name: 'HR', icon: 'users' },
      { name: 'Technical', icon: 'code' },
      { name: 'Marketing', icon: 'megaphone' },
      { name: 'Document', icon: 'document' },
      { name: 'Folder', icon: 'folder' },
      { name: 'Archive', icon: 'archive' },
      { name: 'Report', icon: 'report' },
      { name: 'Contract', icon: 'contract' }
    ];
  }

  // Helper method to format confidence scores
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  }

  // Helper method to get category color by name
  getCategoryColor(categoryName: string): string {
    const colorMap: {[key: string]: string} = {
      'Legal': '#1E40AF',
      'Financial': '#059669',
      'HR': '#DC2626',
      'Technical': '#7C3AED',
      'Marketing': '#EA580C'
    };
    return colorMap[categoryName] || '#6B7280';
  }
}