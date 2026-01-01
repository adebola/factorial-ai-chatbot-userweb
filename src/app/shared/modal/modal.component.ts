import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ModalService, ModalConfig } from './modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrls: ['./modal.component.scss']
})
export class ModalComponent implements OnInit, OnDestroy {
  isVisible = false;
  config: ModalConfig | null = null;
  private subscription?: Subscription;

  constructor(private modalService: ModalService) {}

  ngOnInit() {
    this.subscription = this.modalService.modal$.subscribe((config) => {
      this.config = config;
      this.isVisible = true;
    });
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  onConfirm() {
    this.modalService.sendResult(true);
    this.close();
  }

  onCancel() {
    this.modalService.sendResult(false);
    this.close();
  }

  close() {
    this.isVisible = false;
    setTimeout(() => {
      this.config = null;
    }, 300); // Wait for animation
  }

  getIconClass(): string {
    switch (this.config?.type) {
      case 'success':
        return 'bi-check-circle-fill text-success';
      case 'error':
        return 'bi-x-circle-fill text-danger';
      case 'warning':
        return 'bi-exclamation-triangle-fill text-warning';
      case 'confirm':
        return 'bi-question-circle-fill text-primary';
      default:
        return 'bi-info-circle-fill text-info';
    }
  }

  shouldShowCancel(): boolean {
    return this.config?.type === 'confirm' || this.config?.type === 'warning';
  }
}
