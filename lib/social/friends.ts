/**
 * Friends System
 * Handles friend requests, online status, and social interactions
 */

export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  statusMessage?: string;
  addedAt: number;
  lastSeen?: number;
  currentGame?: {
    id: string;
    title: string;
  };
}

export interface FriendRequest {
  id: string;
  from: {
    id: string;
    username: string;
    avatar?: string;
  };
  to: {
    id: string;
    username: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
}

export interface UserSearchResult {
  id: string;
  username: string;
  avatar?: string;
  status: Friend['status'];
  isFriend: boolean;
  hasPendingRequest: boolean;
}

type FriendsCallback = (friends: Friend[]) => void;
type RequestCallback = (requests: FriendRequest[]) => void;
type StatusCallback = (friendId: string, status: Friend['status']) => void;

class FriendsManager {
  private friends: Map<string, Friend> = new Map();
  private requests: Map<string, FriendRequest> = new Map();
  private friendsCallbacks: Set<FriendsCallback> = new Set();
  private requestCallbacks: Set<RequestCallback> = new Set();
  private statusCallbacks: Set<StatusCallback> = new Set();
  private ws: WebSocket | null = null;
  private currentUserId: string | null = null;

  /**
   * Initialize the friends system
   */
  async initialize(userId: string): Promise<void> {
    this.currentUserId = userId;
    await this.loadFriends();
    await this.loadRequests();
    this.connectToPresenceServer();
  }

  /**
   * Load friends from server
   */
  private async loadFriends(): Promise<void> {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        data.friends.forEach((friend: Friend) => {
          this.friends.set(friend.id, friend);
        });
        this.notifyFriendsUpdate();
      }
    } catch (error) {
      console.error('[FriendsManager] Failed to load friends:', error);
    }
  }

  /**
   * Load friend requests from server
   */
  private async loadRequests(): Promise<void> {
    try {
      const response = await fetch('/api/friends/requests');
      if (response.ok) {
        const data = await response.json();
        data.requests.forEach((request: FriendRequest) => {
          this.requests.set(request.id, request);
        });
        this.notifyRequestsUpdate();
      }
    } catch (error) {
      console.error('[FriendsManager] Failed to load requests:', error);
    }
  }

  /**
   * Connect to presence server for real-time status
   */
  private connectToPresenceServer(): void {
    if (!this.currentUserId) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'wss://localhost:8080'}/presence?userId=${this.currentUserId}`;
    
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handlePresenceMessage(data);
      } catch (error) {
        console.error('[FriendsManager] Failed to parse message:', error);
      }
    };

    this.ws.onclose = () => {
      // Reconnect after delay
      setTimeout(() => this.connectToPresenceServer(), 5000);
    };
  }

  /**
   * Handle presence messages
   */
  private handlePresenceMessage(data: any): void {
    switch (data.type) {
      case 'status_update':
        const friend = this.friends.get(data.userId);
        if (friend) {
          friend.status = data.status;
          friend.statusMessage = data.statusMessage;
          friend.currentGame = data.currentGame;
          friend.lastSeen = Date.now();
          this.notifyStatusUpdate(data.userId, data.status);
        }
        break;

      case 'friend_online':
        const onlineFriend = this.friends.get(data.userId);
        if (onlineFriend) {
          onlineFriend.status = 'online';
          onlineFriend.lastSeen = Date.now();
          this.notifyStatusUpdate(data.userId, 'online');
        }
        break;

      case 'friend_offline':
        const offlineFriend = this.friends.get(data.userId);
        if (offlineFriend) {
          offlineFriend.status = 'offline';
          offlineFriend.lastSeen = Date.now();
          this.notifyStatusUpdate(data.userId, 'offline');
        }
        break;

      case 'friend_request':
        const request: FriendRequest = data.request;
        this.requests.set(request.id, request);
        this.notifyRequestsUpdate();
        break;

      case 'request_accepted':
        const newFriend: Friend = data.friend;
        this.friends.set(newFriend.id, newFriend);
        this.requests.delete(data.requestId);
        this.notifyFriendsUpdate();
        this.notifyRequestsUpdate();
        break;
    }
  }

  /**
   * Send a friend request
   */
  async sendFriendRequest(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to send friend request');
      }
    } catch (error) {
      console.error('[FriendsManager] Failed to send request:', error);
      throw error;
    }
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requestId: string): Promise<void> {
    try {
      const response = await fetch(`/api/friends/request/${requestId}/accept`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to accept friend request');
      }

      const request = this.requests.get(requestId);
      if (request) {
        this.requests.delete(requestId);
        this.notifyRequestsUpdate();
      }
    } catch (error) {
      console.error('[FriendsManager] Failed to accept request:', error);
      throw error;
    }
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requestId: string): Promise<void> {
    try {
      const response = await fetch(`/api/friends/request/${requestId}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to reject friend request');
      }

      this.requests.delete(requestId);
      this.notifyRequestsUpdate();
    } catch (error) {
      console.error('[FriendsManager] Failed to reject request:', error);
      throw error;
    }
  }

  /**
   * Remove a friend
   */
  async removeFriend(friendId: string): Promise<void> {
    try {
      const response = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove friend');
      }

      this.friends.delete(friendId);
      this.notifyFriendsUpdate();
    } catch (error) {
      console.error('[FriendsManager] Failed to remove friend:', error);
      throw error;
    }
  }

  /**
   * Search for users
   */
  async searchUsers(query: string): Promise<UserSearchResult[]> {
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      const data = await response.json();
      return data.users;
    } catch (error) {
      console.error('[FriendsManager] Search failed:', error);
      return [];
    }
  }

  /**
   * Get all friends
   */
  getFriends(): Friend[] {
    return Array.from(this.friends.values());
  }

  /**
   * Get online friends
   */
  getOnlineFriends(): Friend[] {
    return this.getFriends().filter(f => f.status === 'online');
  }

  /**
   * Get pending friend requests
   */
  getPendingRequests(): FriendRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'pending');
  }

  /**
   * Get sent friend requests
   */
  async getSentRequests(): Promise<FriendRequest[]> {
    try {
      const response = await fetch('/api/friends/requests/sent');
      if (response.ok) {
        const data = await response.json();
        return data.requests;
      }
    } catch (error) {
      console.error('[FriendsManager] Failed to get sent requests:', error);
    }
    return [];
  }

  /**
   * Update own status
   */
  async updateStatus(status: Friend['status'], message?: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'update_status',
        status,
        statusMessage: message,
      }));
    }

    try {
      await fetch('/api/user/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, message }),
      });
    } catch (error) {
      console.error('[FriendsManager] Failed to update status:', error);
    }
  }

  /**
   * Set current game
   */
  setCurrentGame(game: { id: string; title: string } | null): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'set_game',
        game,
      }));
    }
  }

  /**
   * Subscribe to friends updates
   */
  onFriendsUpdate(callback: FriendsCallback): () => void {
    this.friendsCallbacks.add(callback);
    return () => this.friendsCallbacks.delete(callback);
  }

  /**
   * Subscribe to requests updates
   */
  onRequestsUpdate(callback: RequestCallback): () => void {
    this.requestCallbacks.add(callback);
    return () => this.requestCallbacks.delete(callback);
  }

  /**
   * Subscribe to status updates
   */
  onStatusUpdate(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  /**
   * Notify friends update
   */
  private notifyFriendsUpdate(): void {
    const friends = this.getFriends();
    this.friendsCallbacks.forEach(cb => cb(friends));
  }

  /**
   * Notify requests update
   */
  private notifyRequestsUpdate(): void {
    const requests = this.getPendingRequests();
    this.requestCallbacks.forEach(cb => cb(requests));
  }

  /**
   * Notify status update
   */
  private notifyStatusUpdate(friendId: string, status: Friend['status']): void {
    this.statusCallbacks.forEach(cb => cb(friendId, status));
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
export const friendsManager = new FriendsManager();

// Hook for React components
export function useFriends() {
  return friendsManager;
}