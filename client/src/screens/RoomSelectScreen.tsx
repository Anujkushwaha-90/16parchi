import React, { useState } from 'react';
import { useToast } from '../context/ToastContext.js';
import { sound } from '../services/sound.js';
import { api } from '../services/api.js';
import { CardTheme } from '../types/index.js';
import { Swords, PlusCircle, LogIn, Clock, Sparkles, Bot, ShieldCheck } from 'lucide-react';

interface RoomSelectScreenProps {
  onRoomCreatedOrJoined: (roomCode: string) => void;
}

export const RoomSelectScreen: React.FC<RoomSelectScreenProps> = ({
  onRoomCreatedOrJoined,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('royals');
  const [turnTimer, setTurnTimer] = useState<number>(20);
  const [joinCode, setJoinCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const themes: Array<{
    id: CardTheme;
    title: string;
    description: string;
    identities: string[];
  }> = [
    {
      id: 'royals',
      title: '👑 Royal Court (Classic)',
      description: 'The authentic Indian 16 Parchi set',
      identities: ['Raja (King)', 'Rani (Queen)', 'Chor (Thief)', 'Sipahi (Guard)'],
    },
    {
      id: 'seasons',
      title: '🌸 Four Seasons',
      description: 'Basant, Grishma, Sharad, Hemant',
      identities: ['Spring', 'Summer', 'Autumn', 'Winter'],
    },
    {
      id: 'elements',
      title: '🔥 Primal Elements',
      description: 'Agni, Jal, Prithvi, Vayu',
      identities: ['Fire', 'Water', 'Earth', 'Air'],
    },
    {
      id: 'animals',
      title: '🦁 Jungle Beasts',
      description: 'Sher, Garuda, Baagh, Haathi',
      identities: ['Lion', 'Eagle', 'Tiger', 'Elephant'],
    },
  ];

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    sound.playClick();
    setLoading(true);
    try {
      const res = await api.createRoom(selectedTheme, turnTimer);
      if (res.room && res.room.code) {
        showToast(`Room ${res.room.code} created!`, 'success');
        onRoomCreatedOrJoined(res.room.code);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to create room', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCode.trim().toUpperCase();
    if (clean.length < 4) {
      showToast('Please enter a valid 6-character room code', 'error');
      return;
    }
    sound.playClick();
    setLoading(true);
    try {
      const res = await api.joinRoom(clean);
      if (res.room && res.room.code) {
        showToast(`Joined Room ${res.room.code}!`, 'success');
        onRoomCreatedOrJoined(res.room.code);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to join room', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div className="text-center max-w-xl mx-auto">
        <div className="inline-flex p-3 rounded-2xl bg-gold-500/10 text-gold-400 border border-gold-500/30 mb-3 shadow-gold-glow">
          <Swords className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-serif font-black text-ivory-100">Multiplayer Tables</h1>
        <p className="text-xs sm:text-sm text-stone-400 mt-1">
          Create a private room for your squad or enter an invite code to join an active table
        </p>
      </div>

      {/* Selector Tabs */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-table-surface border border-table-border">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('create');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'create'
                ? 'bg-gold-500 text-table-dark shadow-gold-glow font-black'
                : 'text-stone-400 hover:text-ivory-100'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Host Private Room</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('join');
            }}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'join'
                ? 'bg-gold-500 text-table-dark shadow-gold-glow font-black'
                : 'text-stone-400 hover:text-ivory-100'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Join Existing Room</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Create Room */}
      {activeTab === 'create' ? (
        <form
          onSubmit={handleCreateRoom}
          className="p-6 sm:p-8 rounded-3xl bg-table-surface border border-table-border shadow-xl space-y-6"
        >
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-3">
              1. Choose Card Deck Theme
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {themes.map((th) => (
                <div
                  key={th.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedTheme(th.id);
                  }}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedTheme === th.id
                      ? 'border-gold-500 bg-gold-500/10 shadow-gold-glow ring-2 ring-gold-400/30'
                      : 'border-table-border bg-table-card hover:border-stone-500'
                  }`}
                >
                  <div className="text-sm font-bold text-ivory-100 mb-1">{th.title}</div>
                  <div className="text-xs text-stone-400 mb-2">{th.description}</div>
                  <div className="flex flex-wrap gap-1">
                    {th.identities.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-black/40 text-stone-300 border border-white/5"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-3">
              2. Turn Time Limit
            </label>
            <div className="flex items-center gap-3">
              {[15, 20, 30].map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  onClick={() => {
                    sound.playClick();
                    setTurnTimer(seconds);
                  }}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    turnTimer === seconds
                      ? 'border-gold-500 bg-gold-500/10 text-gold-300 ring-2 ring-gold-400/30'
                      : 'border-table-border bg-table-card text-stone-400 hover:text-ivory-100'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{seconds} Seconds</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Bot feature reminder */}
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
            <Bot className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-stone-300">
              <span className="font-bold text-emerald-300">Smart AI Bots Supported:</span> 16 Parchi requires exactly 4 players. As host, you can invite your friends, or add instant AI bot players to fill any open seat with one click!
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gold-gradient-btn w-full py-3.5 rounded-2xl text-sm font-bold shadow-gold-glow flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{loading ? 'Creating Table...' : 'Generate Room Code & Enter Lobby'}</span>
          </button>
        </form>
      ) : (
        /* Tab 2: Join Room */
        <form
          onSubmit={handleJoinRoom}
          className="p-6 sm:p-8 rounded-3xl bg-table-surface border border-table-border shadow-xl space-y-6 max-w-md mx-auto"
        >
          <div>
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
              Enter 6-Character Room Code
            </label>
            <input
              type="text"
              placeholder="e.g. PR9K2L"
              maxLength={6}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full text-center tracking-[0.3em] font-mono text-2xl font-black py-4 rounded-2xl bg-table-card border border-table-border text-gold-300 focus:outline-none focus:border-gold-400 shadow-inner"
            />
            <p className="text-[11px] text-stone-400 text-center mt-2">
              Ask the room host for their 6-character code or click the direct invite link.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || joinCode.trim().length < 4}
            className="gold-gradient-btn w-full py-3.5 rounded-2xl text-sm font-bold shadow-gold-glow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            <span>{loading ? 'Joining Room...' : 'Enter Table Lobby'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
