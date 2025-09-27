import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the intended URL for after login (including query parameters and fragments)
  const fullUrl = state.url;
  authService.setReturnUrl(fullUrl);

  // Redirect to login page with return url for immediate display
  router.navigate(['/login'], { queryParams: { returnUrl: fullUrl } });
  return false;
};
