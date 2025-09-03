import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  credentials: LoginRequest = {
    username: '',
    password: ''
  };

  isLoading = false;
  errorMessage = '';
  returnUrl = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // Get return URL from route parameters or default to '/documents'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/documents';

    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate([this.returnUrl]);
    }
  }

  onLogin(): void {
    if (!this.credentials.username.trim() || !this.credentials.password.trim()) {
      this.errorMessage = 'Please enter both username and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.router.navigate([this.returnUrl]).then(
          (success) => {},
          (error) => {
            this.errorMessage = 'Login successful but navigation failed. Please refresh the page.';
          }
        );
      },
      error: (error) => {
        console.error('❌ Login component received error:', error);
        this.isLoading = false;
        if (error.error?.detail) {
          this.errorMessage = error.error.detail;
        } else if (error.status === 401) {
          this.errorMessage = 'Invalid username or password';
        } else {
          this.errorMessage = 'Login failed. Please try again.';
        }
        console.error('Login error details:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          message: error.message
        });
      }
    });
  }

  clearError(): void {
    this.errorMessage = '';
  }

  get apiUrl(): string {
    return environment.apiUrl;
  }
}
