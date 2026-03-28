import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ObservabilityService, ObservabilityBackend } from '../services/observability.service';

@Component({
  selector: 'app-service-backends',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './observability.component.html',
  styleUrls: ['./observability.component.scss']
})
export class ServiceBackendsComponent implements OnInit {
  @Input() serviceKey: string = '';
  @Input() serviceName: string = '';

  backends: ObservabilityBackend[] = [];
  loading = true;
  error: string | null = null;
  visible = false;

  constructor(private observabilityService: ObservabilityService) {}

  ngOnInit(): void {}

  open(): void {
    this.visible = true;
    this.loadBackends();
  }

  close(): void {
    this.visible = false;
  }

  loadBackends(): void {
    this.loading = true;
    this.error = null;

    this.observabilityService.getBackends().subscribe({
      next: (backends) => {
        this.backends = backends;
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.detail || 'Failed to load backend configuration.';
        this.loading = false;
      }
    });
  }

  getBackendIcon(type: string): string {
    switch (type) {
      case 'prometheus': return 'show_chart';
      case 'elasticsearch': return 'search';
      case 'jaeger': return 'timeline';
      case 'alertmanager': return 'notifications_active';
      case 'otel_collector': return 'hub';
      case 'k8s': return 'cloud';
      case 'llm': return 'psychology';
      default: return 'settings';
    }
  }

  getBackendLabel(type: string): string {
    switch (type) {
      case 'prometheus': return 'Prometheus';
      case 'elasticsearch': return 'Elasticsearch';
      case 'jaeger': return 'Jaeger / Tempo';
      case 'alertmanager': return 'AlertManager';
      case 'otel_collector': return 'OTel Collector';
      case 'k8s': return 'Kubernetes';
      case 'llm': return 'LLM Provider';
      default: return type;
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('backends-overlay')) {
      this.close();
    }
  }
}