import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorizationService, DocumentCategory } from '../../services/categorization.service';

@Component({
  selector: 'app-category-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './category-selector.component.html',
  styleUrl: './category-selector.component.scss'
})
export class CategorySelectorComponent implements OnInit {
  @Input() selectedCategories: string[] = [];
  @Input() multiple: boolean = true;
  @Input() placeholder: string = 'Select categories...';
  @Input() showCreateOption: boolean = false;
  @Output() categoriesChange = new EventEmitter<string[]>();
  @Output() categoryCreate = new EventEmitter<{name: string, description?: string}>();

  categories: DocumentCategory[] = [];
  filteredCategories: DocumentCategory[] = [];
  isDropdownOpen: boolean = false;
  searchTerm: string = '';
  isLoading: boolean = false;
  showCreateForm: boolean = false;
  newCategoryName: string = '';
  newCategoryDescription: string = '';

  constructor(private categorizationService: CategorizationService) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading = true;
    this.categorizationService.getCategories(true).subscribe({
      next: (response) => {
        this.categories = response.categories;
        this.filteredCategories = [...this.categories];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load categories:', error);
        this.isLoading = false;
      }
    });
  }

  toggleDropdown(): void {
    this.isDropdownOpen = !this.isDropdownOpen;
    if (this.isDropdownOpen) {
      this.searchTerm = '';
      this.filteredCategories = [...this.categories];
    }
  }

  onSearchChange(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredCategories = this.categories.filter(category =>
      category.name.toLowerCase().includes(term) ||
      (category.description && category.description.toLowerCase().includes(term))
    );
  }

  selectCategory(categoryId: string): void {
    if (!this.multiple) {
      this.selectedCategories = [categoryId];
      this.isDropdownOpen = false;
    } else {
      const index = this.selectedCategories.indexOf(categoryId);
      if (index > -1) {
        this.selectedCategories.splice(index, 1);
      } else {
        this.selectedCategories.push(categoryId);
      }
    }
    this.categoriesChange.emit([...this.selectedCategories]);
  }

  isCategorySelected(categoryId: string): boolean {
    return this.selectedCategories.includes(categoryId);
  }

  getSelectedCategoryNames(): string {
    const selectedNames = this.categories
      .filter(cat => this.selectedCategories.includes(cat.id))
      .map(cat => cat.name);

    if (selectedNames.length === 0) {
      return this.placeholder;
    } else if (selectedNames.length === 1) {
      return selectedNames[0];
    } else {
      return `${selectedNames.length} categories selected`;
    }
  }

  removeCategory(categoryId: string): void {
    const index = this.selectedCategories.indexOf(categoryId);
    if (index > -1) {
      this.selectedCategories.splice(index, 1);
      this.categoriesChange.emit([...this.selectedCategories]);
    }
  }

  getCategoryById(categoryId: string): DocumentCategory | undefined {
    return this.categories.find(cat => cat.id === categoryId);
  }

  showCreateCategoryForm(): void {
    this.showCreateForm = true;
    this.newCategoryName = this.searchTerm;
  }

  createCategory(): void {
    if (!this.newCategoryName.trim()) return;

    this.categoryCreate.emit({
      name: this.newCategoryName.trim(),
      description: this.newCategoryDescription.trim() || undefined
    });

    this.newCategoryName = '';
    this.newCategoryDescription = '';
    this.showCreateForm = false;
  }

  cancelCreate(): void {
    this.showCreateForm = false;
    this.newCategoryName = '';
    this.newCategoryDescription = '';
  }

  // Close dropdown when clicking outside
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.category-dropdown');
    if (dropdown && !dropdown.contains(target)) {
      this.isDropdownOpen = false;
      this.showCreateForm = false;
    }
  }
}