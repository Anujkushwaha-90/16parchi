import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { Friend, FriendRequestItem } from '../types/index.js';
import {
  Users,
  UserPlus,
  Search,
  Check,
  X,
  UserMinus,
  Mail,
  Send,
  Clock,
  Sparkles,
} from 'lucide-react';

interface FriendsScreenProps {
  onNavigateToRoom?: (code: string) => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'friends' | 'incoming' | 'outgoing'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [friendsRes, requestsRes] = await Promise.all([
        api.getFriends(),
        api.getFriendRequests(),
      ]);
      setFriends(friendsRes.friends || []);
      setIncoming(requestsRes.incoming || []);
      setOutgoing(requestsRes.outgoing || []);
    } catch (e) {
      showToast('Failed to load friends data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await api.searchUsers(searchQuery.trim());
      setSearchResults(res.users || []);
    } catch (e: any) {
      showToast(e.message || 'Search failed', 'error');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (targetUserId: string) => {
    sound.playClick();
    try {
      await api.sendFriendRequest(targetUserId);
      showToast('Friend request sent!', 'success');
      setSearchResults((prev) => prev.filter((u) => u.id !== targetUserId));
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to send request', 'error');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    sound.playClick();
    try {
      await api.acceptFriendRequest(requestId);
      showToast('Friend request accepted!', 'success');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to accept', 'error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    sound.playClick();
    try {
      await api.rejectFriendRequest(requestId);
      showToast('Friend request declined', 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to decline', 'error');
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    sound.playClick();
    try {
      await api.cancelFriendRequest(requestId);
      showToast('Request cancelled', 'info');
      loadData();
    } catch (e: any) {
      showToast(e.message || 'Failed to cancel', 'error');
    }
  };

  const handleRemoveFriend = async (friendId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from your friends?`)) return;
    sound.playClick();
    try {
      await api.removeFriend(friendId);
      showToast('Friend removed', 'info');
      loadData();
    } catch (e: any) {
      showToast('Failed to remove friend', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-ivory-100 flex items-center gap-3">
            <Users className="w-8 h-8 text-gold-400" />
            <span>Friends System</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Connect with players, challenge friends, and track online presence
          </p>
        </div>

        {/* User's own friend code */}
        {user && (
          <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-table-surface border border-gold-500/30">
            <span className="text-xs text-stone-400">Your Friend Code:</span>
            <span className="font-mono text-xs font-bold text-gold-300 px-2 py-0.5 rounded bg-black/40">
              {user.friendCode}
            </span>
          </div>
        )}
      </div>

      {/* Player Search Bar */}
      <div className="p-6 rounded-3xl bg-table-surface border border-table-border shadow-lg">
        <h3 className="font-serif font-bold text-sm text-ivory-100 mb-3 flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-400" />
          <span>Add New Friend by Username or Friend Code</span>
        </h3>
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by username or friend code (e.g. PARCHI-7892)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-table-card border border-table-border text-xs sm:text-sm text-ivory-100 focus:outline-none focus:border-gold-400"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="gold-gradient-btn px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5"
          >
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Results Display */}
        {searchResults.length > 0 && (
          <div className="mt-4 pt-4 border-t border-table-border space-y-2">
            <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              Search Results ({searchResults.length})
            </div>
            {searchResults.map((target) => (
              <div
                key={target.id}
                className="p-3 rounded-2xl bg-table-card border border-table-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={target.avatarUrl}
                    alt={target.displayName}
                    className="w-9 h-9 rounded-full border border-gold-400/40 object-cover bg-emerald-950"
                  />
                  <div>
                    <div className="text-sm font-bold text-ivory-100">{target.displayName}</div>
                    <div className="text-xs text-stone-400 font-mono">
                      @{target.username} • {target.friendCode}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleSendRequest(target.id)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Send Request</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 border-b border-table-border pb-2">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('friends');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'friends'
              ? 'bg-gold-500 text-table-dark shadow-gold-glow'
              : 'text-stone-400 hover:text-ivory-100 hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>My Friends ({friends.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('incoming');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
            activeTab === 'incoming'
              ? 'bg-gold-500 text-table-dark shadow-gold-glow'
              : 'text-stone-400 hover:text-ivory-100 hover:bg-white/5'
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Incoming Requests</span>
          {incoming.length > 0 && (
            <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] rounded-full font-bold">
              {incoming.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('outgoing');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'outgoing'
              ? 'bg-gold-500 text-table-dark shadow-gold-glow'
              : 'text-stone-400 hover:text-ivory-100 hover:bg-white/5'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>Sent Requests ({outgoing.length})</span>
        </button>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="py-12 text-center text-sm text-stone-400">Loading friends...</div>
      ) : activeTab === 'friends' ? (
        friends.length === 0 ? (
          <div className="py-12 text-center bg-table-surface rounded-3xl border border-table-border p-8">
            <Users className="w-12 h-12 text-stone-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-ivory-100 mb-1">No Friends Added Yet</h4>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Search players using the bar above or share your friend code to start connecting!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-2xl bg-table-surface border border-table-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={f.avatarUrl}
                      alt={f.displayName}
                      className="w-11 h-11 rounded-full border border-gold-400/40 object-cover bg-emerald-950"
                    />
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-table-surface ${
                        f.isOnline ? 'bg-emerald-400' : 'bg-stone-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ivory-100 flex items-center gap-2">
                      <span>{f.displayName}</span>
                      {f.isOnline && (
                        <span className="text-[10px] text-emerald-400 font-mono font-normal">
                          Online
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-stone-400 font-mono">
                      @{f.username} • {f.friendCode}
                    </div>
                    <div className="text-[10px] text-stone-400 mt-0.5">
                      Wins: {f.gamesWon} / {f.gamesPlayed}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRemoveFriend(f.id, f.displayName)}
                    title="Remove Friend"
                    className="p-2 rounded-xl text-stone-400 hover:text-red-400 hover:bg-red-950/20 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'incoming' ? (
        incoming.length === 0 ? (
          <div className="py-12 text-center bg-table-surface rounded-3xl border border-table-border p-8">
            <Mail className="w-12 h-12 text-stone-500 mx-auto mb-3" />
            <h4 className="text-base font-bold text-ivory-100 mb-1">No Pending Requests</h4>
            <p className="text-xs text-stone-400">You don't have any incoming friend requests.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {incoming.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-table-surface border border-table-border flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.user.avatarUrl}
                    alt={req.user.displayName}
                    className="w-10 h-10 rounded-full border border-gold-400/40 object-cover bg-emerald-950"
                  />
                  <div>
                    <div className="text-sm font-bold text-ivory-100">{req.user.displayName}</div>
                    <div className="text-xs text-stone-400 font-mono">
                      @{req.user.username} • {req.user.friendCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAcceptRequest(req.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                  <button
                    onClick={() => handleRejectRequest(req.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-red-950/40 text-stone-300 hover:text-red-400 text-xs font-bold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Decline</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : outgoing.length === 0 ? (
        <div className="py-12 text-center bg-table-surface rounded-3xl border border-table-border p-8">
          <Send className="w-12 h-12 text-stone-500 mx-auto mb-3" />
          <h4 className="text-base font-bold text-ivory-100 mb-1">No Sent Requests</h4>
          <p className="text-xs text-stone-400">You haven't sent any pending requests.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {outgoing.map((req) => (
            <div
              key={req.id}
              className="p-4 rounded-2xl bg-table-surface border border-table-border flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <img
                  src={req.user.avatarUrl}
                  alt={req.user.displayName}
                  className="w-10 h-10 rounded-full border border-gold-400/40 object-cover bg-emerald-950"
                />
                <div>
                  <div className="text-sm font-bold text-ivory-100">{req.user.displayName}</div>
                  <div className="text-xs text-stone-400 font-mono">
                    @{req.user.username} • Pending approval
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCancelRequest(req.id)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-stone-300 text-xs font-bold flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
