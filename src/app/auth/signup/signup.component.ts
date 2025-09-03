import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, SignupRequest } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  signupData: SignupRequest = {
    name: '',
    domain: '',
    username: '',
    password: '',
    email: '',
    website_url: '',
    subscription_tier: 'basic'
  };
  
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect if already authenticated
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/upload']);
    }
  }

  onSignup(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Remove empty optional fields
    const signupPayload = { ...this.signupData };
    if (!signupPayload.email?.trim()) {
      delete signupPayload.email;
    }
    if (!signupPayload.website_url?.trim()) {
      delete signupPayload.website_url;
    }

    this.authService.signup(signupPayload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Account created successfully! You can now sign in.';
        
        // Auto redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        if (error.error?.detail) {
          this.errorMessage = error.error.detail;
        } else if (error.status === 400) {
          this.errorMessage = 'Invalid information provided. Please check your details.';
        } else {
          this.errorMessage = 'Signup failed. Please try again.';
        }
        console.error('Signup error:', error);
      }
    });
  }

  private validateForm(): boolean {
    // Reset errors
    this.errorMessage = '';

    // Check required fields
    if (!this.signupData.name?.trim()) {
      this.errorMessage = 'Organization name is required';
      return false;
    }

    if (!this.signupData.domain?.trim()) {
      this.errorMessage = 'Domain is required';
      return false;
    }

    if (!this.signupData.username?.trim()) {
      this.errorMessage = 'Username is required';
      return false;
    }

    if (!this.signupData.password?.trim()) {
      this.errorMessage = 'Password is required';
      return false;
    }

    if (this.signupData.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return false;
    }

    if (this.signupData.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return false;
    }

    // Validate email if provided
    if (this.signupData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.signupData.email)) {
        this.errorMessage = 'Please enter a valid email address';
        return false;
      }
    }

    // Validate website URL if provided
    if (this.signupData.website_url?.trim()) {
      if (!this.signupData.website_url.startsWith('http://') && 
          !this.signupData.website_url.startsWith('https://')) {
        this.errorMessage = 'Website URL must start with http:// or https://';
        return false;
      }
    }

    return true;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  get apiUrl(): string {
    return environment.apiUrl;
  }
}
