import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, RouterModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent implements OnInit {
  isLoading = false;
  private registrationEndPoint = environment.authServiceUrl + '/register';

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    // Automatically redirect to authorization server registration
    setTimeout(() => this.initiateRegistration(), 1000);
  }

  initiateRegistration(): void {
    this.isLoading = true;

    try {
      // Redirect to authorization server registration page
      window.location.href = this.registrationEndPoint;
    } catch (error) {
      console.error('❌ Error redirecting to registration:', error);
      this.isLoading = false;
    }
  }
}
