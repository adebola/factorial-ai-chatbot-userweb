import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Store the intended URL for after login
  authService.setReturnUrl(state.url);

  // Redirect to login page with return url for immediate display
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};
