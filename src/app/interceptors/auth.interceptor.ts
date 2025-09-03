import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  // Skip authentication for login and tenant creation endpoints only
  const skipAuth = req.url.includes('/auth/login') || 
                  req.url.includes('/auth/signup') ||
                  (req.url.includes('/tenants/') && req.method === 'POST' && !req.url.includes('/settings') && !req.url.includes('/logo'));
  
  if (skipAuth) {
    return next(req);
  }

  const token = authService.getToken();
  
  if (token) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
