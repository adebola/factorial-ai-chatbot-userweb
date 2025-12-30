import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, BehaviorSubject, Observable } from 'rxjs';

// Global state to track token refresh
let isRefreshing = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

// Export function to reset interceptor state on logout
export function resetAuthInterceptorState(): void {
  isRefreshing = false;
  refreshTokenSubject.next(null);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip authentication for specific OAuth2 and public endpoints
  const skipAuth =
    // OAuth2 Authorization Server endpoints (port 9002)
    req.url.includes('/auth/oauth2') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/invitation') ||
    // Public endpoints
    req.url.includes('/plans/public');

  if (skipAuth) {
    return next(req);
  }

  // Helper function to add auth header
  const addAuthHeader = (request: any, token: string | null) => {
    if (!token || token === 'null' || token === 'undefined') {
      return request;
    }
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  // Helper function to handle 401 errors with proper queuing
  const handle401Error = (request: any): Observable<any> => {
    console.log('🔍 Handling 401 error...');

    // If already refreshing, queue this request
    if (isRefreshing) {
      console.log('⏳ Token refresh in progress, queueing request...');
      return refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          const newAuthReq = addAuthHeader(request, token);
          return next(newAuthReq);
        })
      );
    }

    // Start refresh process
    isRefreshing = true;
    refreshTokenSubject.next(null);

    // Store current URL before attempting refresh
    const currentUrl = router.url;
    if (currentUrl && currentUrl !== '/login' && currentUrl !== '/callback') {
      authService.setReturnUrl(currentUrl);
    }

    // Check if we can refresh the token
    if (!authService.isRefreshTokenValid()) {
      isRefreshing = false;
      authService.logout();
      return throwError(() => new Error('Refresh token expired'));
    }

    // Attempt token refresh
    return authService.refreshToken().pipe(
      switchMap((newToken: string | null) => {
        isRefreshing = false;

        if (newToken) {
          refreshTokenSubject.next(newToken);
          // Retry original request with new token
          const newAuthReq = addAuthHeader(request, newToken);
          return next(newAuthReq);
        } else {
          // Refresh failed, logout user
          authService.logout();
          return throwError(() => new Error('Token refresh failed'));
        }
      }),
      catchError((error) => {
        isRefreshing = false;
        refreshTokenSubject.next(null);
        // Refresh failed, logout user
        authService.logout();
        return throwError(() => error);
      })
    );
  };

  const token = authService.getToken();

  // If we have a token and it's still valid, add it to the request
  if (token && authService.isAuthenticated()) {
    const authReq = addAuthHeader(req, token);
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors
        if (error.status === 401) {
          console.log('🔄 Attempting token refresh for 401 error');
          return handle401Error(req);
        }

        // For other errors, just pass them through
        return throwError(() => error);
      })
    );
  } else if (token && !authService.isAuthenticated()) {
    // Token exists but is expired - try to refresh before making the request
    return handle401Error(req);
  } else {
    // No token at all - let request through (will likely get 401 from server)
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          authService.logout();
        }
        return throwError(() => error);
      })
    );
  }
};
