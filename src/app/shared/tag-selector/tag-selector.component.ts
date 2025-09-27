import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CategorizationService, DocumentTag } from '../../services/categorization.service';

@Component({
  selector: 'app-tag-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tag-selector.component.html',
  styleUrl: './tag-selector.component.scss'
})
export class TagSelectorComponent implements OnInit {
  @Input() selectedTags: string[] = [];
  @Input() placeholder: string = 'Add tags...';
  @Input() showCreateOption: boolean = true;
  @Output() tagsChange = new EventEmitter<string[]>();
  @Output() tagCreate = new EventEmitter<string>();

  tags: DocumentTag[] = [];
  filteredTags: DocumentTag[] = [];
  inputValue: string = '';
  isDropdownOpen: boolean = false;
  isLoading: boolean = false;

  constructor(private categorizationService: CategorizationService) {}

  ngOnInit(): void {
    this.loadTags();
  }

  private loadTags(): void {
    this.isLoading = true;
    this.categorizationService.getTags(undefined, 100).subscribe({
      next: (response) => {
        this.tags = response.tags;
        this.filteredTags = [...this.tags];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Failed to load tags:', error);
        this.isLoading = false;
      }
    });
  }

  onInputChange(): void {
    if (!this.inputValue.trim()) {
      this.isDropdownOpen = false;
      this.filteredTags = [...this.tags];
      return;
    }

    this.isDropdownOpen = true;
    const term = this.inputValue.toLowerCase();
    this.filteredTags = this.tags.filter(tag =>
      tag.name.toLowerCase().includes(term) &&
      !this.selectedTags.includes(tag.id)
    );
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    } else if (event.key === 'Backspace' && !this.inputValue && this.selectedTags.length > 0) {
      // Remove last tag if input is empty
      this.removeTag(this.selectedTags[this.selectedTags.length - 1]);
    } else if (event.key === 'Escape') {
      this.isDropdownOpen = false;
    }
  }

  addTag(): void {
    const tagName = this.inputValue.trim();
    if (!tagName) return;

    // Check if tag already exists
    const existingTag = this.tags.find(tag =>
      tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag && !this.selectedTags.includes(existingTag.id)) {
      this.selectedTags.push(existingTag.id);
      this.tagsChange.emit([...this.selectedTags]);
      this.inputValue = '';
      this.isDropdownOpen = false;
    } else if (!existingTag && this.showCreateOption) {
      // Create new tag
      this.createTag(tagName);
    }
  }

  selectTag(tagId: string): void {
    if (!this.selectedTags.includes(tagId)) {
      this.selectedTags.push(tagId);
      this.tagsChange.emit([...this.selectedTags]);
    }
    this.inputValue = '';
    this.isDropdownOpen = false;
  }

  removeTag(tagId: string): void {
    const index = this.selectedTags.indexOf(tagId);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
      this.tagsChange.emit([...this.selectedTags]);
    }
  }

  createTag(tagName: string): void {
    this.tagCreate.emit(tagName);
    this.inputValue = '';
    this.isDropdownOpen = false;
  }

  getTagById(tagId: string): DocumentTag | undefined {
    return this.tags.find(tag => tag.id === tagId);
  }

  getTagTypeIcon(tagType: string): string {
    switch (tagType) {
      case 'auto': return 'smart_toy';
      case 'system': return 'verified';
      case 'custom': return 'person';
      default: return 'local_offer';
    }
  }

  getTagTypeColor(tagType: string): string {
    switch (tagType) {
      case 'auto': return '#10b981';
      case 'system': return '#3b82f6';
      case 'custom': return '#8b5cf6';
      default: return '#6b7280';
    }
  }

  onInputFocus(): void {
    if (this.inputValue.trim()) {
      this.isDropdownOpen = true;
    }
  }

  onInputBlur(): void {
    // Delay hiding dropdown to allow for click events
    setTimeout(() => {
      this.isDropdownOpen = false;
    }, 150);
  }

  // Close dropdown when clicking outside
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const container = document.querySelector('.tag-selector');
    if (container && !container.contains(target)) {
      this.isDropdownOpen = false;
    }
  }

  hasExactMatch(tagName: string): boolean {
    return this.tags.some(tag =>
      tag.name.toLowerCase() === tagName.toLowerCase()
    );
  }
}