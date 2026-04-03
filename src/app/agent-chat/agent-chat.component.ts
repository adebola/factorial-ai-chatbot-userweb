import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AgentChatService, AgentSession, AgentMessage, ContentBlock
} from '../services/agent-chat.service';

@Component({
  selector: 'app-agent-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './agent-chat.component.html',
  styleUrl: './agent-chat.component.scss'
})
export class AgentChatComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  serviceKey = '';
  sessions: AgentSession[] = [];
  activeSession: AgentSession | null = null;
  messages: AgentMessage[] = [];
  inputText = '';
  isTyping = false;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  suggestedActions: string[] = [];
  showSidebar = true;

  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private chatService: AgentChatService
  ) {}

  ngOnInit(): void {
    this.serviceKey = this.route.snapshot.params['serviceKey'];
    const sessionId = this.route.snapshot.params['sessionId'];

    // Load previous sessions
    this.chatService.getSessions(this.serviceKey).subscribe({
      next: (sessions) => this.sessions = sessions,
      error: () => this.sessions = []
    });

    // Connect WebSocket
    this.chatService.connect(this.serviceKey, sessionId);

    // Subscribe to streams
    this.subscriptions.push(
      this.chatService.messages$.subscribe(msgs => this.messages = msgs),
      this.chatService.sessionInfo$.subscribe(s => {
        this.activeSession = s;
        if (s) {
          this.refreshSessions();
          // Update URL to include session ID so refresh/back resumes the same session
          this.router.navigate(
            ['/agents', this.serviceKey, 'chat', s.id],
            { replaceUrl: true }
          );
        }
      }),
      this.chatService.connectionStatus$.subscribe(s => this.connectionStatus = s),
      this.chatService.typing$.subscribe(t => this.isTyping = t),
      this.chatService.suggestedActions$.subscribe(a => this.suggestedActions = a),
      this.chatService.overflowEvent$.subscribe(event => {
        this.refreshSessions();
      })
    );
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || this.connectionStatus !== 'connected') return;
    this.chatService.sendMessage(text);
    this.inputText = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  switchSession(sessionId: string): void {
    this.chatService.switchSession(sessionId);
  }

  startNewSession(): void {
    this.chatService.requestNewSession();
  }

  exportSession(format: string): void {
    if (!this.activeSession) return;
    this.chatService.exportSession(this.activeSession.id, format).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${this.activeSession!.id.slice(0, 8)}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/services']);
  }

  toggleSidebar(): void {
    this.showSidebar = !this.showSidebar;
  }

  getSessionStatusIcon(status: string): string {
    switch (status) {
      case 'active': return 'chat_bubble';
      case 'completed': return 'check_circle';
      case 'context_overflow': return 'sync';
      default: return 'chat_bubble_outline';
    }
  }

  getAlertIcon(severity?: string): string {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'success': return 'check_circle';
      default: return 'info';
    }
  }

  get contextPercentage(): number {
    if (!this.activeSession?.context_limit_tokens) return 0;
    return Math.min(100, ((this.activeSession.total_tokens_used || 0) / this.activeSession.context_limit_tokens) * 100);
  }

  get contextBarClass(): string {
    if (this.contextPercentage > 85) return 'context-bar-danger';
    if (this.contextPercentage > 60) return 'context-bar-warning';
    return 'context-bar-normal';
  }

  renderMarkdown(text?: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
  }

  private refreshSessions(): void {
    this.chatService.getSessions(this.serviceKey).subscribe({
      next: (sessions) => this.sessions = sessions
    });
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.chatService.disconnect();
  }
}