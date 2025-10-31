import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { WorkflowService } from '../../services/workflow.service';
import { AuthService } from '../../services/auth.service';
import { WorkflowTemplateResponse } from '../../models/workflow.models';

@Component({
  selector: 'app-workflow-templates',
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-templates.component.html',
  styleUrl: './workflow-templates.component.scss'
})
export class WorkflowTemplatesComponent implements OnInit {
  templates: WorkflowTemplateResponse[] = [];
  filteredTemplates: WorkflowTemplateResponse[] = [];
  categories: string[] = ['Customer Support', 'Sales', 'Marketing', 'HR', 'Operations', 'Other'];
  selectedCategory = '';
  searchTerm = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Pagination
  currentPage = 1;
  pageSize = 12;
  totalCount = 0;

  // View mode
  viewMode: 'grid' | 'list' = 'grid';

  constructor(
    private workflowService: WorkflowService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.workflowService.getWorkflowTemplates(
      this.currentPage,
      this.pageSize,
      this.selectedCategory || undefined
    ).subscribe({
      next: (response) => {
        this.templates = response.templates;
        this.filteredTemplates = this.templates;
        this.totalCount = response.total;
        this.applySearch();
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load templates. Please try again.';
        console.error('Load templates error:', error);
      }
    });
  }

  applySearch(): void {
    if (!this.searchTerm) {
      this.filteredTemplates = this.templates;
      return;
    }

    const search = this.searchTerm.toLowerCase();
    this.filteredTemplates = this.templates.filter(template =>
      template.name.toLowerCase().includes(search) ||
      template.description?.toLowerCase().includes(search) ||
      template.tags?.some(tag => tag.toLowerCase().includes(search))
    );
  }

  onSearchChange(): void {
    this.applySearch();
  }

  onCategoryChange(): void {
    this.currentPage = 1;
    this.loadTemplates();
  }

  createFromTemplate(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (!template) return;

    const workflowName = prompt(`Enter a name for your new workflow (based on ${template.name}):`);
    if (!workflowName) return;

    this.isLoading = true;
    this.workflowService.createWorkflowFromTemplate(templateId, workflowName).subscribe({
      next: (workflow) => {
        this.successMessage = `Workflow "${workflowName}" created successfully!`;
        setTimeout(() => {
          this.router.navigate(['/workflows', workflow.id]);
        }, 1500);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.detail || 'Failed to create workflow from template';
        console.error('Create from template error:', error);
      }
    });
  }

  viewTemplateDetails(templateId: string): void {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      // Could open a modal or navigate to details page
      console.log('Template details:', template);
    }
  }

  // Pagination methods
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadTemplates();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

  getPaginationArray(): number[] {
    const totalPages = this.getTotalPages();
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // View mode methods
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  // Helper methods
  getRatingStars(rating: number): string[] {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push('star');
    }
    if (hasHalfStar) {
      stars.push('star_half');
    }
    for (let i = stars.length; i < 5; i++) {
      stars.push('star_border');
    }

    return stars;
  }

  getCategoryIcon(category: string): string {
    switch (category?.toLowerCase()) {
      case 'customer support': return 'support_agent';
      case 'sales': return 'trending_up';
      case 'marketing': return 'campaign';
      case 'hr': return 'groups';
      case 'operations': return 'settings';
      default: return 'category';
    }
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  navigateBack(): void {
    this.router.navigate(['/workflows']);
  }
}
