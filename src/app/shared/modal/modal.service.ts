import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalConfig {
  title: string;
  message: string;
  type: 'confirm' | 'alert' | 'success' | 'error' | 'warning';
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

export interface ModalResult {
  confirmed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new Subject<ModalConfig>();
  private resultSubject = new Subject<ModalResult>();

  public modal$ = this.modalSubject.asObservable();
  public result$ = this.resultSubject.asObservable();

  /**
   * Show confirmation dialog
   */
  confirm(title: string, message: string, confirmText = 'Confirm', cancelText = 'Cancel'): Promise<boolean> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'confirm',
        confirmText,
        cancelText,
        confirmButtonClass: 'btn-primary'
      };

      this.modalSubject.next(config);

      const subscription = this.result$.subscribe((result) => {
        subscription.unsubscribe();
        resolve(result.confirmed);
      });
    });
  }

  /**
   * Show alert dialog
   */
  alert(title: string, message: string, buttonText = 'OK'): Promise<void> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'alert',
        confirmText: buttonText,
        confirmButtonClass: 'btn-primary'
      };

      this.modalSubject.next(config);

      const subscription = this.result$.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });
    });
  }

  /**
   * Show success dialog
   */
  success(title: string, message: string, buttonText = 'OK'): Promise<void> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'success',
        confirmText: buttonText,
        confirmButtonClass: 'btn-success'
      };

      this.modalSubject.next(config);

      const subscription = this.result$.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });
    });
  }

  /**
   * Show error dialog
   */
  error(title: string, message: string, buttonText = 'OK'): Promise<void> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'error',
        confirmText: buttonText,
        confirmButtonClass: 'btn-danger'
      };

      this.modalSubject.next(config);

      const subscription = this.result$.subscribe(() => {
        subscription.unsubscribe();
        resolve();
      });
    });
  }

  /**
   * Show warning dialog
   */
  warning(title: string, message: string, confirmText = 'Continue', cancelText = 'Cancel'): Promise<boolean> {
    return new Promise((resolve) => {
      const config: ModalConfig = {
        title,
        message,
        type: 'warning',
        confirmText,
        cancelText,
        confirmButtonClass: 'btn-warning'
      };

      this.modalSubject.next(config);

      const subscription = this.result$.subscribe((result) => {
        subscription.unsubscribe();
        resolve(result.confirmed);
      });
    });
  }

  /**
   * Send result back to caller
   */
  sendResult(confirmed: boolean): void {
    this.resultSubject.next({ confirmed });
  }
}
