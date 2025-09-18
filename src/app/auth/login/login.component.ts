import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent implements OnInit {
  isLoading = false;
  oauthError = '';
  returnUrl = '';
  isFromLogout = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Get return URL from route parameters or default to '/dashboard'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/dashboard';

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  ngOnInit(): void {
    // Check for OAuth2 error parameters from callback
    const error = this.route.snapshot.queryParams['error'];
    const errorMessage = this.route.snapshot.queryParams['message'];
    const fromAutoLogout = this.route.snapshot.queryParams['fromAutoLogout'];
    const logoutSuccess = this.route.snapshot.queryParams['logout'];

    // Check if this is an intentional logout
    const wasIntentionalLogout = sessionStorage.getItem('intentional_logout');
    if (wasIntentionalLogout) {
      sessionStorage.removeItem('intentional_logout');
      this.isFromLogout = true;
    }

    if (error === 'oauth2_callback_failed' && errorMessage) {
      this.oauthError = errorMessage;
    } else if (logoutSuccess === 'success') {
      // User successfully logged out - show login screen without auto-redirect
      this.isFromLogout = true;
    } else if (fromAutoLogout === 'true') {
      // Auto-logout (401, token expiry) - auto-initiate OAuth2 flow
      setTimeout(() => this.initiateLogin(), 1000);
    } else if (!this.authService.isAuthenticated() && !wasIntentionalLogout) {
      // User is not authenticated and not from intentional logout - auto-login
      // This is for users who navigate to the app without being logged in
      setTimeout(() => this.initiateLogin(), 1000);
    }
  }

  initiateLogin(): void {
    this.isLoading = true;
    this.oauthError = '';

    try {
      // Initiate OAuth2 Authorization Code flow
      // The authService.initiateLogin() will redirect to authorization server
      this.authService.login();
    } catch (error) {
      this.isLoading = false;
      this.oauthError = 'Failed to initiate login. Please try again.';
    }
  }

  retryLogin(): void {
    this.oauthError = '';
    this.initiateLogin();
  }


  get hasOAuth2Error(): boolean {
    return !!this.oauthError;
  }
}
