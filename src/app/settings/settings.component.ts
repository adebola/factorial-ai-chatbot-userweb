import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, TenantSettings, SettingsUpdate } from '../services/settings.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent implements OnInit {
  settings: TenantSettings = {
    tenantId: '',
    primaryColor: '#5D3EC1',
    secondaryColor: '#C15D3E',
    hoverText: 'Chat with us!',
    welcomeMessage: 'Hello! How can I help you today?',
    chatWindowTitle: 'Chat Support',
    additionalSettings: {}
  };

  additionalSettingsJson: string = '{}';
  selectedLogo: File | null = null;
  selectedLogoPreview: string | null = null;

  isLoading = false;
  isSaving = false;
  isUploading = false;
  isProduction = environment.production;

  errorMessage: string = '';
  successMessage: string = '';
  jsonError: string = '';

  currentTenantId: string = '';

  constructor(
    private settingsService: SettingsService,
    private authService: AuthService
  ) {
    const user = this.authService.getCurrentUser();
    this.currentTenantId = user?.tenant_id || '';
  }

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.isLoading = true;
    this.clearMessages();

    this.settingsService.getSettings().subscribe({
      next: (settings) => {
        this.settings = settings;
        this.additionalSettingsJson = JSON.stringify(settings.additionalSettings || {}, null, 2);
        this.isLoading = false;
        console.log('✅ Settings loaded successfully:', settings);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
        console.error('❌ Error loading settings:', error);
      }
    });
  }

  saveSettings(): void {
    this.isSaving = true;
    this.clearMessages();
    this.validateJson();

    if (this.jsonError) {
      this.isSaving = false;
      this.errorMessage = 'Please fix the JSON format error before saving.';
      return;
    }

    const updateData: SettingsUpdate = {
      primaryColor: this.settings.primaryColor,
      secondaryColor: this.settings.secondaryColor,
      hoverText: this.settings.hoverText,
      welcomeMessage: this.settings.welcomeMessage,
      chatWindowTitle: this.settings.chatWindowTitle,
      additionalSettings: this.parseAdditionalSettings()
    };

    this.settingsService.updateSettings(updateData).subscribe({
      next: (updatedSettings) => {
        this.settings = updatedSettings;
        this.isSaving = false;
        this.successMessage = 'Settings saved successfully!';
        console.log('✅ Settings updated successfully:', updatedSettings);
      },
      error: (error) => {
        this.isSaving = false;
        this.errorMessage = this.getErrorMessage(error);
        console.error('❌ Error updating settings:', error);
      }
    });
  }

  onLogoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Invalid file type. Please select PNG, JPEG, JPG, SVG, or WebP files.';
        this.clearSelectedLogo();
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size must be less than 5MB.';
        this.clearSelectedLogo();
        return;
      }

      this.selectedLogo = file;
      this.createImagePreview(file);
      this.clearMessages();
    }
  }

  private createImagePreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.selectedLogoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  clearSelectedLogo(): void {
    this.selectedLogo = null;
    this.selectedLogoPreview = null;

    // Reset file input
    const fileInput = document.getElementById('logoFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }

    this.clearMessages();
  }

  uploadLogo(): void {
    if (!this.selectedLogo) {
      this.errorMessage = 'Please select a logo file first.';
      return;
    }

    this.isUploading = true;
    this.clearMessages();

    this.settingsService.uploadLogo(this.selectedLogo).subscribe({
      next: (response) => {
        this.isUploading = false;
        this.clearSelectedLogo();
        this.successMessage = 'Logo uploaded successfully!';

        // Reload settings to get updated logo URL
        this.loadSettings();
        console.log('✅ Logo uploaded successfully:', response);
      },
      error: (error) => {
        this.isUploading = false;
        this.errorMessage = this.getErrorMessage(error);
        console.error('❌ Error uploading logo:', error);
      }
    });
  }

  deleteLogo(): void {
    if (!confirm('Are you sure you want to delete the current logo?')) {
      return;
    }

    this.settingsService.deleteLogo().subscribe({
      next: (response) => {
        this.settings.companyLogoUrl = undefined;
        this.successMessage = 'Logo deleted successfully!';
        console.log('✅ Logo deleted successfully:', response);
      },
      error: (error) => {
        this.errorMessage = this.getErrorMessage(error);
        console.error('❌ Error deleting logo:', error);
      }
    });
  }

  resetToDefaults(): void {
    if (!confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      return;
    }

    const defaults = this.settingsService.getDefaultSettings();
    this.settings = {
      ...this.settings,
      ...defaults
    };
    this.additionalSettingsJson = JSON.stringify(defaults.additionalSettings || {}, null, 2);
    this.clearSelectedLogo();

    this.successMessage = 'Settings reset to defaults. Click "Save Settings" to apply changes.';
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.jsonError = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private validateJson(): void {
    this.jsonError = '';
    if (this.additionalSettingsJson.trim()) {
      try {
        JSON.parse(this.additionalSettingsJson);
      } catch (error) {
        this.jsonError = 'Invalid JSON format';
      }
    }
  }

  private parseAdditionalSettings(): Record<string, any> {
    if (!this.additionalSettingsJson.trim()) {
      return {};
    }

    try {
      return JSON.parse(this.additionalSettingsJson);
    } catch (error) {
      return {};
    }
  }

  onColorChange(colorType: 'primary' | 'secondary', event: any): void {
    const hexColor = event.target.value;
    console.log(`Color picker changed: ${colorType} = ${hexColor}`);

    if (colorType === 'primary') {
      this.settings.primaryColor = hexColor;
    } else {
      this.settings.secondaryColor = hexColor;
    }

    // Force change detection
    this.settings = { ...this.settings };
  }

  onColorTextChange(colorType: 'primary' | 'secondary', event: any): void {
    const hexColor = event.target.value;
    console.log(`Color text changed: ${colorType} = ${hexColor}`);

    // Always update the value for typing, but validate for color picker sync
    if (colorType === 'primary') {
      this.settings.primaryColor = hexColor;
    } else {
      this.settings.secondaryColor = hexColor;
    }

    // If it's a valid hex color, sync with color picker
    if (this.settingsService.isValidHexColor(hexColor)) {
      // Force change detection
      this.settings = { ...this.settings };
    }
  }

  private getErrorMessage(error: any): string {
    if (error?.error?.detail) {
      return error.error.detail;
    } else if (error?.error?.message) {
      return error.error.message;
    } else if (error?.message) {
      return error.message;
    } else if (typeof error?.error === 'string') {
      return error.error;
    } else {
      return 'An unexpected error occurred. Please try again.';
    }
  }
}
