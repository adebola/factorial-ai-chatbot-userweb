import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, BehaviorSubject } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Skip authentication for specific OAuth2 and public endpoints
  const skipAuth =
    // OAuth2 Authorization Server endpoints (port 9002)
    req.url.includes('/auth/oauth2') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/login') ||
    // req.url.includes('/public/logo') ||
    req.url.includes('/auth/invitation');
    // Skip token refresh endpoint to avoid infinite loops
    // req.url.includes('/oauth2/token');

  if (skipAuth) {
    return next(req);
  }

  // Helper function to add auth header
  const addAuthHeader = (request: any, token: string) => {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  };

  // Helper function to handle 401 errors
  const handle401Error = (request: any) => {
    console.log('🔍 Checking refresh token validity...');
    // Check if we can refresh the token
    if (!authService.isRefreshTokenValid()) {
      authService.logout();
      return throwError(() => new Error('Refresh token expired'));
    }

    console.log('✅ Refresh token valid, attempting refresh...');
    // Attempt token refresh
    return authService.refreshToken().pipe(
      switchMap((newToken: string | null) => {
        if (newToken) {
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
        // Refresh failed, logout user
        authService.logout();
        return throwError(() => error);
      })
    );
  };

  const token = authService.getToken();

  if (token && authService.isAuthenticated()) {
    const authReq = addAuthHeader(req, token);

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        console.log(`🔴 HTTP Error ${error.status} for ${req.url}:`, error);
        // Handle 401 Unauthorized errors
        if (error.status === 401) {
          console.log('🔄 Attempting token refresh for 401 error');
          return handle401Error(req);
        }
        // For other errors, just pass them through
        return throwError(() => error);
      })
    );
  }

  return next(req);
};
