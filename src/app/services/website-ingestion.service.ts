import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface WebsiteIngestion {
  id: string;
  base_url: string;
  status: string;
  pages_discovered: number;
  pages_processed: number;
  pages_failed: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  // Categorization summary from backend (available in list view)
  categorization_summary?: {
    category_count: number;
    tag_count: number;
    primary_content_type: string | null;
    has_categorization: boolean;
    chunks_with_categories: number;
    total_chunks: number;
  };
  // Full categorization data (available in details/stats view)
  categorization?: {
    total_chunks: number;
    chunks_with_categories: number;
    chunks_with_tags: number;
    categories: Array<{
      id: string;
      name: string;
    }>;
    tags: Array<{
      id: string;
      name: string;
    }>;
    content_types: Record<string, number>;
  };
}

export interface WebsiteIngestionsListResponse {
  ingestions: WebsiteIngestion[];
  total_ingestions: number;
  tenant_id: string;
  tenant_name: string;
}

export interface StartIngestionResponse {
  message: string;
  ingestion_id: string;
  website_url: string;
  status: string;
  tenant_id: string;
  tenant_name: string;
}

export interface IngestionStatusResponse {
  ingestion_id: string;
  base_url: string;
  status: string;
  pages_discovered: number;
  pages_processed: number;
  pages_failed: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  tenant_id: string;
  tenant_name: string;
  // Categorization data from vector database
  categorization?: {
    total_chunks: number;
    chunks_with_categories: number;
    chunks_with_tags: number;
    categories: Array<{
      id: string;
      name: string;
    }>;
    tags: Array<{
      id: string;
      name: string;
    }>;
    content_types: Record<string, number>;
  };
}

export interface DeleteIngestionResponse {
  message: string;
  ingestion_id: string;
  base_url: string;
  tenant_id: string;
}

export interface RetryIngestionResponse {
  message: string;
  ingestion_id: string;
  base_url: string;
  status: string;
  tenant_id: string;
}

export interface WebsitePage {
  id: string;
  url: string;
  title: string;
  status: string;
  content_hash: string;
  scraped_at: string | null;
  error_message: string | null;
  created_at: string | null;
}

export interface PaginationInfo {
  current_page: number;
  page_size: number;
  total_pages: number;
  total_pages_count: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface IngestionPagesResponse {
  ingestion_id: string;
  base_url: string;
  ingestion_status: string;
  pages: WebsitePage[];
  pagination: PaginationInfo;
  tenant_id: string;
}

export interface IngestionStatsResponse {
  ingestion_id: string;
  base_url: string;
  status: string;
  summary: {
    pages_discovered: number;
    pages_processed: number;
    pages_failed: number;
    unique_content_pages: number;
    processing_time_seconds: number | null;
    started_at: string | null;
    completed_at: string | null;
  };
  pages_by_status: Record<string, number>;
  url_analysis: Record<string, { total: number; completed: number; failed: number }>;
  estimated_content_size: {
    unique_pages: number;
    estimated_total_characters: number;
    note: string;
  };
  // Categorization data (same structure as in list)
  categorization?: {
    total_chunks: number;
    chunks_with_categories: number;
    chunks_with_tags: number;
    categories: Array<{
      id: string;
      name: string;
    }>;
    tags: Array<{
      id: string;
      name: string;
    }>;
    content_types: Record<string, number>;
  };
  tenant_id: string;
}

export interface PageContentResponse {
  page_id: string;
  ingestion_id: string;
  page_details: {
    url: string;
    title: string;
    status: string;
    content_hash: string;
    scraped_at: string | null;
    error_message: string | null;
    created_at: string | null;
  };
  content_preview: string;
  note: string;
  tenant_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebsiteIngestionService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // List all ingestions for the tenant
  getIngestions(): Observable<WebsiteIngestionsListResponse> {
    return this.http.get<WebsiteIngestionsListResponse>(`${this.baseUrl}/ingestions/`);
  }

  // Start a new website ingestion
  startIngestion(websiteUrl: string): Observable<StartIngestionResponse> {
    const formData = new FormData();
    formData.append('website_url', websiteUrl);
    
    return this.http.post<StartIngestionResponse>(`${this.baseUrl}/websites/ingest`, formData);
  }

  // Get status of a specific ingestion
  getIngestionStatus(ingestionId: string): Observable<IngestionStatusResponse> {
    return this.http.get<IngestionStatusResponse>(`${this.baseUrl}/ingestions/${ingestionId}/status`);
  }

  // Delete an ingestion
  deleteIngestion(ingestionId: string): Observable<DeleteIngestionResponse> {
    return this.http.delete<DeleteIngestionResponse>(`${this.baseUrl}/ingestions/${ingestionId}`);
  }

  // Retry a failed ingestion
  retryIngestion(ingestionId: string): Observable<RetryIngestionResponse> {
    return this.http.post<RetryIngestionResponse>(`${this.baseUrl}/ingestions/${ingestionId}/retry`, {});
  }

  // Get pages for a specific ingestion with pagination
  getIngestionPages(ingestionId: string, page: number = 1, pageSize: number = 20): Observable<IngestionPagesResponse> {
    return this.http.get<IngestionPagesResponse>(`${this.baseUrl}/ingestions/${ingestionId}/pages`, {
      params: { page: page.toString(), page_size: pageSize.toString() }
    });
  }

  // Get detailed statistics for an ingestion
  getIngestionStats(ingestionId: string): Observable<IngestionStatsResponse> {
    return this.http.get<IngestionStatsResponse>(`${this.baseUrl}/ingestions/${ingestionId}/stats`);
  }

  // Get content preview for a specific page
  getPageContent(ingestionId: string, pageId: string): Observable<PageContentResponse> {
    return this.http.get<PageContentResponse>(`${this.baseUrl}/ingestions/${ingestionId}/pages/${pageId}/content`);
  }
}