import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-callback',
  imports: [CommonModule],
  templateUrl: './callback.component.html',
  styleUrl: './callback.component.scss'
})

export class CallbackComponent implements OnInit {
  isProcessing = true;
  error: string | null = null;
  message: string = 'Processing OAuth2 callback...';

  constructor(private authService: AuthService, private router: Router) {}

  retryLogin(): void {
    this.router.navigate(['/login']).then(r => {});
  }

  ngOnInit() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    console.log('OAuth2 callback', code)

    if (code) {
      this.authService.exchangeCodeForToken(code)
        .subscribe(
          (tokens) => {
            console.log('token:  ', tokens);
            this.isProcessing = false;
            localStorage.setItem('access_token', tokens.access_token);
            this.message = 'Authentication successful! Redirecting...';
            if (tokens.refresh_token) {
              localStorage.setItem('refresh_token', tokens.refresh_token);
            }
            // Immediately hydrate current user from the stored token
            this.authService.hydrateUserFromToken();

            // Get the stored return URL and redirect there, or default to dashboard
            const redirectUrl = this.authService.getAndClearReturnUrl();
            console.log(`✅ Authentication successful, redirecting to: ${redirectUrl}`);

            setTimeout(() => {
              this.router.navigate([redirectUrl]).then(success => {
                if (success) {
                  console.log(`🎯 Successfully redirected to: ${redirectUrl}`);
                } else {
                  console.error(`❌ Failed to redirect to: ${redirectUrl}, falling back to dashboard`);
                  this.router.navigate(['/dashboard']);
                }
              });
            }, 1000);
          },
          (error) => console.log(`Error in exchangeCodeForToken message: ${error.message} code: ${error.code} error: ${error.error}`),
          () => console.log('exchangeCodeForToken completed')
        );
    }
  }
}

// export class CallbackComponent implements OnInit {
//   isProcessing = true;
//   error: string | null = null;
//   message: string = 'Processing OAuth2 callback...';
//
//   constructor(
//     private route: ActivatedRoute,
//     private router: Router,
//     private authService: AuthService
//   ) {}
//
//   ngOnInit(): void {
//     this.handleCallback();
//   }
//
//   private handleCallback(): void {
//     // Get authorization code and state from query parameters
//     const code = this.route.snapshot.queryParamMap.get('code');
//     //const state = this.route.snapshot.queryParamMap.get('state');
//     const errorParam = this.route.snapshot.queryParamMap.get('error');
//     const errorDescription = this.route.snapshot.queryParamMap.get('error_description');
//
//     //console.log('OAuth2 callback received:', { code: !!code, state: !!state, error: errorParam });
//
//     // Handle OAuth2 error response
//     if (errorParam) {
//       this.handleError(`OAuth2 Error: ${errorParam}${errorDescription ? ` - ${errorDescription}` : ''}`);
//       return;
//     }
//
//     // Validate required parameters
//     if (!code) {
//       this.handleError('Missing required OAuth2 parameters (code or state)');
//       return;
//     }
//
//     this.message = 'Exchanging authorization code for tokens...';
//
//     // Exchange authorization code for tokens
//     this.authService.exchangeCodeForToken(code).subscribe({
//       next: (tokenResponse) => {
//         console.log('✅ OAuth2 callback successful:', tokenResponse);
//         this.message = 'Authentication successful! Redirecting...';
//
//         // Set tokens in auth service (this should handle user extraction)
//         if (tokenResponse.access_token) {
//           // The exchangeCodeForToken should handle setting tokens, but let's ensure it
//           this.isProcessing = false;
//
//           // Redirect to dashboard after a brief delay
//           setTimeout(() => {
//             this.router.navigate(['/dashboard']);
//           }, 1500);
//         } else {
//           this.handleError('No access token received from authorization server');
//         }
//       },
//       error: (error) => {
//         console.error('❌ OAuth2 callback error:', error);
//         this.handleError(this.getErrorMessage(error));
//       }
//     });
//   }
//
//   private handleError(errorMessage: string): void {
//     this.isProcessing = false;
//     this.error = errorMessage;
//     this.message = '';
//
//     // Auto-redirect to login after error display
//     setTimeout(() => {
//       this.router.navigate(['/login'], {
//         queryParams: {
//           error: 'oauth2_callback_failed',
//           message: errorMessage
//         }
//       });
//     }, 5000);
//   }
//
//   private getErrorMessage(error: any): string {
//     if (error?.error?.error_description) {
//       return error.error.error_description;
//     } else if (error?.error?.message) {
//       return error.error.message;
//     } else if (error?.message) {
//       return error.message;
//     } else if (typeof error === 'string') {
//       return error;
//     } else {
//       return 'An unexpected error occurred during authentication';
//     }
//   }
//
//   retryLogin(): void {
//     this.router.navigate(['/login']);
//   }
// }
