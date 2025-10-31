import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { QualityService } from '../../services/quality.service';
import {
  KnowledgeGap,
  KnowledgeGapsListResponse,
  GapStatus
} from '../../models/quality.models';

@Component({
  selector: 'app-knowledge-gaps',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './knowledge-gaps.component.html',
  styleUrl: './knowledge-gaps.component.scss'
})
export class KnowledgeGapsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  knowledgeGaps: KnowledgeGap[] = [];
  loading = true;
  error: string | null = null;
  totalGaps = 0;

  // Filters
  statusFilter: GapStatus | 'all' = 'all';

  // Detection
  detecting = false;
  detectionDays = 7;

  // Selected gap for details
  selectedGap: KnowledgeGap | null = null;
  expandedGapId: string | null = null;

  // Action dialogs
  showAcknowledgeDialog = false;
  showResolveDialog = false;
  acknowledgeNotes = '';
  resolutionNotes = '';

  constructor(private qualityService: QualityService) {}

  ngOnInit(): void {
    this.loadKnowledgeGaps();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadKnowledgeGaps(): void {
    this.loading = true;
    this.error = null;

    const filter = this.statusFilter !== 'all' ? { status: this.statusFilter } : undefined;

    this.qualityService.listKnowledgeGaps(filter, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: KnowledgeGapsListResponse) => {
          this.knowledgeGaps = response.gaps;
          this.totalGaps = response.count;
          this.loading = false;
        },
        error: (error) => {
          this.error = 'Failed to load knowledge gaps';
          this.loading = false;
          console.error('Error loading knowledge gaps:', error);
        }
      });
  }

  filterByStatus(status: GapStatus | 'all'): void {
    this.statusFilter = status;
    this.loadKnowledgeGaps();
  }

  detectGaps(): void {
    this.detecting = true;

    this.qualityService.detectKnowledgeGaps(this.detectionDays)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.detecting = false;
          console.log('Gap detection complete:', response);
          this.loadKnowledgeGaps(); // Reload the list
        },
        error: (error) => {
          this.detecting = false;
          console.error('Error detecting gaps:', error);
        }
      });
  }

  toggleGapDetails(gapId: string): void {
    this.expandedGapId = this.expandedGapId === gapId ? null : gapId;
  }

  openAcknowledgeDialog(gap: KnowledgeGap): void {
    this.selectedGap = gap;
    this.acknowledgeNotes = '';
    this.showAcknowledgeDialog = true;
  }

  closeAcknowledgeDialog(): void {
    this.showAcknowledgeDialog = false;
    this.selectedGap = null;
    this.acknowledgeNotes = '';
  }

  acknowledgeGap(): void {
    if (!this.selectedGap) return;

    this.qualityService.acknowledgeGap(this.selectedGap.id, {
      notes: this.acknowledgeNotes || undefined
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeAcknowledgeDialog();
          this.loadKnowledgeGaps();
        },
        error: (error) => {
          console.error('Error acknowledging gap:', error);
        }
      });
  }

  openResolveDialog(gap: KnowledgeGap): void {
    this.selectedGap = gap;
    this.resolutionNotes = '';
    this.showResolveDialog = true;
  }

  closeResolveDialog(): void {
    this.showResolveDialog = false;
    this.selectedGap = null;
    this.resolutionNotes = '';
  }

  resolveGap(): void {
    if (!this.selectedGap || !this.resolutionNotes) return;

    this.qualityService.resolveGap(this.selectedGap.id, {
      resolution_notes: this.resolutionNotes
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeResolveDialog();
          this.loadKnowledgeGaps();
        },
        error: (error) => {
          console.error('Error resolving gap:', error);
        }
      });
  }

  getStatusBadgeClass(status: GapStatus): string {
    switch (status) {
      case 'detected':
        return 'status-detected';
      case 'acknowledged':
        return 'status-acknowledged';
      case 'resolved':
        return 'status-resolved';
      default:
        return '';
    }
  }

  getStatusIcon(status: GapStatus): string {
    switch (status) {
      case 'detected':
        return 'report_problem';
      case 'acknowledged':
        return 'visibility';
      case 'resolved':
        return 'check_circle';
      default:
        return 'help';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  refresh(): void {
    this.loadKnowledgeGaps();
  }
}