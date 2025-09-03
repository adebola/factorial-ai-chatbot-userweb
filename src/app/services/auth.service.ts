import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  domain: string;
  username: string;
  password: string;
  email?: string;
  website_url?: string;
  subscription_tier?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  tenant_id: string;
  username: string;
}

export interface SignupResponse {
  id: string;
  name: string;
  domain: string;
  username: string;
  email: string;
  role: string;
  api_key: string;
  website_url: string;
  subscription_tier: string;
  is_active: boolean;
  created_at: string;
}

export interface User {
  tenant_id: string;
  username: string;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly USER_KEY = 'user_info';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, credentials).pipe(
      tap(response => {
        console.log('✅ Login successful, response received:', response);
        try {
          this.setSession(response);
          console.log('✅ Session set successfully');
        } catch (error) {
          console.error('❌ Error in setSession:', error);
          throw error;
        }
      }),
      catchError(error => {
        console.error('❌ Login HTTP error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error response:', error.error);
        throw error;
      })
    );
  }

  signup(userData: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.baseUrl}/tenants/`, userData).pipe(
      catchError(error => {
        console.error('Signup error:', error);
        throw error;
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  private setSession(authResult: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, authResult.access_token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authResult.refresh_token);

    const user: User = {
      tenant_id: authResult.tenant_id,
      username: authResult.username,
      token: authResult.access_token
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}
