import {Injectable} from '@angular/core';
import {environment} from '../../environments/environment';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Router} from '@angular/router';
import {Observable, BehaviorSubject, throwError, of} from 'rxjs';
import {tap, catchError, switchMap} from 'rxjs/operators';

// User interface derived from JWT
export interface User {
  user_id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  tenant_domain: string;
  tenant_name: string;
  roles: string[];
  permissions: string[];
  is_tenant_admin: boolean;
  token: string;
}

// JWT Token Payload (decoded from access_token)
export interface JWTPayload {
  iss: string;
  sub: string;
  aud: string[];
  exp: number;
  iat: number;
  organization: string;
  platform: string;
  tenant_id: string;
  user_id: string;
  tenant_domain: string;
  tenant_name: string;
  roles: string[];
  permissions: string[];
  authorities: string[];
  email: string;
  full_name: string;
  is_tenant_admin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private tokenEndpoint = `${environment.authServiceUrl}/oauth2/token`;
  private authorizeEndpoint = `${environment.authServiceUrl}/oauth2/authorize`;
  private revocationEndpoint = `${environment.authServiceUrl}/oauth2/revoke`;
  private clientId = environment.clientId;
  private clientSecret = environment.clientSecret;
  private redirectUri = environment.redirectUri;
  private scope = environment.scope;

  private readonly ID_TOKEN_KEY = 'id_token';
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_KEY = 'user_info';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly RETURN_URL_KEY = 'auth_return_url';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  // Token refresh management
  private refreshTokenInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
  }

  login() {
    const params = new HttpParams()
      .set('response_type', 'code')
      .set('client_id', this.clientId)
      .set('redirect_uri', this.redirectUri)
      .set('scope', this.scope);


    const result = window.location.href = `${this.authorizeEndpoint}?${params.toString()}`;
  }

  exchangeCodeForToken(code: string): Observable<any> {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

    const headers = new HttpHeaders({
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', code);
    body.set('redirect_uri', this.redirectUri);
    body.set('client_id', this.clientId);
    body.set('client_secret', this.clientSecret);

    return this.http.post<any>(this.tokenEndpoint, body.toString(), {headers: headers});
  }

  refreshAccessToken(refreshToken: string) {
    const credentials = btoa(`${this.clientId}:${this.clientSecret}`);

    const headers = new HttpHeaders({
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });

    const body = new URLSearchParams();
    body.set('grant_type', 'refresh_token');
    body.set('refresh_token', refreshToken);
    body.set('client_id', this.clientId);
    body.set('client_secret', this.clientSecret);

    return this.http.post<any>(this.tokenEndpoint, body.toString(), {headers: headers});
  }

  /**
   * Logout user and revoke tokens
   * @param isUserInitiated - true if user explicitly clicked logout, false for auto-logout (401, token expiry)
   */
  logout(isUserInitiated: boolean = false): void {
    const accessToken = this.getToken();
    const idToken = this.getIdToken();

    // Revoke token on server (fire and forget)
    if (accessToken) {
      this.revokeToken(accessToken).subscribe({
        next: () => console.log('✅ Token revoked successfully'),
        error: (error) => console.error('❌ Token revocation error:', error)
      });
    }

    // Clear local storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.ID_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    // Clear session storage
    // sessionStorage.removeItem(this.STATE_KEY);
    // sessionStorage.removeItem(this.PKCE_VERIFIER_KEY);

    this.currentUserSubject.next(null);

    if (isUserInitiated) {
      // User explicitly logged out - clear tokens and stay on login page
      // Set a flag to indicate intentional logout
      sessionStorage.setItem('intentional_logout', 'true');

      // Clear any stored return URL since user is explicitly logging out
      this.clearReturnUrl();

      // Simply redirect to login page with logout success indicator
      // The login page will not auto-login when intentional_logout flag is set
      this.router.navigate(['/login'], { queryParams: { logout: 'success' } }).then(r => {});
    } else {
      // Auto-logout (401, token expiry) - redirect to login with auto-retry
      // Keep the return URL so user can return to their intended destination
      this.router.navigate(['/login'], { queryParams: { fromAutoLogout: 'true' } }).then(r => {});
    }
  }

  /**
   * Re-hydrate current user from token in localStorage (e.g., after callback stored tokens)
   */
  hydrateUserFromToken(): void {
    const user = this.getUserFromStorage();
    this.currentUserSubject.next(user);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = this.decodeJWT(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Get current ID token
   */
  getIdToken(): string | null {
    return localStorage.getItem(this.ID_TOKEN_KEY);
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if the refresh token is valid
   */
  isRefreshTokenValid(): boolean {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const payload = this.decodeJWT(refreshToken);
      const currentTime = Math.floor(Date.now() / 1000);
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  }

  /**
   * Refresh token and return new access token
   */
  refreshToken(): Observable<string | null> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken || !this.isRefreshTokenValid()) {
      this.logout();
      return of(null);
    }

    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.asObservable();
    }

    this.refreshTokenInProgress = true;
    this.refreshTokenSubject.next(null);

    return this.refreshAccessToken(refreshToken).pipe(
      tap((response: any) => {
        if (response && response.access_token) {
          // Store new tokens
          localStorage.setItem(this.TOKEN_KEY, response.access_token);
          if (response.refresh_token) {
            localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refresh_token);
          }
          if (response.id_token) {
            localStorage.setItem(this.ID_TOKEN_KEY, response.id_token);
          }

          // Update user info
          this.hydrateUserFromToken();

          // Notify waiting requests
          this.refreshTokenSubject.next(response.access_token);
        }
      }),
      switchMap((response: any) => {
        if (response && response.access_token) {
          return of(response.access_token);
        }
        this.logout();
        return of(null);
      }),
      catchError((error) => {
        console.error('Token refresh failed:', error);
        this.logout();
        return of(null);
      }),
      tap(() => {
        this.refreshTokenInProgress = false;
      })
    );
  }


  /**
   * Get user from storage on service initialization
   */
  private getUserFromStorage(): User | null {
    // First attempt to read cached user
    const userStr = localStorage.getItem(this.USER_KEY);
    if (userStr) {
      try {
        const user = JSON.parse(userStr) as User;
        if (this.isAuthenticated()) {
          return user;
        }
        // If token is no longer valid, fall through to attempt fresh decode
      } catch {
        // ignore and try to decode from token below
      }
    }

    // If no cached user (or invalid), try to derive from access token in localStorage
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payload = this.decodeJWT(token);
      const user: User = {
        user_id: payload.user_id,
        tenant_id: payload.tenant_id,
        email: payload.email,
        full_name: payload.full_name,
        tenant_domain: payload.tenant_domain,
        tenant_name: payload.tenant_name,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        is_tenant_admin: payload.is_tenant_admin || false,
        token
      };

      // Cache for subsequent app loads
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      return user;
    } catch {
      return null;
    }
  }

  /**
   * Decode JWT token payload
   */
  private decodeJWT(token: string): JWTPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT token');
    }

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  }

  /**
   * Set the return URL to redirect to after successful authentication
   */
  setReturnUrl(url: string): void {
    sessionStorage.setItem(this.RETURN_URL_KEY, url);
  }

  /**
   * Get and clear the stored return URL
   */
  getAndClearReturnUrl(): string {
    const returnUrl = sessionStorage.getItem(this.RETURN_URL_KEY) || '/dashboard';
    sessionStorage.removeItem(this.RETURN_URL_KEY);
    return returnUrl;
  }

  /**
   * Get the stored return URL without clearing it
   */
  getReturnUrl(): string {
    return sessionStorage.getItem(this.RETURN_URL_KEY) || '/dashboard';
  }

  /**
   * Clear the stored return URL
   */
  clearReturnUrl(): void {
    sessionStorage.removeItem(this.RETURN_URL_KEY);
  }

  /**
   * Revoke OAuth2 token
   */
  private revokeToken(token: string): Observable<any> {
    const body = new URLSearchParams({
      token: token,
      client_id: environment.clientId,
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    return this.http.post(
      this.revocationEndpoint, body.toString(),
      { headers }
    );
  }

}
