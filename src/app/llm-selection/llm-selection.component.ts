import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  LLMSelectionService,
  LLMProvider,
  TenantLLMSelection
} from '../services/llm-selection.service';

@Component({
  selector: 'app-llm-selection',
  imports: [CommonModule, FormsModule],
  templateUrl: './llm-selection.component.html',
  styleUrl: './llm-selection.component.scss'
})
export class LLMSelectionComponent implements OnInit {
  providers: LLMProvider[] = [];
  currentSelection: TenantLLMSelection | null = null;

  selectedProviderId: string = '';
  apiKey: string = '';
  temperature: number = 0;

  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';

  constructor(private llmSelectionService: LLMSelectionService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.clearMessages();

    this.llmSelectionService.getAvailableProviders().subscribe({
      next: (providers) => {
        this.providers = providers;
        this.loadCurrentSelection();
      },
      error: (err) => {
        console.error('Error loading providers:', err);
        this.errorMessage = 'Failed to load available AI models.';
        this.isLoading = false;
      }
    });
  }

  loadCurrentSelection(): void {
    this.llmSelectionService.getCurrentSelection().subscribe({
      next: (selection) => {
        this.currentSelection = selection;
        this.selectedProviderId = selection.llm_provider_id;
        this.temperature = selection.temperature;
        this.apiKey = '';
        this.isLoading = false;
      },
      error: () => {
        // 404 = no selection yet, which is fine
        this.currentSelection = null;
        this.selectedProviderId = '';
        this.temperature = 0;
        this.apiKey = '';
        this.isLoading = false;
      }
    });
  }

  selectProvider(provider: LLMProvider): void {
    this.selectedProviderId = provider.id;
    this.apiKey = '';
    this.clearMessages();
  }

  getSelectedProvider(): LLMProvider | undefined {
    return this.providers.find(p => p.id === this.selectedProviderId);
  }

  needsApiKey(): boolean {
    const provider = this.getSelectedProvider();
    if (!provider) return false;
    return provider.requires_api_key && !provider.has_system_api_key;
  }

  canSave(): boolean {
    if (!this.selectedProviderId) return false;
    if (this.needsApiKey() && !this.apiKey && !this.currentSelection?.has_tenant_api_key) return false;
    return true;
  }

  saveSelection(): void {
    if (!this.canSave()) return;

    this.isSaving = true;
    this.clearMessages();

    const request = {
      llm_provider_id: this.selectedProviderId,
      api_key: this.apiKey || undefined,
      temperature: this.temperature
    };

    const isUpdate = this.currentSelection !== null;
    const obs = isUpdate
      ? this.llmSelectionService.updateSelection(request)
      : this.llmSelectionService.selectLLM(request);

    obs.subscribe({
      next: (selection) => {
        this.currentSelection = selection;
        this.apiKey = '';
        this.successMessage = 'Observability AI model updated successfully.';
        this.isSaving = false;
      },
      error: (err) => {
        const msg = err.error?.detail || 'Failed to save AI model selection.';
        this.errorMessage = msg;
        this.isSaving = false;
      }
    });
  }

  removeSelection(): void {
    if (!this.currentSelection) return;
    if (!confirm('Remove your AI model selection? The system will use the default model.')) return;

    this.isSaving = true;
    this.clearMessages();

    this.llmSelectionService.deleteSelection().subscribe({
      next: () => {
        this.currentSelection = null;
        this.selectedProviderId = '';
        this.temperature = 0;
        this.apiKey = '';
        this.successMessage = 'AI model selection removed. System default will be used.';
        this.isSaving = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.detail || 'Failed to remove selection.';
        this.isSaving = false;
      }
    });
  }

  getProviderIcon(provider: string): string {
    switch (provider) {
      case 'openai': return 'auto_awesome';
      case 'anthropic': return 'psychology';
      case 'ollama': return 'computer';
      case 'azure': return 'cloud';
      default: return 'smart_toy';
    }
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
}