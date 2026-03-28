import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TenantServiceService } from '../services/tenant-service.service';
import { TenantService } from '../models/service.models';
import { ObservabilityService, ObservabilityBackend } from '../services/observability.service';
import { ServiceBackendsComponent } from '../observability/observability.component';

@Component({
  selector: 'app-services-overview',
  imports: [CommonModule, RouterModule, ServiceBackendsComponent],
  templateUrl: './services-overview.component.html',
  styleUrl: './services-overview.component.scss'
})
export class ServicesOverviewComponent implements OnInit {

  services: TenantService[] = [];
  loading = true;
  error: string | null = null;

  /** Backends loaded from the observability service for the current tenant */
  observabilityBackends: ObservabilityBackend[] = [];

  @ViewChild('backendsPanel') backendsPanel!: ServiceBackendsComponent;

  constructor(
    private tenantServiceService: TenantServiceService,
    private observabilityService: ObservabilityService
  ) {}

  ngOnInit(): void {
    this.loadServices();
    this.loadObservabilityBackends();
  }

  loadServices(): void {
    this.loading = true;
    this.error = null;

    this.tenantServiceService.getTenantServices().subscribe({
      next: (services) => {
        this.services = services;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Failed to load services. Please try again.';
        this.loading = false;
      }
    });
  }

  /**
   * Check if the tenant has observability backends configured.
   * If so, we show the observability agent card with a "View Backends" button.
   * This runs independently of the agentic-services registry.
   */
  loadObservabilityBackends(): void {
    this.observabilityService.getBackends().subscribe({
      next: (backends) => {
        this.observabilityBackends = backends || [];
      },
      error: () => {
        // Silently fail — tenant may not have observability access
        this.observabilityBackends = [];
      }
    });
  }

  get hasObservability(): boolean {
    return this.observabilityBackends.length > 0;
  }

  viewBackends(event: Event): void {
    event.stopPropagation();
    if (this.backendsPanel) {
      this.backendsPanel.serviceName = 'Observability Agent';
      this.backendsPanel.serviceKey = 'observability';
      this.backendsPanel.open();
    }
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'core': return 'smart_toy';
      case 'agentic': return 'psychology';
      case 'integration': return 'integration_instructions';
      case 'analytics': return 'analytics';
      default: return 'extension';
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'core': return 'Core';
      case 'agentic': return 'Agentic';
      case 'integration': return 'Integration';
      case 'analytics': return 'Analytics';
      default: return category.charAt(0).toUpperCase() + category.slice(1);
    }
  }
}