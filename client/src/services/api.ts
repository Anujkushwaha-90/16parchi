const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('parchi_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('parchi_token', token);
    } else {
      localStorage.removeItem('parchi_token');
    }
  }

  public getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('parchi_token');
    }
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  }

  // Auth Endpoints
  public googleAuth(idToken: string, username?: string) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken, username }),
    });
  }

  public devLogin(username: string, displayName?: string, avatarSeed?: string) {
    return this.request('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ username, displayName, avatarSeed }),
    });
  }

  public getMe() {
    return this.request('/auth/me');
  }

  public deleteAccount() {
    return this.request('/auth/account', { method: 'DELETE' });
  }

  // Users
  public searchUsers(query: string) {
    return this.request(`/users/search?q=${encodeURIComponent(query)}`);
  }

  public updateProfile(displayName?: string, avatarUrl?: string) {
    return this.request('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify({ displayName, avatarUrl }),
    });
  }

  public getUserStats(userId: string) {
    return this.request(`/users/${userId}/stats`);
  }

  // Friends
  public getFriends() {
    return this.request('/friends');
  }

  public getFriendRequests() {
    return this.request('/friends/requests');
  }

  public sendFriendRequest(targetUserId?: string, friendCode?: string) {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ targetUserId, friendCode }),
    });
  }

  public acceptFriendRequest(requestId: string) {
    return this.request(`/friends/request/${requestId}/accept`, { method: 'POST' });
  }

  public rejectFriendRequest(requestId: string) {
    return this.request(`/friends/request/${requestId}/reject`, { method: 'POST' });
  }

  public cancelFriendRequest(requestId: string) {
    return this.request(`/friends/request/${requestId}`, { method: 'DELETE' });
  }

  public removeFriend(friendId: string) {
    return this.request(`/friends/${friendId}`, { method: 'DELETE' });
  }

  // Rooms
  public createRoom(
    cardTheme: string = 'royals',
    turnTimeSeconds: number = 20,
    maxPlayers: number = 4,
    customDeck?: any
  ) {
    return this.request('/rooms', {
      method: 'POST',
      body: JSON.stringify({ cardTheme, turnTimeSeconds, maxPlayers, customDeck }),
    });
  }

  public updateRoomSettings(
    code: string,
    settings: { maxPlayers?: number; customDeck?: any; cardTheme?: string; turnTimeSeconds?: number }
  ) {
    return this.request(`/rooms/${code}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  public getRoom(code: string) {
    return this.request(`/rooms/${code}`);
  }

  public joinRoom(code: string) {
    return this.request(`/rooms/${code}/join`, { method: 'POST' });
  }

  public toggleReady(code: string) {
    return this.request(`/rooms/${code}/ready`, { method: 'POST' });
  }

  public manageBot(code: string, action: 'add' | 'remove', seatIndex?: number) {
    return this.request(`/rooms/${code}/bot`, {
      method: 'POST',
      body: JSON.stringify({ action, seatIndex }),
    });
  }

  public leaveRoom(code: string) {
    return this.request(`/rooms/${code}/leave`, { method: 'POST' });
  }

  public startMatch(code: string) {
    return this.request(`/rooms/${code}/start`, { method: 'POST' });
  }

  public inviteFriendToRoom(code: string, friendUserId: string) {
    return this.request(`/rooms/${code}/invite`, {
      method: 'POST',
      body: JSON.stringify({ friendUserId }),
    });
  }

  public getPendingRoomInvites() {
    return this.request('/rooms/invites/pending');
  }

  // Matches
  public getMatchHistory() {
    return this.request('/matches/history');
  }

  public getMatch(matchId: string) {
    return this.request(`/matches/${matchId}`);
  }
}

export const api = new ApiService();
