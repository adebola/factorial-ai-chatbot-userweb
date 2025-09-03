import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface TenantSettings {
  id?: string;
  tenant_id: string;
  primary_color: string;
  secondary_color: string;
  company_logo_url?: string;
  hover_text: string;
  welcome_message: string;
  chat_window_title: string;
  additional_settings?: Record<string, any>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SettingsUpdate {
  primary_color?: string;
  secondary_color?: string;
  hover_text?: string;
  welcome_message?: string;
  chat_window_title?: string;
  additional_settings?: Record<string, any>;
}

export interface LogoUploadResponse {
  message: string;
  logo_object_name: string;
  filename: string;
  tenant_id: string;
}

export interface LogoInfo {
  logo_object_name: string;
  tenant_id: string;
  uploaded_at: string;
}

export interface ApiResponse {
  message: string;
  tenant_id: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private readonly baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}


  private getCurrentTenantId(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.tenant_id) {
      throw new Error('No authenticated user or tenant ID found');
    }
    return user.tenant_id;
  }

  getSettings(): Observable<TenantSettings> {
    const tenantId = this.getCurrentTenantId();
    return this.http.get<TenantSettings>(
      `${this.baseUrl}/tenants/${tenantId}/settings`
    ).pipe(
      tap(settings => {
        console.log('✅ Settings retrieved successfully:', settings);
      }),
      catchError(error => {
        console.error('❌ Error fetching settings:', error);
        return throwError(() => error);
      })
    );
  }

  updateSettings(settings: SettingsUpdate): Observable<TenantSettings> {
    const tenantId = this.getCurrentTenantId();
    return this.http.put<TenantSettings>(
      `${this.baseUrl}/tenants/${tenantId}/settings`,
      settings
    ).pipe(
      tap(updatedSettings => {
        console.log('✅ Settings updated successfully:', updatedSettings);
      }),
      catchError(error => {
        console.error('❌ Error updating settings:', error);
        return throwError(() => error);
      })
    );
  }

  deleteSettings(): Observable<ApiResponse> {
    const tenantId = this.getCurrentTenantId();
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/tenants/${tenantId}/settings`
    ).pipe(
      tap(response => {
        console.log('✅ Settings deleted successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error deleting settings:', error);
        return throwError(() => error);
      })
    );
  }

  uploadLogo(file: File): Observable<LogoUploadResponse> {
    const tenantId = this.getCurrentTenantId();
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<LogoUploadResponse>(
      `${this.baseUrl}/tenants/${tenantId}/settings/logo`,
      formData
    ).pipe(
      tap(response => {
        console.log('✅ Logo uploaded successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error uploading logo:', error);
        return throwError(() => error);
      })
    );
  }

  deleteLogo(): Observable<ApiResponse> {
    const tenantId = this.getCurrentTenantId();
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/tenants/${tenantId}/settings/logo`
    ).pipe(
      tap(response => {
        console.log('✅ Logo deleted successfully:', response);
      }),
      catchError(error => {
        console.error('❌ Error deleting logo:', error);
        return throwError(() => error);
      })
    );
  }

  getLogoInfo(): Observable<LogoInfo> {
    const tenantId = this.getCurrentTenantId();
    return this.http.get<LogoInfo>(
      `${this.baseUrl}/tenants/${tenantId}/settings/logo`
    ).pipe(
      tap(logoInfo => {
        console.log('✅ Logo info retrieved successfully:', logoInfo);
      }),
      catchError(error => {
        console.error('❌ Error fetching logo info:', error);
        return throwError(() => error);
      })
    );
  }

  isValidHexColor(color: string): boolean {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    return hexColorRegex.test(color);
  }

  getDefaultSettings(): Partial<TenantSettings> {
    return {
      primary_color: '#5D3EC1',
      secondary_color: '#C15D3E',
      hover_text: 'Chat with us!',
      welcome_message: 'Hello! How can I help you today?',
      chat_window_title: 'Chat Support',
      additional_settings: {}
    };
  }
}