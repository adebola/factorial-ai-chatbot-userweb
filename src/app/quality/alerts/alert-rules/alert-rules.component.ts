import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { QualityService } from '../../../services/quality.service';
import {
  AlertRule,
  CreateAlertRuleRequest,
  UpdateAlertRuleRequest,
  AlertRuleType,
  NotificationChannel
} from '../../../models/quality.models';

@Component({
  selector: 'app-alert-rules',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './alert-rules.component.html',
  styleUrls: ['./alert-rules.component.scss']
})
export class AlertRulesComponent implements OnInit {
  alertRules: AlertRule[] = [];
  loading = false;
  error: string | null = null;
  showModal = false;
  editMode = false;
  currentRuleId: string | null = null;

  // Form data
  formData = {
    name: '',
    rule_type: 'quality_drop' as AlertRuleType,
    description: '',
    threshold_value: 0.7,
    check_interval_hours: 1,
    min_sample_size: 10,
    notification_channels: ['console'] as NotificationChannel[],
    email_recipients: '',
    webhook_urls: '',
    throttle_minutes: 60,
    enabled: true
  };

  // Available options
  ruleTypes: { value: AlertRuleType; label: string; description: string }[] = [
    { value: 'quality_drop', label: 'Quality Drop', description: 'Alert when answer quality drops below threshold' },
    { value: 'new_gaps', label: 'New Knowledge Gaps', description: 'Alert when new knowledge gaps are detected' },
    { value: 'high_negative_feedback', label: 'High Negative Feedback', description: 'Alert when negative feedback exceeds threshold' },
    { value: 'session_degradation', label: 'Session Degradation', description: 'Alert when session quality degrades' }
  ];

  channels: { value: NotificationChannel; label: string }[] = [
    { value: 'console', label: 'Console Log' },
    { value: 'email', label: 'Email' },
    { value: 'webhook', label: 'Webhook' }
  ];

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadAlertRules();
  }

  loadAlertRules(enabledOnly = false): void {
    this.loading = true;
    this.error = null;

    this.qualityService.listAlertRules(enabledOnly).subscribe({
      next: (response) => {
        this.alertRules = response.rules;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load alert rules: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  openCreateModal(): void {
    this.editMode = false;
    this.currentRuleId = null;
    this.resetForm();
    this.showModal = true;
  }

  openEditModal(rule: AlertRule): void {
    this.editMode = true;
    this.currentRuleId = rule.id;
    this.formData = {
      name: rule.name,
      rule_type: rule.rule_type,
      description: rule.description || '',
      threshold_value: rule.threshold_value,
      check_interval_hours: rule.check_interval_hours,
      min_sample_size: rule.min_sample_size,
      notification_channels: [...rule.notification_channels],
      email_recipients: rule.notification_recipients?.emails?.join(', ') || '',
      webhook_urls: rule.notification_recipients?.webhook_urls?.join(', ') || '',
      throttle_minutes: rule.throttle_minutes,
      enabled: rule.enabled
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.formData = {
      name: '',
      rule_type: 'quality_drop',
      description: '',
      threshold_value: 0.7,
      check_interval_hours: 1,
      min_sample_size: 10,
      notification_channels: ['console'],
      email_recipients: '',
      webhook_urls: '',
      throttle_minutes: 60,
      enabled: true
    };
  }

  toggleChannel(channel: NotificationChannel): void {
    const index = this.formData.notification_channels.indexOf(channel);
    if (index > -1) {
      this.formData.notification_channels.splice(index, 1);
    } else {
      this.formData.notification_channels.push(channel);
    }
  }

  isChannelSelected(channel: NotificationChannel): boolean {
    return this.formData.notification_channels.includes(channel);
  }

  saveRule(): void {
    if (!this.formData.name || this.formData.notification_channels.length === 0) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;

    const request: CreateAlertRuleRequest | UpdateAlertRuleRequest = {
      name: this.formData.name,
      rule_type: this.formData.rule_type,
      description: this.formData.description || undefined,
      threshold_value: this.formData.threshold_value,
      check_interval_hours: this.formData.check_interval_hours,
      min_sample_size: this.formData.min_sample_size,
      notification_channels: this.formData.notification_channels,
      notification_recipients: {
        emails: this.formData.email_recipients
          ? this.formData.email_recipients.split(',').map(e => e.trim()).filter(e => e)
          : undefined,
        webhook_urls: this.formData.webhook_urls
          ? this.formData.webhook_urls.split(',').map(u => u.trim()).filter(u => u)
          : undefined
      },
      throttle_minutes: this.formData.throttle_minutes,
      enabled: this.formData.enabled
    };

    if (this.editMode && this.currentRuleId) {
      this.qualityService.updateAlertRule(this.currentRuleId, request).subscribe({
        next: () => {
          this.loading = false;
          this.closeModal();
          this.loadAlertRules();
        },
        error: (err) => {
          this.error = 'Failed to update rule: ' + (err.error?.message || err.message);
          this.loading = false;
        }
      });
    } else {
      this.qualityService.createAlertRule(request as CreateAlertRuleRequest).subscribe({
        next: () => {
          this.loading = false;
          this.closeModal();
          this.loadAlertRules();
        },
        error: (err) => {
          this.error = 'Failed to create rule: ' + (err.error?.message || err.message);
          this.loading = false;
        }
      });
    }
  }

  toggleRule(rule: AlertRule): void {
    const request: UpdateAlertRuleRequest = {
      enabled: !rule.enabled
    };

    this.qualityService.updateAlertRule(rule.id, request).subscribe({
      next: () => {
        this.loadAlertRules();
      },
      error: (err) => {
        this.error = 'Failed to toggle rule: ' + (err.error?.message || err.message);
      }
    });
  }

  deleteRule(rule: AlertRule): void {
    if (!confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      return;
    }

    this.qualityService.deleteAlertRule(rule.id).subscribe({
      next: () => {
        this.loadAlertRules();
      },
      error: (err) => {
        this.error = 'Failed to delete rule: ' + (err.error?.message || err.message);
      }
    });
  }

  testRule(rule: AlertRule): void {
    this.qualityService.sendTestAlert({ rule_id: rule.id }).subscribe({
      next: (response) => {
        alert('Test alert sent successfully!\n\nChannels: ' + response.channels.join(', '));
      },
      error: (err) => {
        this.error = 'Failed to send test alert: ' + (err.error?.message || err.message);
      }
    });
  }

  getRuleTypeLabel(type: AlertRuleType): string {
    const ruleType = this.ruleTypes.find(rt => rt.value === type);
    return ruleType ? ruleType.label : type;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
}
