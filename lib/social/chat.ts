/**
 * Real-time Chat System
 * Handles direct messages, group chats, and party chat
 */

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: number;
  type: 'text' | 'image' | 'game_invite' | 'system';
  edited?: boolean;
  deleted?: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'party';
  name?: string;
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationParticipant {
  id: string;
  username: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: number;
  lastReadAt: number;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  username: string;
  timestamp: number;
}

type MessageCallback = (message: ChatMessage) => void;
type ConversationCallback = (conversations: Conversation[]) => void;
type TypingCallback = (typing: TypingIndicator) => void;

class ChatManager {
  private conversations: Map<string, Conversation> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();
  private ws: WebSocket | null = null;
  private currentUserId: string | null = null;
  private messageCallbacks: Set<MessageCallback> = new Set();
  private conversationCallbacks: Set<ConversationCallback> = new Set();
  private typingCallbacks: Set<TypingCallback> = new Set();
  private typingTimeouts: Map<string, number> = new Map();

  /**
   * Initialize the chat system
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    await this.loadConversations();
    this.connectToChatServer();
  }

  /**
   * Load conversations from server
   */
  private async loadConversations(): Promise<void> {
    try {
      const response = await fetch('/api/chat/conversations');
      if (response.ok) {
        const data = await response.json();
        data.conversations.forEach((conv: Conversation) => {
          this.conversations.set(conv.id, conv);
        });
        this.notifyConversationsUpdate();
      }
    } catch (error) {
      console.error('[ChatManager] Failed to load conversations:', error);
    }
  }

  /**
   * Load messages for a conversation
   */
  async loadMessages(conversationId: string, before?: number): Promise<ChatMessage[]> {
    try {
      const url = `/api/chat/conversations/${conversationId}/messages${before ? `?before=${before}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const msgs = data.messages as ChatMessage[];
        
        if (!this.messages.has(conversationId)) {
          this.messages.set(conversationId, []);
        }
        
        // Prepend older messages
        const existing = this.messages.get(conversationId) || [];
        this.messages.set(conversationId, [...msgs.reverse(), ...existing]);
        
        return msgs;
      }
    } catch (error) {
      console.error('[ChatManager] Failed to load messages:', error);
    }
    return [];
  }

  /**
   * Connect to chat server
   */
  private connectToChatServer(): void {
    if (!this.currentUserId) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'wss://localhost:8080'}/chat?userId=${this.currentUserId}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[ChatManager] Connected to chat server');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleChatMessage(data);
      } catch (error) {
        console.error('[ChatManager] Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('[ChatManager] Disconnected from chat server');
      setTimeout(() => this.connectToChatServer(), 5000);
    };
  }

  /**
   * Handle incoming chat messages
   */
  private handleChatMessage(data: any): void {
    switch (data.type) {
      case 'message':
        const message = data.message as ChatMessage;
        this.addMessage(message);
        this.notifyMessageUpdate(message);
        break;

      case 'message_edited':
        this.updateMessage(data.message);
        break;

      case 'message_deleted':
        this.deleteMessage(data.messageId);
        break;

      case 'typing':
        this.notifyTyping(data.typing);
        break;

      case 'conversation_created':
        this.conversations.set(data.conversation.id, data.conversation);
        this.notifyConversationsUpdate();
        break;

      case 'user_joined':
      case 'user_left':
        this.updateConversation(data.conversation);
        break;

      case 'read_receipt':
        this.updateReadReceipt(data);
        break;
    }
  }

  /**
   * Add a message to local storage
   */
  private addMessage(message: ChatMessage): void {
    if (!this.messages.has(message.conversationId)) {
      this.messages.set(message.conversationId, []);
    }
    this.messages.get(message.conversationId)!.push(message);

    // Update conversation last message
    const conv = this.conversations.get(message.conversationId);
    if (conv) {
      conv.lastMessage = message;
      conv.updatedAt = message.timestamp;
      if (message.senderId !== this.currentUserId) {
        conv.unreadCount++;
      }
      this.notifyConversationsUpdate();
    }
  }

  /**
   * Update a message
   */
  private updateMessage(message: ChatMessage): void {
    const msgs = this.messages.get(message.conversationId);
    if (msgs) {
      const index = msgs.findIndex(m => m.id === message.id);
      if (index >= 0) {
        msgs[index] = { ...message, edited: true };
      }
    }
  }

  /**
   * Delete a message
   */
  private deleteMessage(messageId: string): void {
    for (const [convId, msgs] of this.messages) {
      const index = msgs.findIndex(m => m.id === messageId);
      if (index >= 0) {
        msgs[index] = { ...msgs[index], deleted: true, content: '' };
        break;
      }
    }
  }

  /**
   * Update conversation
   */
  private updateConversation(conversation: Conversation): void {
    this.conversations.set(conversation.id, conversation);
    this.notifyConversationsUpdate();
  }

  /**
   * Update read receipt
   */
  private updateReadReceipt(data: { conversationId: string; userId: string; timestamp: number }): void {
    const conv = this.conversations.get(data.conversationId);
    if (conv) {
      const participant = conv.participants.find(p => p.id === data.userId);
      if (participant) {
        participant.lastReadAt = data.timestamp;
      }
    }
  }

  /**
   * Send a message
   */
  async sendMessage(conversationId: string, content: string, type: ChatMessage['type'] = 'text'): Promise<ChatMessage | null> {
    if (!this.currentUserId) return null;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      conversationId,
      senderId: this.currentUserId,
      senderName: '', // Will be filled by server
      content,
      timestamp: Date.now(),
      type,
    };

    // Send via WebSocket
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'send_message',
        message,
      }));
    }

    // Also send via HTTP for reliability
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.message;
      }
    } catch (error) {
      console.error('[ChatManager] Failed to send message:', error);
    }

    return message;
  }

  /**
   * Send a game invite
   */
  async sendGameInvite(conversationId: string, gameId: string, gameTitle: string, sessionId: string): Promise<void> {
    const content = JSON.stringify({ gameId, gameTitle, sessionId });
    await this.sendMessage(conversationId, content, 'game_invite');
  }

  /**
   * Edit a message
   */
  async editMessage(messageId: string, conversationId: string, newContent: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'edit_message',
        messageId,
        conversationId,
        content: newContent,
      }));
    }

    try {
      await fetch(`/api/chat/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      });
    } catch (error) {
      console.error('[ChatManager] Failed to edit message:', error);
    }
  }

  /**
   * Remove a message
   */
  async removeMessage(messageId: string, conversationId: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'delete_message',
        messageId,
        conversationId,
      }));
    }

    try {
      await fetch(`/api/chat/messages/${messageId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('[ChatManager] Failed to delete message:', error);
    }
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'typing',
        conversationId,
      }));
    }

    // Clear existing timeout
    const existing = this.typingTimeouts.get(conversationId);
    if (existing) {
      clearTimeout(existing);
    }

    // Set new timeout to stop typing after 3 seconds
    this.typingTimeouts.set(conversationId, window.setTimeout(() => {
      this.typingTimeouts.delete(conversationId);
    }, 3000));
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.unreadCount = 0;
      this.notifyConversationsUpdate();
    }

    try {
      await fetch(`/api/chat/conversations/${conversationId}/read`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('[ChatManager] Failed to mark as read:', error);
    }
  }

  /**
   * Create a direct message conversation
   */
  async createDirectMessage(userId: string): Promise<Conversation | null> {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'direct',
          participantIds: [userId],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.conversations.set(data.conversation.id, data.conversation);
        this.notifyConversationsUpdate();
        return data.conversation;
      }
    } catch (error) {
      console.error('[ChatManager] Failed to create DM:', error);
    }
    return null;
  }

  /**
   * Create a group chat
   */
  async createGroupChat(name: string, participantIds: string[]): Promise<Conversation | null> {
    try {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          name,
          participantIds,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        this.conversations.set(data.conversation.id, data.conversation);
        this.notifyConversationsUpdate();
        return data.conversation;
      }
    } catch (error) {
      console.error('[ChatManager] Failed to create group:', error);
    }
    return null;
  }

  /**
   * Get conversations
   */
  getConversations(): Conversation[] {
    return Array.from(this.conversations.values())
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  /**
   * Get messages for a conversation
   */
  getMessages(conversationId: string): ChatMessage[] {
    return this.messages.get(conversationId) || [];
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Subscribe to new messages
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * Subscribe to conversation updates
   */
  onConversationUpdate(callback: ConversationCallback): () => void {
    this.conversationCallbacks.add(callback);
    return () => this.conversationCallbacks.delete(callback);
  }

  /**
   * Subscribe to typing indicators
   */
  onTyping(callback: TypingCallback): () => void {
    this.typingCallbacks.add(callback);
    return () => this.typingCallbacks.delete(callback);
  }

  /**
   * Notify message update
   */
  private notifyMessageUpdate(message: ChatMessage): void {
    this.messageCallbacks.forEach(cb => cb(message));
  }

  /**
   * Notify conversations update
   */
  private notifyConversationsUpdate(): void {
    const conversations = this.getConversations();
    this.conversationCallbacks.forEach(cb => cb(conversations));
  }

  /**
   * Notify typing
   */
  private notifyTyping(typing: TypingIndicator): void {
    this.typingCallbacks.forEach(cb => cb(typing));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
  }
}

// Singleton instance
export const chatManager = new ChatManager();

// Hook for React components
export function useChat() {
  return chatManager;
}