import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PaystackConfig, PaystackResponse } from '../models/billing.models';

/**
 * Declare Paystack handler interface for TypeScript
 */
declare global {
  interface Window {
    PaystackPop: any;
  }
}

/**
 * Paystack Service
 * Handles Paystack payment popup integration
 * Loads Paystack Inline JS library and manages payment flows
 */
@Injectable({
  providedIn: 'root'
})
export class PaystackService {
  private scriptLoaded = false;
  private scriptLoading = false;
  private scriptLoadCallbacks: Array<(loaded: boolean) => void> = [];

  constructor() {}

  /**
   * Load Paystack Inline JavaScript library
   * Returns a promise that resolves when the script is loaded
   */
  private loadPaystackScript(): Promise<boolean> {
    return new Promise((resolve) => {
      // If already loaded, resolve immediately
      if (this.scriptLoaded) {
        resolve(true);
        return;
      }

      // If currently loading, add to callback queue
      if (this.scriptLoading) {
        this.scriptLoadCallbacks.push(resolve);
        return;
      }

      // Start loading
      this.scriptLoading = true;

      // Check if script already exists in DOM
      const existingScript = document.querySelector('script[src="https://js.paystack.co/v1/inline.js"]');
      if (existingScript) {
        this.scriptLoaded = true;
        this.scriptLoading = false;
        resolve(true);
        this.executeCallbacks(true);
        return;
      }

      // Create and load script
      const script = document.createElement('script');
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.type = 'text/javascript';

      script.onload = () => {
        this.scriptLoaded = true;
        this.scriptLoading = false;
        resolve(true);
        this.executeCallbacks(true);
      };

      script.onerror = () => {
        this.scriptLoading = false;
        console.error('Failed to load Paystack script');
        resolve(false);
        this.executeCallbacks(false);
      };

      document.body.appendChild(script);
    });
  }

  /**
   * Execute queued callbacks
   */
  private executeCallbacks(loaded: boolean): void {
    this.scriptLoadCallbacks.forEach(callback => callback(loaded));
    this.scriptLoadCallbacks = [];
  }

  /**
   * Initialize Paystack payment popup
   * @param config Paystack configuration object
   * @returns Promise that resolves when payment is complete or rejected
   */
  async initializePayment(config: PaystackConfig): Promise<PaystackResponse> {
    return new Promise(async (resolve, reject) => {
      // Ensure script is loaded
      const loaded = await this.loadPaystackScript();

      if (!loaded) {
        reject(new Error('Failed to load Paystack payment library'));
        return;
      }

      // Validate PaystackPop is available
      if (typeof window.PaystackPop === 'undefined') {
        reject(new Error('Paystack library not initialized'));
        return;
      }

      try {
        // Initialize Paystack handler
        const handler = window.PaystackPop.setup({
          key: config.key,
          email: config.email,
          amount: config.amount, // Amount in kobo (NGN)
          ref: config.ref,
          currency: config.currency || 'NGN',
          metadata: config.metadata || {},
          callback: (response: PaystackResponse) => {
            // Payment successful
            if (config.callback) {
              config.callback(response);
            }
            resolve(response);
          },
          onClose: () => {
            // User closed the popup without completing payment
            if (config.onClose) {
              config.onClose();
            }
            reject(new Error('Payment cancelled by user'));
          }
        });

        // Open payment popup
        handler.openIframe();
      } catch (error) {
        console.error('Error initializing Paystack payment:', error);
        reject(error);
      }
    });
  }

  /**
   * Quick payment initialization with minimal config
   * @param email User email
   * @param amount Amount in Naira (will be converted to kobo)
   * @param reference Payment reference
   * @param metadata Optional metadata
   * @returns Promise resolving to payment response
   */
  async quickPayment(
    email: string,
    amount: number,
    reference: string,
    metadata?: Record<string, any>
  ): Promise<PaystackResponse> {
    const config: PaystackConfig = {
      key: environment.paystack.publicKey,
      email: email,
      amount: this.convertToKobo(amount),
      ref: reference,
      currency: environment.paystack.currency,
      metadata: metadata
    };

    return this.initializePayment(config);
  }

  /**
   * Convert Naira to Kobo (multiply by 100)
   * Paystack requires amount in kobo for NGN
   */
  convertToKobo(nairaAmount: number): number {
    return Math.round(nairaAmount * 100);
  }

  /**
   * Convert Kobo to Naira (divide by 100)
   */
  convertFromKobo(koboAmount: number): number {
    return koboAmount / 100;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, includeCurrency: boolean = true): string {
    const formatted = amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return includeCurrency ? `₦${formatted}` : formatted;
  }

  /**
   * Verify payment reference format
   */
  isValidReference(reference: string): boolean {
    // Reference should not be empty and should match expected format
    return !!reference && reference.length > 0 && /^[a-zA-Z0-9_-]+$/.test(reference);
  }

  /**
   * Check if Paystack is enabled in environment
   */
  isPaystackEnabled(): boolean {
    return environment.billing?.enablePayments === true;
  }

  /**
   * Get Paystack public key from environment
   */
  getPublicKey(): string {
    return environment.paystack.publicKey;
  }

  /**
   * Get default currency from environment
   */
  getDefaultCurrency(): string {
    return environment.paystack.currency || 'NGN';
  }

  /**
   * Get currency symbol
   */
  getCurrencySymbol(): string {
    return environment.billing?.currencySymbol || '₦';
  }
}
