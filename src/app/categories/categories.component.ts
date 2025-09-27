import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CategorizationService,
  DocumentCategory,
  CategoryCreateRequest
} from '../services/categorization.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-categories',
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.scss'
})
export class CategoriesComponent implements OnInit {
  categories: DocumentCategory[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // Create/Edit modal
  isCreateModalOpen = false;
  isEditMode = false;
  selectedCategory: DocumentCategory | null = null;
  categoryForm: CategoryCreateRequest = {
    name: '',
    description: '',
    parent_category_id: '',
    color: '#6B7280',
    icon: 'folder'
  };

  // Available options
  availableColors: string[] = [];
  availableIcons: Array<{name: string, icon: string}> = [];

  // Hierarchical display
  expandedCategories: Set<string> = new Set();

  // Statistics
  showStats = true;
  totalCategories = 0;
  systemCategories = 0;
  customCategories = 0;

  constructor(
    private categorizationService: CategorizationService,
    private authService: AuthService,
    private router: Router
  ) {
    this.availableColors = this.categorizationService.getCategoryColors();
    this.availableIcons = this.categorizationService.getCategoryIcons();
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.categorizationService.getCategories(this.showStats).subscribe({
      next: (response) => {
        this.categories = response.categories;
        this.totalCategories = response.total_count;
        this.systemCategories = this.categories.filter(c => c.is_system_category).length;
        this.customCategories = this.categories.filter(c => !c.is_system_category).length;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          // Store current URL before logout so user can return after re-authentication
          this.authService.setReturnUrl(this.router.url);
          this.authService.logout();
        } else {
          this.errorMessage = 'Failed to load categories. Please try again.';
        }
        console.error('Load categories error:', error);
      }
    });
  }

  // Hierarchical display helpers
  getRootCategories(): DocumentCategory[] {
    return this.categories.filter(c => !c.parent_category_id);
  }

  getSubcategories(parentId: string): DocumentCategory[] {
    return this.categories.filter(c => c.parent_category_id === parentId);
  }

  toggleExpanded(categoryId: string): void {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedCategories.has(categoryId);
  }

  hasSubcategories(categoryId: string): boolean {
    return this.getSubcategories(categoryId).length > 0;
  }

  // Category creation
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.isEditMode = false;
    this.resetForm();
  }

  openEditModal(category: DocumentCategory): void {
    if (category.is_system_category) {
      this.errorMessage = 'System categories cannot be edited.';
      return;
    }

    this.isCreateModalOpen = true;
    this.isEditMode = true;
    this.selectedCategory = category;

    this.categoryForm = {
      name: category.name,
      description: category.description || '',
      parent_category_id: category.parent_category_id || '',
      color: category.color || '#6B7280',
      icon: category.icon || 'folder'
    };
  }

  closeModal(): void {
    this.isCreateModalOpen = false;
    this.isEditMode = false;
    this.selectedCategory = null;
    this.resetForm();
  }

  resetForm(): void {
    this.categoryForm = {
      name: '',
      description: '',
      parent_category_id: '',
      color: '#6B7280',
      icon: 'folder'
    };
  }

  onSubmit(): void {
    if (!this.categoryForm.name.trim()) {
      this.errorMessage = 'Category name is required.';
      return;
    }

    // Clean up form data
    const submitData: CategoryCreateRequest = {
      name: this.categoryForm.name.trim(),
      description: this.categoryForm.description?.trim() || undefined,
      parent_category_id: this.categoryForm.parent_category_id || undefined,
      color: this.categoryForm.color,
      icon: this.categoryForm.icon
    };

    if (this.isEditMode && this.selectedCategory) {
      this.updateCategory(submitData);
    } else {
      this.createCategory(submitData);
    }
  }

  createCategory(category: CategoryCreateRequest): void {
    this.categorizationService.createCategory(category).subscribe({
      next: (response) => {
        this.successMessage = `Category "${response.name}" created successfully.`;
        this.loadCategories();
        this.closeModal();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to create category.';
        console.error('Create category error:', error);
      }
    });
  }

  updateCategory(category: CategoryCreateRequest): void {
    if (!this.selectedCategory) return;

    this.categorizationService.updateCategory(this.selectedCategory.id, category).subscribe({
      next: (response) => {
        this.successMessage = `Category "${response.name}" updated successfully.`;
        this.loadCategories();
        this.closeModal();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to update category.';
        console.error('Update category error:', error);
      }
    });
  }

  deleteCategory(category: DocumentCategory): void {
    if (category.is_system_category) {
      this.errorMessage = 'System categories cannot be deleted.';
      return;
    }

    if (this.hasSubcategories(category.id)) {
      this.errorMessage = 'Cannot delete category with subcategories. Please delete subcategories first.';
      return;
    }

    if (!confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    this.categorizationService.deleteCategory(category.id).subscribe({
      next: (response) => {
        this.successMessage = `Category "${category.name}" deleted successfully.`;
        this.loadCategories();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to delete category.';
        console.error('Delete category error:', error);
      }
    });
  }

  // Utility methods
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  initializeSystemCategories(): void {
    if (!confirm('This will create default system categories. Continue?')) {
      return;
    }

    this.categorizationService.initializeSystemCategories().subscribe({
      next: (response) => {
        this.successMessage = 'System categories initialized successfully.';
        this.loadCategories();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (error) => {
        this.errorMessage = error.error?.detail || 'Failed to initialize system categories.';
        console.error('Initialize categories error:', error);
      }
    });
  }

  toggleStats(): void {
    this.showStats = !this.showStats;
    this.loadCategories();
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getCategoryTypeClass(category: DocumentCategory): string {
    return category.is_system_category ? 'system-category' : 'custom-category';
  }

  getCategoryIcon(iconName: string): string {
    const iconMap: {[key: string]: string} = {
      'legal': 'gavel',
      'financial': 'account_balance',
      'users': 'people',
      'code': 'code',
      'megaphone': 'campaign',
      'document': 'description',
      'folder': 'folder',
      'archive': 'archive',
      'report': 'analytics',
      'contract': 'assignment'
    };
    return iconMap[iconName] || 'folder';
  }
}