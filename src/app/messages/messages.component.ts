import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  MessagesService,
  ChatSession,
  ChatMessage,
  ChatStats,
  SearchMessagesRequest
} from '../services/messages.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-messages',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './messages.component.html',
  styleUrl: './messages.component.scss'
})
export class MessagesComponent implements OnInit {
  // Data
  sessions: ChatSession[] = [];
  selectedSession: ChatSession | null = null;
  sessionMessages: ChatMessage[] = [];
  searchResults: ChatMessage[] = [];
  chatStats: ChatStats | null = null;

  // UI State
  isLoading = false;
  isLoadingMessages = false;
  isLoadingSearch = false;
  errorMessage = '';
  successMessage = '';
  currentView: 'sessions' | 'session-detail' | 'search' | 'stats' = 'sessions';

  // Pagination
  sessionLimit = 50;
  sessionOffset = 0;
  messageLimit = 100;
  messageOffset = 0;

  // Search
  searchQuery = '';
  searchMessageType = '';
  searchSessionId = '';

  // Filters
  showActiveOnly = false;

  constructor(
    private messagesService: MessagesService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSessions();
    this.loadStats();
  }

  // Load chat sessions
  loadSessions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.messagesService.getChatSessions(
      this.sessionLimit,
      this.sessionOffset,
      this.showActiveOnly
    ).subscribe({
      next: (sessions) => {
        this.sessions = sessions;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.authService.logout();
        } else {
          this.errorMessage = 'Failed to load chat sessions. Please try again.';
        }
        console.error('Load sessions error:', error);
      }
    });
  }

  // Load messages for a specific session
  viewSessionMessages(session: ChatSession): void {
    this.selectedSession = session;
    this.currentView = 'session-detail';
    this.isLoadingMessages = true;
    this.errorMessage = '';

    this.messagesService.getSessionMessages(session.session_id, this.messageLimit, this.messageOffset).subscribe({
      next: (messages) => {
        this.sessionMessages = messages;
        this.isLoadingMessages = false;
      },
      error: (error) => {
        this.isLoadingMessages = false;
        this.errorMessage = 'Failed to load session messages. Please try again.';
        console.error('Load messages error:', error);
      }
    });
  }

  // Search messages
  searchMessages(): void {
    if (!this.searchQuery.trim()) {
      this.errorMessage = 'Please enter a search query';
      return;
    }

    this.isLoadingSearch = true;
    this.errorMessage = '';
    this.currentView = 'search';

    const searchRequest: SearchMessagesRequest = {
      query: this.searchQuery,
      limit: 50,
      offset: 0
    };

    if (this.searchMessageType) {
      searchRequest.message_type = this.searchMessageType;
    }
    if (this.searchSessionId) {
      searchRequest.session_id = this.searchSessionId;
    }

    this.messagesService.searchMessages(searchRequest).subscribe({
      next: (messages) => {
        this.searchResults = messages;
        this.isLoadingSearch = false;
      },
      error: (error) => {
        this.isLoadingSearch = false;
        this.errorMessage = 'Failed to search messages. Please try again.';
        console.error('Search messages error:', error);
      }
    });
  }

  // Load chat statistics
  loadStats(): void {
    this.messagesService.getChatStats().subscribe({
      next: (stats) => {
        this.chatStats = stats;
      },
      error: (error) => {
        console.error('Load stats error:', error);
      }
    });
  }

  // Navigation methods
  showSessions(): void {
    this.currentView = 'sessions';
    this.selectedSession = null;
  }

  showStats(): void {
    this.currentView = 'stats';
    if (!this.chatStats) {
      this.loadStats();
    }
  }

  showSearch(): void {
    this.currentView = 'search';
  }

  // Filter toggle
  toggleActiveFilter(): void {
    this.showActiveOnly = !this.showActiveOnly;
    this.loadSessions();
  }

  // Pagination
  loadMoreSessions(): void {
    this.sessionOffset += this.sessionLimit;
    this.loadSessions();
  }

  loadMoreMessages(): void {
    if (this.selectedSession) {
      this.messageOffset += this.messageLimit;
      this.messagesService.getSessionMessages(
        this.selectedSession.session_id,
        this.messageLimit,
        this.messageOffset
      ).subscribe({
        next: (messages) => {
          this.sessionMessages = [...this.sessionMessages, ...messages];
        },
        error: (error) => {
          this.errorMessage = 'Failed to load more messages.';
          console.error('Load more messages error:', error);
        }
      });
    }
  }

  // Utility methods
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMessageTypeClass(messageType: string): string {
    return messageType === 'user' ? 'message-user' : 'message-assistant';
  }

  getSessionStatusClass(isActive: boolean): string {
    return isActive ? 'status-active' : 'status-inactive';
  }

  hasMetadata(metadata: any): boolean {
    return metadata && typeof metadata === 'object' && Object.keys(metadata).length > 0;
  }

  get isProduction(): boolean {
    return environment.production;
  }
}
