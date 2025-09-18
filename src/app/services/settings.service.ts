import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

// Updated interface to match authorization-server2 backend
export interface TenantSettings {
  id?: string;
  tenantId: string;
  primaryColor: string;
  secondaryColor: string;
  companyLogoUrl?: string;
  hoverText: string;
  welcomeMessage: string;
  chatWindowTitle: string;
  chatLogo?: ChatLogoInfo;
  additionalSettings?: Record<string, any>;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatLogoInfo {
  type: 'url' | 'initials';
  url?: string;
  initials?: string;
}

// Updated interface to match TenantSettingsRequest from backend
export interface SettingsUpdate {
  primaryColor?: string;
  secondaryColor?: string;
  hoverText?: string;
  welcomeMessage?: string;
  chatWindowTitle?: string;
  additionalSettings?: Record<string, any>;
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
      `${this.baseUrl}/settings-logo/upload`,
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
      `${this.baseUrl}/settings-logo`
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
      `${this.baseUrl}/settings-logo`
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
      primaryColor: '#5D3EC1',
      secondaryColor: '#C15D3E',
      hoverText: 'Chat with us!',
      welcomeMessage: 'Hello! How can I help you today?',
      chatWindowTitle: 'Chat Support',
      additionalSettings: {}
    };
  }
}
